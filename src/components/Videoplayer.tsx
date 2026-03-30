import {
  MaximizeIcon,
  MinimizeIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume2Icon,
  VolumeOffIcon,
} from 'lucide-react'
import React, { useEffect, useState, useRef, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

import {
  Projector,
  buildProjector,
  projectGazeSample,
} from '@/lib/gaze-projection'

interface CircleConfig {
  stroke: number
  radius: number
  color: string
}

interface VideoPlayerProps {
  gazeDataFile: File
  videoRef: React.RefObject<HTMLVideoElement | null>
  videoFile: File
  xrConfigFile: File
  circleConfig: CircleConfig
  gazeStartMs: number
  onFrameDurationChange?: (frameDurationSeconds: number) => void
}

interface GazeDataPoint {
  sectionId: string
  recordingId: string
  timestampNs: number
  gazeX: number
  gazeY: number
  worn: string
  fixationId: number | null
  blinkId: number | null
  azimuthDeg: number
  elevationDeg: number
}

interface OverlayRenderState {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  video: HTMLVideoElement
}

interface OverlayLayer {
  id: string
  label: string
  draw: (state: OverlayRenderState) => void
}

const defaultCircleConfig: CircleConfig = {
  stroke: 2,
  radius: 5,
  color: '#FF0000', // Default color
}

const DEFAULT_FRAME_DURATION_SECONDS = 1 / 30

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00.000'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  gazeDataFile,
  videoRef,
  videoFile,
  xrConfigFile,
  circleConfig = defaultCircleConfig,
  gazeStartMs,
  onFrameDurationChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layerCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({})
  const gazeDataRef = useRef<Array<GazeDataPoint>>([])
  const gazeStartRef = useRef<number | null>(null)
  const gazeProjectorRef = useRef<Projector | null>(null)
  const gazeIndexRef = useRef(0)
  const circleConfigRef = useRef(circleConfig)
  const enabledLayersRef = useRef<Record<string, boolean>>({ gaze: true })
  const drawFrameRef = useRef<(() => void) | null>(null)
  const gazeStartMsRef = useRef(gazeStartMs)
  const frameDurationRef = useRef(DEFAULT_FRAME_DURATION_SECONDS)
  const previousFrameTimeRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [enabledLayers, setEnabledLayers] = useState<Record<string, boolean>>({
    gaze: true,
  })
  const lastVolumeRef = useRef(1)

  // Draw Layers
  // A stable registry — lives outside the component or as a stable ref
  const layerRegistryRef = useRef<Map<string, OverlayLayer>>(new Map())

  // Register a layer once (or update it) — call this wherever you define layers
  const registerLayer = useCallback((layer: OverlayLayer) => {
    layerRegistryRef.current.set(layer.id, layer)
  }, [])

  const unregisterLayer = useCallback((id: string) => {
    layerRegistryRef.current.delete(id)
  }, [])

  const setLayerCanvasRef =
    (layerId: string) => (element: HTMLCanvasElement | null) => {
      layerCanvasRefs.current[layerId] = element
      if (layerId === 'gaze') {
        canvasRef.current = element
      }
    }

  // Gaze layer — registered once, reads refs on every draw call
  useEffect(() => {
    registerLayer({
      id: 'gaze',
      label: 'Gaze',
      draw: ({ canvas, context, video }) => {
        const gazeData = gazeDataRef.current
        const gazeStart = gazeStartRef.current

        const drawNoGaze = (message?: string | undefined) => {
          const padding = 10
          const text = message || 'No gaze yet'
          context.save()
          context.font = '12px system-ui, -apple-system, Segoe UI, sans-serif'
          const metrics = context.measureText(text)
          const textWidth = metrics.width
          const textHeight = 12
          const boxWidth = textWidth + padding * 2
          const boxHeight = textHeight + padding
          const x = canvas.width - boxWidth - 8
          const y = 8
          context.fillStyle = 'rgba(0, 0, 0, 0.4)'
          context.fillRect(x, y, boxWidth, boxHeight)
          context.fillStyle = 'rgba(255, 255, 255, 0.85)'
          context.fillText(text, x + padding, y + padding + textHeight / 2)
          context.restore()
        }

        if (!gazeData.length || gazeStart === null) {
          context.clearRect(0, 0, canvas.width, canvas.height)
          drawNoGaze()
          return
        }

        const offsetSeconds = gazeStartMsRef.current / 1000
        if (video.currentTime < offsetSeconds) {
          context.clearRect(0, 0, canvas.width, canvas.height)
          drawNoGaze()
          return
        }

        const videoTimeNs =
          gazeStart + (video.currentTime - offsetSeconds) * 1_000_000_000
        let i = gazeIndexRef.current
        while (
          i + 1 < gazeData.length &&
          gazeData[i + 1].timestampNs <= videoTimeNs
        ) {
          i += 1
        }
        while (i > 0 && gazeData[i].timestampNs > videoTimeNs) {
          i -= 1
        }
        gazeIndexRef.current = i

        if (gazeProjectorRef.current === null) {
          context.clearRect(0, 0, canvas.width, canvas.height)
          drawNoGaze('Gaze projector not ready')
          return
        }

        // Gaze Data Point Handling
        // TODO: insert projection in this section - currently using raw gazeX/gazeY for visualization, but should project azimuth/elevation to video frame coordinates using gazeProjectorRef and projectGazeSample()
        const point = gazeData[i]
        // const { width, height } = gazeSourceSizeRef.current;
        // const scaleX = width > 0 ? canvas.width / width : 1;
        // const scaleY = height > 0 ? canvas.height / height : 1;
        // const scaledX = point.gazeX * scaleX;
        // const scaledY = point.gazeY * scaleY;
        const projectedPoint = projectGazeSample(
          gazeProjectorRef.current!,
          point.azimuthDeg,
          point.elevationDeg,
        )

        console.log(
          'Drawing gaze point for video time',
          video.currentTime,
          's:',
          {
            rawGazeX: point.gazeX,
            rawGazeY: point.gazeY,
            azimuthDeg: point.azimuthDeg,
            elevationDeg: point.elevationDeg,
            projectedX: projectedPoint.x,
            projectedY: projectedPoint.y,
          },
        )
        const circleConfig = circleConfigRef.current

        if (
          !projectedPoint.valid ||
          projectedPoint.x === null ||
          projectedPoint.y === null
        ) {
          context.clearRect(0, 0, canvas.width, canvas.height)
          drawNoGaze('Invalid projected gaze point')
          return
        }

        // Drawing the Gaze circle around the point
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.beginPath()
        context.arc(
          projectedPoint.x,
          projectedPoint.y,
          circleConfig.radius,
          0,
          2 * Math.PI,
        )
        context.strokeStyle = circleConfig.color
        context.lineWidth = circleConfig.stroke
        context.stroke()
      },
    })
    return () => unregisterLayer('gaze')
  }, [registerLayer, unregisterLayer]) // stable deps — runs once

  // On Gaze Circle Config Change: update ref and redraw
  useEffect(() => {
    circleConfigRef.current = circleConfig
    drawFrameRef.current?.()
  }, [circleConfig])

  // On Gaze Data or Start Time Change: reset gaze index and redraw
  useEffect(() => {
    gazeStartMsRef.current = gazeStartMs
    gazeIndexRef.current = 0
    drawFrameRef.current?.()
  }, [gazeStartMs])

  // On Gaze Data File Change: load and parse new gaze data
  useEffect(() => {
    const loadGazeData = async () => {
      const text = await gazeDataFile.text()
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      if (lines.length < 2) return

      // Parse header to build a column index map
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      const col = (name: string) => headers.indexOf(name)

      const idxTimestamp = col('timestamp [ns]')
      const idxGazeX = col('gaze x [px]')
      const idxGazeY = col('gaze y [px]')
      const idxWorn = col('worn')
      const idxFixation = col('fixation id')
      const idxBlink = col('blink id')
      const idxAzimuth = col('azimuth [deg]')
      const idxElevation = col('elevation [deg]')
      const idxSectionId = col('section id')
      const idxRecording = col('recording id')

      // Warn if critical columns are missing
      if (idxTimestamp === -1 || idxAzimuth === -1 || idxElevation === -1) {
        console.error(
          'gaze.csv missing required columns. Found headers:',
          headers,
        )
        return
      }

      const parseOptionalNumber = (value: string) => {
        if (!value) return null
        const n = Number(value)
        return Number.isFinite(n) ? n : null
      }

      const gazeData = lines
        .slice(1)
        .map((line) => {
          const cols = line.split(',').map((c) => c.trim())

          const timestampNs = Number(cols[idxTimestamp])
          const gazeX = Number(cols[idxGazeX])
          const gazeY = Number(cols[idxGazeY])
          const azimuthDeg = Number(cols[idxAzimuth])
          const elevationDeg = Number(cols[idxElevation])

          if (
            !Number.isFinite(timestampNs) ||
            !Number.isFinite(azimuthDeg) ||
            !Number.isFinite(elevationDeg)
          )
            return null

          return {
            sectionId: cols[idxSectionId] ?? '',
            recordingId: cols[idxRecording] ?? '',
            timestampNs,
            gazeX,
            gazeY,
            worn: cols[idxWorn] ?? '1',
            fixationId: parseOptionalNumber(cols[idxFixation]),
            blinkId: parseOptionalNumber(cols[idxBlink]),
            azimuthDeg,
            elevationDeg,
          }
        })
        .filter((p): p is GazeDataPoint => p !== null)

      gazeData.sort((a, b) => a.timestampNs - b.timestampNs)
      gazeDataRef.current = gazeData
      gazeStartRef.current = gazeData[0]?.timestampNs ?? null
      gazeIndexRef.current = 0
      drawFrameRef.current?.()
    }

    void loadGazeData()
  }, [gazeDataFile])

  // On Video File Change: reset video src and redraw
  useEffect(() => {
    const url = URL.createObjectURL(videoFile)
    if (videoRef.current) {
      videoRef.current.src = url
    }
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [videoFile])

  // // On Gaze Setup Change: rebuild projector with new config and redraw
  // useEffect(() => {
  //   const video = videoRef.current;
  //   if (!video) return;

  //   // Build Gaze Projector
  //   gazeProjectorRef.current = null;

  //   const loadConfig = async () => {
  //     try {
  //       const videoParams : VideoParams = {
  //         videoWidth: video.videoWidth || 1600,
  //         videoHeight: video.videoHeight || 1200,
  //         fovHorizontalDeg: 90, // Assuming a default FOV; ideally this should come from the config or be user-specified
  //       };

  //       const text = await xrConfigFile.text();
  //       const config = JSON.parse(text);
  //       const projector = buildProjector(config, videoParams);
  //       gazeProjectorRef.current = projector;

  //       console.log('Gaze projector built with config:', config, 'and video params:', videoParams);

  //     } catch (error) {
  //       console.error('Failed to load or parse XR config file:', error);
  //     }
  //   };

  //   loadConfig();
  // }, [xrConfigFile]);

  // On XR Config Change: rebuild projector with new config and redraw (also depends on video metadata for dimensions)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    gazeProjectorRef.current = null

    const buildFromVideo = async () => {
      if (!video.videoWidth || !video.videoHeight) return // guard: metadata not ready

      try {
        const text = await xrConfigFile.text()
        const config = JSON.parse(text)

        const projector = buildProjector(config, {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          fovHorizontalDeg: 90,
        })
        gazeProjectorRef.current = projector
        drawFrameRef.current?.()
      } catch (e) {
        console.error('Failed to build projector:', e)
      }
    }

    // If metadata already loaded (e.g. file was already set), build immediately
    if (video.videoWidth && video.videoHeight) {
      void buildFromVideo()
    }

    // Otherwise wait for it
    video.addEventListener('loadedmetadata', buildFromVideo)
    return () => video.removeEventListener('loadedmetadata', buildFromVideo)
  }, [xrConfigFile]) // only xrConfigFile — video dimensions come from the event

  // On Enabled Layers Change: redraw with new layer visibility
  useEffect(() => {
    enabledLayersRef.current = enabledLayers
    drawFrameRef.current?.()
  }, [enabledLayers])

  // Component Initialization: handle fullscreen change events to update state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Main Video Event Loop: handle play/pause, time updates, seeking, volume changes, and frame rendering
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let rafId: number | null = null
    let frameCallbackId: number | null = null

    const syncCanvasSize = () => {
      if (!video.videoWidth || !video.videoHeight) {
        return
      }

      for (const { id } of layerRegistryRef.current.values()) {
        const canvas = layerCanvasRefs.current[id]
        if (!canvas) continue

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
    }

    const drawFrame = () => {
      setCurrentTime(video.currentTime)
      setDuration(Number.isFinite(video.duration) ? video.duration : 0)

      for (const [id, layer] of layerRegistryRef.current) {
        const canvas = layerCanvasRefs.current[id]
        const context = canvas?.getContext('2d')

        if (!canvas || !context) continue

        context.clearRect(0, 0, canvas.width, canvas.height)
        if (!enabledLayersRef.current[id]) continue

        layer.draw({ canvas, context, video })
      }
    }
    drawFrameRef.current = drawFrame

    const loop = () => {
      drawFrame()
      rafId = requestAnimationFrame(loop)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      if (rafId === null) {
        rafId = requestAnimationFrame(loop)
      }
    }

    const handlePause = () => {
      setIsPlaying(false)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      drawFrame()
    }

    const handleSeeked = () => {
      gazeIndexRef.current = 0
      drawFrame()
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      drawFrame()
    }

    const handleLoadedMetadata = () => {
      syncCanvasSize()
      setDuration(Number.isFinite(video.duration) ? video.duration : 0)
      drawFrame()
    }

    const handleDurationChange = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0)
    }

    const handleVolumeChange = () => {
      setIsMuted(video.muted)
      setVolume(video.volume)
      if (video.volume > 0) {
        lastVolumeRef.current = video.volume
      }
    }

    const scheduleFrameProbe = () => {
      if (typeof video.requestVideoFrameCallback !== 'function') {
        return
      }

      frameCallbackId = video.requestVideoFrameCallback((_, metadata) => {
        const previousFrameTime = previousFrameTimeRef.current
        if (
          previousFrameTime !== null &&
          metadata.mediaTime > previousFrameTime
        ) {
          frameDurationRef.current = metadata.mediaTime - previousFrameTime
          onFrameDurationChange?.(frameDurationRef.current)
        }
        previousFrameTimeRef.current = metadata.mediaTime
        scheduleFrameProbe()
      })
    }

    video.addEventListener('loadedmetadata', syncCanvasSize)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handlePause)
    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('volumechange', handleVolumeChange)

    syncCanvasSize()
    drawFrame()
    handleVolumeChange()
    scheduleFrameProbe()

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      if (
        frameCallbackId !== null &&
        typeof video.cancelVideoFrameCallback === 'function'
      ) {
        video.cancelVideoFrameCallback(frameCallbackId)
      }
      video.removeEventListener('loadedmetadata', syncCanvasSize)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handlePause)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [onFrameDurationChange, videoRef])

  const togglePlayback = async () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      await video.play()
      return
    }

    video.pause()
  }

  const seekToTime = (nextTime: number) => {
    const video = videoRef.current
    if (!video) return

    const boundedTime = clamp(
      nextTime,
      0,
      Number.isFinite(video.duration) ? video.duration : nextTime,
    )

    video.currentTime = boundedTime
    setCurrentTime(boundedTime)
    drawFrameRef.current?.()
  }

  const stepFrame = (direction: 1 | -1) => {
    const video = videoRef.current
    if (!video) return

    video.pause()
    const frameDuration =
      frameDurationRef.current > 0
        ? frameDurationRef.current
        : DEFAULT_FRAME_DURATION_SECONDS
    seekToTime(video.currentTime + direction * frameDuration)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (video.muted || video.volume === 0) {
      const nextVolume = lastVolumeRef.current > 0 ? lastVolumeRef.current : 1
      video.muted = false
      video.volume = nextVolume
      setIsMuted(false)
      setVolume(nextVolume)
      return
    }

    if (video.volume > 0) {
      lastVolumeRef.current = video.volume
    }
    video.muted = true
    setIsMuted(true)
  }

  const updateVolume = (nextVolume: number) => {
    const video = videoRef.current
    if (!video) return

    const boundedVolume = clamp(nextVolume, 0, 1)
    video.volume = boundedVolume
    video.muted = boundedVolume === 0
    setVolume(boundedVolume)
    setIsMuted(boundedVolume === 0)
    if (boundedVolume > 0) {
      lastVolumeRef.current = boundedVolume
    }
  }

  const toggleLayer = (layerId: string) => {
    setEnabledLayers((currentLayers) => ({
      ...currentLayers,
      [layerId]: !currentLayers[layerId],
    }))
  }

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement === container) {
      await document.exitFullscreen()
      return
    }

    await container.requestFullscreen()
  }

  return (
    /* Video Player Including Controls */
    <div className="flex w-full max-w-5xl flex-col gap-3">
      {/* Video and Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-fit self-center overflow-hidden rounded-lg bg-black shadow-sm"
      >
        <video
          ref={videoRef}
          className="block w-full max-h-[70vh] fullscreen:max-h-screen"
          playsInline
        />
        {Array.from(layerRegistryRef.current.values()).map((layer) => (
          <canvas
            key={layer.id}
            ref={setLayerCanvasRef(layer.id)}
            width={640}
            height={640}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        ))}
      </div>

      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={() => void togglePlayback()}
            size="sm"
            className="w-20"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            onClick={() => stepFrame(-1)}
            size="sm"
            variant="outline"
            title="Step backward one frame"
          >
            <SkipBackIcon />
            Frame
          </Button>
          <Button
            onClick={() => stepFrame(1)}
            size="sm"
            variant="outline"
            title="Step forward one frame"
          >
            <SkipForwardIcon />
            Frame
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleMute}
              size="sm"
              variant="outline"
              title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeOffIcon /> : <Volume2Icon />}
            </Button>
            <div className="w-28">
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[isMuted ? 0 : volume]}
                onValueChange={(values) => {
                  const [nextVolume = 0] = values
                  updateVolume(nextVolume)
                }}
                aria-label="Volume"
              />
            </div>
          </div>
          <Button
            onClick={() => void toggleFullscreen()}
            size="sm"
            variant="outline"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
            {isFullscreen ? 'Window' : 'Fullscreen'}
          </Button>
          <div className="ml-auto text-sm tabular-nums text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="mb-3">
          <Slider
            min={0}
            max={duration || 0.001}
            step={0.001}
            value={[Math.min(currentTime, duration || 0)]}
            onValueChange={(values) => {
              const [nextTime = 0] = values
              seekToTime(nextTime)
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Layers
          </span>
          {Array.from(layerRegistryRef.current.values()).map((layer) => (
            <Button
              key={layer.id}
              size="sm"
              variant={enabledLayers[layer.id] ? 'default' : 'outline'}
              onClick={() => toggleLayer(layer.id)}
            >
              {layer.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer
