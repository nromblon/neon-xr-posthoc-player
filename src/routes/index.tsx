import { Label } from '@radix-ui/react-label'
import { createFileRoute } from '@tanstack/react-router'
import React, { useRef } from 'react'
import Color from 'color'
import { BookXIcon, SkipBackIcon, SkipForwardIcon } from 'lucide-react'
import { Toast } from 'radix-ui'
import { FolderPicker } from '@/components/ui/folder-picker'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from '@/components/ui/shadcn-io/color-picker'
import { SliderNumberInput } from '@/components/ui/slider-number-input'
import VideoPlayer from '@/components/Videoplayer'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import { useEventStore } from '@/store/eventStore'

export const Route = createFileRoute('/')({ component: App })

const DEFAULT_FRAME_DURATION_MS = 1000 / 30

function App() {
  const [radius, setRadius] = React.useState(14)
  const [stroke, setStroke] = React.useState(5)
  const [color, setColor] = React.useState('#000000AB')

  const folderPickerRef = useRef<HTMLInputElement | null>(null)
  const [folderPickerKey, setFolderPickerKey] = React.useState(0)

  // File-related states
  // Gaze Data
  const [gazeFile, setGazeFile] = React.useState<File | null>(null)
  const [eventsFile, setEventsFile] = React.useState<File | null>(null)
  const [shouldShowGazeError, showGazeError] = React.useState(false)
  // Scene Video Data
  const [videoFile, setVideoFile] = React.useState<File | null>(null)
  // Calibration Config Data
  const [configFile, setConfigFile] = React.useState<File | null>(null)
  // Horizontal FOV for projection calculations
  const [fovHorizontalDeg, setFovHorizontalDeg] = React.useState(82)

  const videoRef = useRef<HTMLVideoElement>(null)
  const clearEvents = useEventStore((state) => state.removeEvents)
  const gazeStartMs = useEventStore((state) => state.gazeStartTime)
  const setGazeStartTimeInStore = useEventStore((state) => state.setGazeStartTime)

  // Align-related state
  const [frameDurationMs, setFrameDurationMs] = React.useState<number>(
    DEFAULT_FRAME_DURATION_MS,
  )

  const findGazeFile = (file: FileList) => {
    for (let i = 0; i < file.length; i++) {
      const f = file.item(i)
      if (f && f.name.endsWith('gaze.csv')) {
        return f
      }
    }
    return null
  }

  const findEventsFile = (file: FileList) => {
    for (let i = 0; i < file.length; i++) {
      const f = file.item(i)
      if (f && f.name.endsWith('events.csv')) {
        return f
      }
    }
    return null
  }

  const updateGazeStartInputs = (totalMs: number) => {
    const boundedTotalMs = Math.max(0, Math.round(totalMs))
    const minutes = Math.floor(boundedTotalMs / 60000)
    const seconds = Math.floor((boundedTotalMs % 60000) / 1000)
    const milliseconds = boundedTotalMs % 1000

    const minInput = document.getElementById('m-gst') as HTMLInputElement | null
    const secInput = document.getElementById('s-gst') as HTMLInputElement | null
    const msInput = document.getElementById('ms-gst') as HTMLInputElement | null

    if (minInput) minInput.value = minutes.toString()
    if (secInput) secInput.value = seconds.toString().padStart(2, '0')
    if (msInput) msInput.value = milliseconds.toString().padStart(3, '0')
  }

  const setGazeStartTime = (nextGazeStartMs: number) => {
    const boundedGazeStartMs = Math.max(0, Math.round(nextGazeStartMs))
    updateGazeStartInputs(boundedGazeStartMs)
    setGazeStartTimeInStore(boundedGazeStartMs)
  }

  const setCurrentTimeAsGazeStart = () => {
    if (videoRef.current) {
      setGazeStartTime(videoRef.current.currentTime * 1000)
    }
  }

  const recomputeGazeStartMs = () => {
    const minInput = document.getElementById('m-gst') as HTMLInputElement
    const secInput = document.getElementById('s-gst') as HTMLInputElement
    const msInput = document.getElementById('ms-gst') as HTMLInputElement
    const minutes = parseInt(minInput.value) || 0
    const seconds = parseInt(secInput.value) || 0
    const milliseconds = parseInt(msInput.value) || 0
    const totalMs = minutes * 60 * 1000 + seconds * 1000 + milliseconds
    setGazeStartTime(totalMs)
  }

  const shiftGazeStartByFrame = (direction: 1 | -1) => {
    setGazeStartTime(gazeStartMs + direction * frameDurationMs)
  }

  return (
    <div className="display flex justify-between items-start my-4">
      <div
        id="video-div"
        className="flex items-center justify-center h-full flex-1"
      >
        {gazeFile && videoFile && configFile ? (
          <VideoPlayer
            videoRef={videoRef}
            gazeDataFile={gazeFile}
            eventsFile={eventsFile}
            videoFile={videoFile}
            xrConfigFile={configFile}
            fovHorizontalDeg={fovHorizontalDeg}
            circleConfig={{ stroke, radius, color }}
            onFrameDurationChange={(frameDurationSeconds) => {
              if (frameDurationSeconds > 0) {
                setFrameDurationMs(frameDurationSeconds * 1000)
              }
            }}
          />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookXIcon />
              </EmptyMedia>
              <EmptyTitle>No data</EmptyTitle>
              <EmptyDescription>
                Choose XR Video and Gaze Data Folder
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
      <div
        id="settings-div"
        className="display flex flex-col align-top gap-2 p-5 mx-5 border h-max w-96 rounded-lg"
      >
        <Label className="text-md font-bold mb-2"> Setup </Label>
        <Label className="text-sm" htmlFor="xr-file-upload">
          {' '}
          XR Video (Scene Video){' '}
        </Label>
        <Input
          id="xr-file-upload"
          type="file"
          className="text-muted-foreground"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setVideoFile(file)
            }
          }}
        />
        <Label className="text-sm" htmlFor="neon-gaze-upload">
          {' '}
          Neon Gaze Data{' '}
        </Label>
        <FolderPicker
          key={folderPickerKey}
          inputRef={folderPickerRef}
          onPick={(f) => {
            console.log(f)
            clearEvents()
            const gf = findGazeFile(f)
            const ef = findEventsFile(f)
            if (gf) {
              setGazeFile(gf)
            }
            setEventsFile(ef)

            console.log(gf)
            if (!gf || f.length === 0) {
              setGazeFile(null)
              setEventsFile(null)
              showGazeError(true)
              setFolderPickerKey((k) => k + 1)
              if (folderPickerRef.current) {
                folderPickerRef.current.value = ''
              }
              // alert('Unable to find valid gaze data file. Please select a folder containing "gaze.csv".')
              // console.log('missing gaze file')
            }
          }}
        />
        <Toast.Root
          className="flex flex-col gap-2 ToastRoot bg-destructive shadow-sm w-80 items-start justify-center rounded-lg p-4"
          open={shouldShowGazeError}
          duration={3000}
          onOpenChange={showGazeError}
        >
          <Toast.Title className="font-medium text-neutral-50 text-md">
            Gaze Data Selection Error
          </Toast.Title>
          <Toast.Description className="wrap-normal text-neutral-50 text-sm">
            Unable to find valid gaze data file. {'\n'} Please select a folder
            containing 'gaze.csv'.
          </Toast.Description>
        </Toast.Root>

        <Label className="text-sm" htmlFor="calibration-file-upload">
          {' '}
          Neon XR Calibration File (config.json){' '}
        </Label>
        <Input
          id="calibration-file-upload"
          type="file"
          className="text-muted-foreground"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setConfigFile(file)
            }
          }}
        />

        <Label className="text-sm" htmlFor="recording-fov">
          {' '}
          Horizontal FOV{' '}
        </Label>
        <SliderNumberInput
          id="recording-fov"
          value={fovHorizontalDeg}
          onValueChange={setFovHorizontalDeg}
          min={45}
          max={120}
        />

        <Separator className="mt-4 mb-2" />
        <Label className="text-md font-bold mb-2"> Align </Label>
        <Button
          onClick={setCurrentTimeAsGazeStart}
          disabled={!videoFile || !gazeFile || !configFile}
        >
          Set Current Time as Gaze Start Time
        </Button>
        <Label className="text-sm" htmlFor="gaze-start-time">
          {' '}
          Gaze Start Time{' '}
        </Label>
        <div id="gaze-start-time" className="flex flex-row items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Press when gaze is behind by one frame"
            onClick={() => shiftGazeStartByFrame(-1)}
            disabled={!videoFile || !gazeFile || !configFile}
          >
            <SkipBackIcon />
          </Button>
          <Input
            id="m-gst"
            type="number"
            placeholder="min"
            disabled={!videoFile || !gazeFile}
            min={0}
            max={9999}
            onChange={recomputeGazeStartMs}
            className="w-18"
          />
          :
          <Input
            id="s-gst"
            type="number"
            placeholder="sec"
            disabled={!videoFile || !gazeFile || !configFile}
            min={0}
            max={59}
            onChange={recomputeGazeStartMs}
            className="w-16"
          />
          :
          <Input
            id="ms-gst"
            type="number"
            placeholder="ms"
            disabled={!videoFile || !gazeFile || !configFile}
            min={0}
            max={999}
            onChange={recomputeGazeStartMs}
            className="w-17"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Press when gaze is ahead by one frame"
            onClick={() => shiftGazeStartByFrame(1)}
            disabled={!videoFile || !gazeFile || !configFile}
          >
            <SkipForwardIcon />
          </Button>
        </div>
        <Separator className="mt-4 mb-2" />
        <Label className="text-md font-bold mb-2">
          {' '}
          Gaze Visualizer Style{' '}
        </Label>
        <Label className="text-sm" htmlFor="gaze-radius">
          {' '}
          Radius{' '}
        </Label>
        <SliderNumberInput
          id="gaze-radius"
          value={radius}
          onValueChange={setRadius}
          min={1}
          max={100}
        />
        <Label className="text-sm" htmlFor="gaze-stroke">
          {' '}
          Stroke Width{' '}
        </Label>
        <SliderNumberInput
          id="gaze-stroke"
          value={stroke}
          onValueChange={setStroke}
          min={1}
          max={100}
        />
        <Label className="text-sm" htmlFor="gaze-color">
          {' '}
          Color{' '}
        </Label>
        <ColorPicker
          id="gaze-color"
          defaultValue={color}
          color={color}
          onChange={(v) => {
            const c = Color(v)
            setColor(c.hexa())
          }}
          className="max-w-sm h-70 rounded-md border bg-background p-4 shadow-sm"
        >
          <ColorPickerSelection />
          <div className="flex items-center gap-4">
            <ColorPickerEyeDropper />
            <div className="grid w-full gap-1">
              <ColorPickerHue />
              <ColorPickerAlpha />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ColorPickerOutput />
            <ColorPickerFormat />
          </div>
        </ColorPicker>
      </div>
    </div>
  )
}
