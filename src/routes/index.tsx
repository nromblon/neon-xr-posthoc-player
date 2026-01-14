import { Label } from '@radix-ui/react-label'
import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
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

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [radius, setRadius] = React.useState(33)
  const [stroke, setStroke] = React.useState(33)
  const [color, setColor] = React.useState('#000000ff')
  const [gazeDataFolder, setGazeDataFolder] = React.useState<string | null>(null)
  const [gazeFile, setGazeFile] = React.useState<File | null>(null)
  const [videoFile, setVideoFile] = React.useState<File | null>(null)

  return (
    <div className="display flex justify-between items-center h-[calc(100vh-2rem)] my-4">
      <div
        id="video-div"
        className="flex items-center justify-center h-full flex-1"
      >
        {gazeFile && videoFile ? (
          <VideoPlayer gazeDataFile={gazeFile} videoFile={videoFile} circleConfig={{ stroke, radius, color }} />
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
        className="display flex flex-col gap-2 p-5 mx-5 border h-full w-96 rounded-lg"
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
        />
        <Label className="text-sm" htmlFor="neon-gaze-upload">
          {' '}
          Neon Gaze Data{' '}
        </Label>
        <FolderPicker
          onPick={(f) => {
            console.log(f)
          }}
        />
        <Separator className="mt-4 mb-2" />
        <Label className="text-md font-bold mb-2"> Align </Label>
        <Label className="text-sm" htmlFor="gaze-start-time">
          {' '}
          Gaze Start Time{' '}
        </Label>
        <div id="gaze-start-time" className="flex flex-row items-center gap-2">
          <Input
            id="m-gst"
            type="number"
            placeholder="min"
            min={0}
            max={9999}
            className="w-18"
          />
          :
          <Input
            id="s-gst"
            type="number"
            placeholder="sec"
            min={0}
            max={59}
            className="w-16"
          />
          :
          <Input
            id="ms-gst"
            type="number"
            placeholder="ms"
            min={0}
            max={999}
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
          onChange={(v) => {
            const c = Color(v)
            console.log(c.hexa())
            setColor(c.hexa())
            // setColor([v[0], v[1], v[2], v[3]]);
          }}
          className="max-w-sm rounded-md border bg-background p-4 shadow-sm"
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