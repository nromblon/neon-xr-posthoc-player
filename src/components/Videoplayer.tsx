import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume2Icon,
  VolumeOffIcon,
} from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface CircleConfig {
  stroke: number;
  radius: number;
  color: string;
}

interface VideoPlayerProps {
  gazeDataFile: File;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoFile: File;
  circleConfig: CircleConfig;
  gazeStartMs: number;
  onFrameDurationChange?: (frameDurationSeconds: number) => void;
}

interface GazeDataPoint {
  sectionId: string;
  recordingId: string;
  timestampNs: number;
  gazeX: number;
  gazeY: number;
  worn: string;
  fixationId: number | null;
  blinkId: number | null;
  azimuthDeg: number;
  elevationDeg: number;
}

interface OverlayRenderState {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  video: HTMLVideoElement;
}

interface OverlayLayer {
  id: string;
  label: string;
  draw: (state: OverlayRenderState) => void;
}

const defaultCircleConfig: CircleConfig = {
  stroke: 2,
  radius: 5,
  color: '#FF0000', // Default color
};

const DEFAULT_FRAME_DURATION_SECONDS = 1 / 30;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00.000';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  gazeDataFile,
  videoRef,
  videoFile,
  circleConfig = defaultCircleConfig,
  gazeStartMs,
  onFrameDurationChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const gazeDataRef = useRef<Array<GazeDataPoint>>([]);
  const gazeStartRef = useRef<number | null>(null);
  const gazeIndexRef = useRef(0);
  const gazeSourceSizeRef = useRef({ width: 1600, height: 1200 });
  const circleConfigRef = useRef(circleConfig);
  const enabledLayersRef = useRef<Record<string, boolean>>({ gaze: true });
  const drawFrameRef = useRef<(() => void) | null>(null);
  const gazeStartMsRef = useRef(gazeStartMs);
  const frameDurationRef = useRef(DEFAULT_FRAME_DURATION_SECONDS);
  const previousFrameTimeRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [enabledLayers, setEnabledLayers] = useState<Record<string, boolean>>({
    gaze: true,
  });
  const lastVolumeRef = useRef(1);

  const overlayLayers: Array<OverlayLayer> = [
    {
      id: 'gaze',
      label: 'Gaze',
      draw: ({ canvas, context, video }) => {
        const gazeData = gazeDataRef.current;
        const gazeStart = gazeStartRef.current;

        const drawNoGaze = () => {
          const padding = 10;
          const text = 'No gaze yet';
          context.save();
          context.font = '12px system-ui, -apple-system, Segoe UI, sans-serif';
          const metrics = context.measureText(text);
          const textWidth = metrics.width;
          const textHeight = 12;
          const boxWidth = textWidth + padding * 2;
          const boxHeight = textHeight + padding;
          const x = canvas.width - boxWidth - 8;
          const y = 8;
          context.fillStyle = 'rgba(0, 0, 0, 0.4)';
          context.fillRect(x, y, boxWidth, boxHeight);
          context.fillStyle = 'rgba(255, 255, 255, 0.85)';
          context.fillText(text, x + padding, y + padding + textHeight / 2);
          context.restore();
        };

        if (!gazeData.length || gazeStart === null) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          drawNoGaze();
          return;
        }

        const offsetSeconds = gazeStartMsRef.current / 1000;
        if (video.currentTime < offsetSeconds) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          drawNoGaze();
          return;
        }

        const videoTimeNs =
          gazeStart + (video.currentTime - offsetSeconds) * 1_000_000_000;
        let i = gazeIndexRef.current;
        while (
          i + 1 < gazeData.length &&
          gazeData[i + 1].timestampNs <= videoTimeNs
        ) {
          i += 1;
        }
        while (i > 0 && gazeData[i].timestampNs > videoTimeNs) {
          i -= 1;
        }
        gazeIndexRef.current = i;

        const point = gazeData[i];
        const { width, height } = gazeSourceSizeRef.current;
        const scaleX = width > 0 ? canvas.width / width : 1;
        const scaleY = height > 0 ? canvas.height / height : 1;
        const scaledX = point.gazeX * scaleX;
        const scaledY = point.gazeY * scaleY;
        const currentConfig = circleConfigRef.current;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.beginPath();
        context.arc(scaledX, scaledY, currentConfig.radius, 0, 2 * Math.PI);
        context.strokeStyle = currentConfig.color;
        context.lineWidth = currentConfig.stroke;
        context.stroke();
      },
    },
  ];

  const setLayerCanvasRef = (layerId: string) => (element: HTMLCanvasElement | null) => {
    layerCanvasRefs.current[layerId] = element;
    if (layerId === 'gaze') {
      canvasRef.current = element;
    }
  };

  useEffect(() => {
    circleConfigRef.current = circleConfig;
    drawFrameRef.current?.();
  }, [circleConfig]);

  useEffect(() => {
    gazeStartMsRef.current = gazeStartMs;
    gazeIndexRef.current = 0;
    drawFrameRef.current?.();
  }, [gazeStartMs]);

  useEffect(() => {
    const loadGazeData = async () => {
      const text = await gazeDataFile.text();
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const dataLines =
        lines[0]?.toLowerCase().includes('section id') ? lines.slice(1) : lines;
      const parseOptionalNumber = (value: string) => {
        if (value === '') return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const gazeData = dataLines
        .map((line) => {
          const cols = line.split(',').map((col) => col.trim());
          if (cols.length < 10) return null;
          const [
            sectionId,
            recordingId,
            timestampNs,
            gazeX,
            gazeY,
            worn,
            fixationId,
            blinkId,
            azimuthDeg,
            elevationDeg,
          ] = cols;
          const parsedTimestamp = Number(timestampNs);
          const parsedGazeX = Number(gazeX);
          const parsedGazeY = Number(gazeY);
          const parsedAzimuth = Number(azimuthDeg);
          const parsedElevation = Number(elevationDeg);
          if (
            !Number.isFinite(parsedTimestamp) ||
            !Number.isFinite(parsedGazeX) ||
            !Number.isFinite(parsedGazeY) ||
            !Number.isFinite(parsedAzimuth) ||
            !Number.isFinite(parsedElevation)
          ) {
            return null;
          }
          return {
            sectionId,
            recordingId,
            timestampNs: parsedTimestamp,
            gazeX: parsedGazeX,
            gazeY: parsedGazeY,
            worn,
            fixationId: parseOptionalNumber(fixationId),
            blinkId: parseOptionalNumber(blinkId),
            azimuthDeg: parsedAzimuth,
            elevationDeg: parsedElevation,
          };
        })
        .filter((point): point is GazeDataPoint => !!point);
      
      gazeData.sort((a, b) => a.timestampNs - b.timestampNs);
      gazeDataRef.current = gazeData;
      gazeStartRef.current = gazeData[0]?.timestampNs ?? null;
      gazeIndexRef.current = 0;
      gazeSourceSizeRef.current = { width: 1600, height: 1200 };
      drawFrameRef.current?.();
    };

    loadGazeData();
  }, [gazeDataFile]);

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    if (videoRef.current) {
      videoRef.current.src = url;
    }
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  useEffect(() => {
    enabledLayersRef.current = enabledLayers;
    drawFrameRef.current?.();
  }, [enabledLayers]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId: number | null = null;
    let frameCallbackId: number | null = null;

    const syncCanvasSize = () => {
      if (!video.videoWidth || !video.videoHeight) {
        return;
      }

      for (const { id } of overlayLayers) {
        const canvas = layerCanvasRefs.current[id];
        if (!canvas) continue;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };

    const drawFrame = () => {
      setCurrentTime(video.currentTime);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);

      for (const layer of overlayLayers) {
        const canvas = layerCanvasRefs.current[layer.id];
        const context = canvas?.getContext('2d');

        if (!canvas || !context) continue;

        context.clearRect(0, 0, canvas.width, canvas.height);
        if (!enabledLayersRef.current[layer.id]) {
          continue;
        }

        layer.draw({ canvas, context, video });
      }
    };
    drawFrameRef.current = drawFrame;

    const loop = () => {
      drawFrame();
      rafId = requestAnimationFrame(loop);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (rafId === null) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      drawFrame();
    };

    const handleSeeked = () => {
      gazeIndexRef.current = 0;
      drawFrame();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      drawFrame();
    };

    const handleLoadedMetadata = () => {
      syncCanvasSize();
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      drawFrame();
    };

    const handleDurationChange = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };

    const handleVolumeChange = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
      if (video.volume > 0) {
        lastVolumeRef.current = video.volume;
      }
    };

    const scheduleFrameProbe = () => {
      if (typeof video.requestVideoFrameCallback !== 'function') {
        return;
      }

      frameCallbackId = video.requestVideoFrameCallback((_, metadata) => {
        const previousFrameTime = previousFrameTimeRef.current;
        if (
          previousFrameTime !== null &&
          metadata.mediaTime > previousFrameTime
        ) {
          frameDurationRef.current = metadata.mediaTime - previousFrameTime;
          onFrameDurationChange?.(frameDurationRef.current);
        }
        previousFrameTimeRef.current = metadata.mediaTime;
        scheduleFrameProbe();
      });
    };

    video.addEventListener('loadedmetadata', syncCanvasSize);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);

    syncCanvasSize();
    drawFrame();
    handleVolumeChange();
    scheduleFrameProbe();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (
        frameCallbackId !== null &&
        typeof video.cancelVideoFrameCallback === 'function'
      ) {
        video.cancelVideoFrameCallback(frameCallbackId);
      }
      video.removeEventListener('loadedmetadata', syncCanvasSize);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [onFrameDurationChange, videoRef]);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play();
      return;
    }

    video.pause();
  };

  const seekToTime = (nextTime: number) => {
    const video = videoRef.current;
    if (!video) return;

    const boundedTime = clamp(
      nextTime,
      0,
      Number.isFinite(video.duration) ? video.duration : nextTime,
    );

    video.currentTime = boundedTime;
    setCurrentTime(boundedTime);
    drawFrameRef.current?.();
  };

  const stepFrame = (direction: 1 | -1) => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    const frameDuration =
      frameDurationRef.current > 0
        ? frameDurationRef.current
        : DEFAULT_FRAME_DURATION_SECONDS;
    seekToTime(video.currentTime + direction * frameDuration);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.muted || video.volume === 0) {
      const nextVolume = lastVolumeRef.current > 0 ? lastVolumeRef.current : 1;
      video.muted = false;
      video.volume = nextVolume;
      setIsMuted(false);
      setVolume(nextVolume);
      return;
    }

    if (video.volume > 0) {
      lastVolumeRef.current = video.volume;
    }
    video.muted = true;
    setIsMuted(true);
  };

  const updateVolume = (nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    const boundedVolume = clamp(nextVolume, 0, 1);
    video.volume = boundedVolume;
    video.muted = boundedVolume === 0;
    setVolume(boundedVolume);
    setIsMuted(boundedVolume === 0);
    if (boundedVolume > 0) {
      lastVolumeRef.current = boundedVolume;
    }
  };

  const toggleLayer = (layerId: string) => {
    setEnabledLayers((currentLayers) => ({
      ...currentLayers,
      [layerId]: !currentLayers[layerId],
    }));
  };

  return (
    /* Video Player Including Controls */
    <div className="flex w-full max-w-5xl flex-col gap-3">
      {/* Video and Canvas Container */}
      <div className="relative overflow-hidden rounded-lg w-fit bg-black shadow-sm self-center">
        <video
          ref={videoRef}
          className="block max-h-[70vh] w-full"
          playsInline
        />
        {overlayLayers.map((layer) => (
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
          <Button onClick={() => void togglePlayback()} size="sm" className='w-20'>
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
                  const [nextVolume = 0] = values;
                  updateVolume(nextVolume);
                }}
                aria-label="Volume"
              />
            </div>
          </div>
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
              const [nextTime = 0] = values;
              seekToTime(nextTime);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Layers
          </span>
          {overlayLayers.map((layer) => (
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
  );
};

export default VideoPlayer;
