import { Label } from '@radix-ui/react-label'
import { createFileRoute } from '@tanstack/react-router'
import React, { useRef } from 'react'
import Color from 'color'
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
import { Empty,  EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { BookXIcon } from 'lucide-react'
import { Toast } from 'radix-ui'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [radius, setRadius] = React.useState(14)
  const [stroke, setStroke] = React.useState(5)
  const [color, setColor] = React.useState('#000000AB')

  const folderPickerRef = useRef<HTMLInputElement | null>(null)
  const [folderPickerKey, setFolderPickerKey] = React.useState(0)

  // File-related states
  // Gaze Data
  const [gazeDataFileList, setGazeDataFileList] = React.useState<FileList | null>(null)
  const [gazeFile, setGazeFile] = React.useState<File | null>(null)
  const [shouldShowGazeError, showGazeError] = React.useState(false)
  // Scene Video Data
  const [videoFile, setVideoFile] = React.useState<File | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null);

  // Align-related state
  const [gazeStartMs, setGazeStartMs] = React.useState<number>(0);

  const findGazeFile = (file: FileList) => {
    for (let i = 0; i < file.length; i++) {
      const f = file.item(i)
      if (f && f.name.endsWith('gaze.csv')) {
        return f
      }
    }
    return null
  }

  const setCurrentTimeAsGazeStart = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime
      const minutes = Math.floor(currentTime / 60)
      const seconds = Math.floor(currentTime % 60)
      const milliseconds = Math.floor((currentTime * 1000) % 1000)

      const minInput = document.getElementById('m-gst') as HTMLInputElement
      const secInput = document.getElementById('s-gst') as HTMLInputElement
      const msInput = document.getElementById('ms-gst') as HTMLInputElement
      minInput.value = minutes.toString()
      secInput.value = seconds.toString()
      msInput.value = milliseconds.toString()

      setGazeStartMs(currentTime * 1000);
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
    setGazeStartMs(totalMs);
  }

  return (
    <div className="display flex justify-between items-center my-4">
      <div
        id="video-div"
        className="flex items-center justify-center h-full flex-1"
      >
        {gazeFile && videoFile ? (
          <VideoPlayer 
            videoRef={videoRef}
            gazeDataFile={gazeFile} 
            videoFile={videoFile} 
            circleConfig={{ stroke, radius, color }} 
          />
        ) : 
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookXIcon />
              </EmptyMedia>
              <EmptyTitle>No data</EmptyTitle>
              <EmptyDescription>Choose XR Video and Gaze Data Folder</EmptyDescription>
            </EmptyHeader>
          </Empty>
      }
      </div>
      <div
        id="settings-div"
        className="display flex flex-col gap-2 p-5 mx-5 border h-max w-96 rounded-lg"
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
              setVideoFile(file);
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
            setGazeDataFileList(f);
            const gf = findGazeFile(f);
            if (gf) {
              setGazeFile(gf);
            } 
            
            console.log(gf);
            if (!gf || f.length === 0) {
              setGazeFile(null);
              showGazeError(true);
              setFolderPickerKey((k) => k + 1)
              if (folderPickerRef.current) {
                folderPickerRef.current.value = '';
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
        <Separator className="mt-4 mb-2" />
        <Label className="text-md font-bold mb-2"> Align </Label>
        <Button onClick={setCurrentTimeAsGazeStart} disabled={!videoFile || !gazeFile}>
          Set Current Time as Gaze Start Time
        </Button>
        <Label className="text-sm" htmlFor="gaze-start-time">
          {' '}
          Gaze Start Time{' '}
        </Label>
        <div id="gaze-start-time" className="flex flex-row items-center gap-2">
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
            disabled={!videoFile || !gazeFile}
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
            disabled={!videoFile || !gazeFile}
            min={0}
            max={999}
            onChange={recomputeGazeStartMs}
            className="w-17"
          />
        </div>
        <Separator className="mt-4 mb-2" />
        <Label className="text-md font-bold mb-2">
          {' '}
          Gaze Visualizer Style{' '}
        </Label>
        <Label className="text-sm" htmlFor="xr-file-upload">
          {' '}
          Radius{' '}
        </Label>
        <SliderNumberInput
          value={radius}
          onValueChange={setRadius}
          min={1}
          max={100}
        />
        <Label className="text-sm" htmlFor="xr-file-upload">
          {' '}
          Stroke Width{' '}
        </Label>
        <SliderNumberInput
          value={stroke}
          onValueChange={setStroke}
          min={1}
          max={100}
        />
        <Label className="text-sm" htmlFor="xr-file-upload">
          {' '}
          Color{' '}
        </Label>
        <ColorPicker
          defaultValue={color}
          color={color}
          onChange={(v) => {
            const c = Color(v)
            console.log(c.hexa())
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
