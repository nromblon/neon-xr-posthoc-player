import { Label } from '@radix-ui/react-label'
import { createFileRoute } from '@tanstack/react-router'
import React, { useRef } from 'react'
import Color from 'color'
import { BookXIcon, SaveIcon, SkipBackIcon, SkipForwardIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { FolderPickEntry } from '@/components/ui/folder-picker'
import { FolderPicker } from '@/components/ui/folder-picker'
import { Input } from '@/components/ui/input'
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
import { useEventPersistence } from '@/hooks/use-event-persistence'
import {
  formatTruncatedDecimals,
  readConfigOffsets,
  saveModifiedConfigFile,
} from '@/lib/config-file'
import { useEventStore } from '@/store/eventStore'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export const Route = createFileRoute('/')({ component: App })

const DEFAULT_FRAME_DURATION_MS = 1000 / 30
const SCENE_VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'm4v',
  'avi',
  'mkv',
  'webm',
])

function App() {
  const [radius, setRadius] = React.useState(14)
  const [stroke, setStroke] = React.useState(5)
  const [color, setColor] = React.useState('#FF0000')

  const folderPickerRef = useRef<HTMLInputElement | null>(null)
  const [folderPickerKey, setFolderPickerKey] = React.useState(0)
  const packagePickerRef = useRef<HTMLInputElement | null>(null)
  const [packagePickerKey, setPackagePickerKey] = React.useState(0)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const configInputRef = useRef<HTMLInputElement | null>(null)
  const xTranslateOffsetRef = useRef<HTMLInputElement | null>(null)
  const yTranslateOffsetRef = useRef<HTMLInputElement | null>(null)
  const zTranslateOffsetRef = useRef<HTMLInputElement | null>(null)
  const xRotationOffsetRef = useRef<HTMLInputElement | null>(null)
  const yRotationOffsetRef = useRef<HTMLInputElement | null>(null)
  const zRotationOffsetRef = useRef<HTMLInputElement | null>(null)

  // File-related states
  // Gaze Data
  const [gazeFile, setGazeFile] = React.useState<File | null>(null)
  const [eventsFile, setEventsFile] = React.useState<File | null>(null)
  const [eventsDirectoryHandle, setEventsDirectoryHandle] =
    React.useState<FileSystemDirectoryHandle | null>(null)
  const [recordingDirectoryHandle, setRecordingDirectoryHandle] =
    React.useState<FileSystemDirectoryHandle | null>(null)
  const [selectedGazeFolderLabel, setSelectedGazeFolderLabel] =
    React.useState('')
  // Scene Video Data
  const [videoFile, setVideoFile] = React.useState<File | null>(null)
  // Calibration Config Data
  const [configFile, setConfigFile] = React.useState<File | null>(null)
  // Horizontal FOV for projection calculations
  const [fovHorizontalDeg, setFovHorizontalDeg] = React.useState(82)

  const videoRef = useRef<HTMLVideoElement>(null)
  const gazeStartMs = useEventStore((state) => state.gazeStartTime)
  const sensorOffsets = useEventStore((state) => state.sensorOffsets)
  const setGazeStartTimeInStore = useEventStore(
    (state) => state.setGazeStartTime,
  )
  const setRotationOffset = useEventStore((state) => state.setRotationOffset)
  const setSensorOffsets = useEventStore((state) => state.setSensorOffsets)
  const setTranslationOffset = useEventStore(
    (state) => state.setTranslationOffset,
  )
  const { isSaving: isSavingEvents } = useEventPersistence({
    eventsDirectoryHandle,
    eventsFile,
    gazeStartMs,
  })

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

  const findConfigEntry = (entries: Array<FolderPickEntry>) =>
    entries.find((entry) => {
      const segments = entry.relativePath.split('/')
      return segments.length === 2 && entry.file.name === 'config_modified.json'
    }) ??
    entries.find((entry) => {
      const segments = entry.relativePath.split('/')
      return segments.length === 2 && entry.file.name === 'config.json'
    })

  const findSceneVideoEntry = (entries: Array<FolderPickEntry>) =>
    entries.find((entry) => {
      const segments = entry.relativePath.split('/')
      if (segments.length !== 2) {
        return false
      }

      const fileName = entry.file.name.toLowerCase()
      const extension = fileName.split('.').pop() ?? ''

      return (
        fileName.startsWith('scene') &&
        (entry.file.type.startsWith('video/') ||
          SCENE_VIDEO_EXTENSIONS.has(extension))
      )
    })

  const findDataFolderName = (entries: Array<FolderPickEntry>) => {
    const folderNames = new Set(
      entries
        .map((entry) => entry.relativePath.split('/')[1])
        .filter((segment): segment is string => Boolean(segment)),
    )

    return Array.from(folderNames).find((name) =>
      name.toLowerCase().startsWith('data'),
    )
  }

  const showSelectionError = (message: string) => {
    toast.error('Selection Error', {
      description: message,
    })
  }

  const setInputFiles = (input: HTMLInputElement | null, files: Array<File>) => {
    if (!input) {
      return
    }

    const dataTransfer = new DataTransfer()
    for (const file of files) {
      dataTransfer.items.add(file)
    }
    input.files = dataTransfer.files
  }

  const resetDataFolderPicker = () => {
    setFolderPickerKey((k) => k + 1)
    setSelectedGazeFolderLabel('')
    if (folderPickerRef.current) {
      folderPickerRef.current.value = ''
    }
  }

  const handleGazeFolderPick = (
    files: FileList,
    _folderName: string,
    directoryHandle?: FileSystemDirectoryHandle,
  ) => {
    setEventsDirectoryHandle(directoryHandle ?? null)
    const gf = findGazeFile(files)
    const ef = findEventsFile(files)
    setSelectedGazeFolderLabel(_folderName)
    if (gf) {
      setGazeFile(gf)
    }
    setEventsFile(ef)

    if (!gf || files.length === 0) {
      setGazeFile(null)
      setEventsFile(null)
      showSelectionError(
        "Unable to find valid gaze data file. Please select a folder containing 'gaze.csv'.",
      )
      resetDataFolderPicker()
    }
  }

  const handlePackageFolderPick = async (
    files: FileList,
    folderName: string,
    directoryHandle?: FileSystemDirectoryHandle,
    entries?: Array<FolderPickEntry>,
  ) => {
    const normalizedEntries =
      entries ??
      Array.from(files).map((file) => ({
        file,
        relativePath: file.webkitRelativePath || `${folderName}/${file.name}`,
      }))

    const sceneEntry = findSceneVideoEntry(normalizedEntries)
    const configEntry = findConfigEntry(normalizedEntries)
    const dataFolderName = findDataFolderName(normalizedEntries)

    setRecordingDirectoryHandle(directoryHandle ?? null)

    if (!sceneEntry || !configEntry || !dataFolderName) {
      showSelectionError(
        "Unable to auto-select files. Expected a top-level 'scene*' video, a 'data*' folder, and either 'config_modified.json' or 'config.json'.",
      )
      setPackagePickerKey((k) => k + 1)
      if (packagePickerRef.current) {
        packagePickerRef.current.value = ''
      }
      return
    }

    const dataFolderFiles = normalizedEntries
      .filter((entry) => entry.relativePath.split('/')[1] === dataFolderName)
      .map((entry) => entry.file)

    const dataTransfer = new DataTransfer()
    for (const file of dataFolderFiles) {
      dataTransfer.items.add(file)
    }

    const nextGazeFile = findGazeFile(dataTransfer.files)
    const nextEventsFile = findEventsFile(dataTransfer.files)

    if (!nextGazeFile) {
      showSelectionError(
        `Found '${dataFolderName}' but it does not contain 'gaze.csv'.`,
      )
      return
    }

    setVideoFile(sceneEntry.file)
    setConfigFile(configEntry.file)
    setGazeFile(nextGazeFile)
    setEventsFile(nextEventsFile)
    setInputFiles(videoInputRef.current, [sceneEntry.file])
    setInputFiles(configInputRef.current, [configEntry.file])
    setInputFiles(folderPickerRef.current, dataFolderFiles)
    setSelectedGazeFolderLabel(dataFolderName)

    if (directoryHandle) {
      try {
        const dataDirectoryHandle =
          await directoryHandle.getDirectoryHandle(dataFolderName)
        setEventsDirectoryHandle(dataDirectoryHandle)
      } catch {
        setEventsDirectoryHandle(null)
      }
    } else {
      setEventsDirectoryHandle(null)
    }
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

  const handleOffsetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.currentTarget

    if (value === '' || value === '-' || value.endsWith('.')) {
      return
    }

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) {
      return
    }

    const nextValue = parseFloat(formatTruncatedDecimals(numericValue, 2))

    if (id === 'x-translate-offset') {
      setTranslationOffset('x', nextValue)
      return
    }
    if (id === 'y-translate-offset') {
      setTranslationOffset('y', nextValue)
      return
    }
    if (id === 'z-translate-offset') {
      setTranslationOffset('z', nextValue)
      return
    }
    if (id === 'x-rotation-offset') {
      setRotationOffset('x', nextValue)
      return
    }
    if (id === 'y-rotation-offset') {
      setRotationOffset('y', nextValue)
      return
    }
    if (id === 'z-rotation-offset') {
      setRotationOffset('z', nextValue)
    }
  }

  const handleOffsetInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { id } = e.currentTarget

    if (id === 'x-translate-offset') {
      e.currentTarget.value = formatTruncatedDecimals(
        sensorOffsets.translationMm.x,
        2,
      )
      return
    }
    if (id === 'y-translate-offset') {
      e.currentTarget.value = formatTruncatedDecimals(
        sensorOffsets.translationMm.y,
        2,
      )
      return
    }
    if (id === 'z-translate-offset') {
      e.currentTarget.value = formatTruncatedDecimals(
        sensorOffsets.translationMm.z,
        2,
      )
      return
    }
    if (id === 'x-rotation-offset') {
      e.currentTarget.value = formatTruncatedDecimals(
        sensorOffsets.rotationDeg.x,
        2,
      )
      return
    }
    if (id === 'y-rotation-offset') {
      e.currentTarget.value = formatTruncatedDecimals(
        sensorOffsets.rotationDeg.y,
        2,
      )
      return
    }
    if (id === 'z-rotation-offset') {
      e.currentTarget.value = formatTruncatedDecimals(
        sensorOffsets.rotationDeg.z,
        2,
      )
    }
  }

  const handleConfigSave = async () => {
    if (!configFile) {
      return
    }

    try {
      const modifiedConfigFile = await saveModifiedConfigFile(
        configFile,
        sensorOffsets,
        recordingDirectoryHandle,
      )
      setConfigFile(modifiedConfigFile)
      setInputFiles(configInputRef.current, [modifiedConfigFile])
      toast.success('Config Saved', {
        description: 'Saved the updated offsets to config_modified.json.',
      })
    } catch (error) {
      console.error('Failed to save config_modified.json:', error)
    }
  }

  const sectionLabelClassName = 'text-sm font-medium'
  const sectionContentClassName = 'flex flex-col gap-2'

  React.useEffect(() => {
    const updateOffsetInputValues = async () => {
      if (!configFile) {
        return
      }

      try {
        const offsets = await readConfigOffsets(configFile)
        setSensorOffsets(offsets)

        if (xTranslateOffsetRef.current) {
          xTranslateOffsetRef.current.value = formatTruncatedDecimals(
            offsets.translationMm.x,
            2,
          )
        }
        if (yTranslateOffsetRef.current) {
          yTranslateOffsetRef.current.value = formatTruncatedDecimals(
            offsets.translationMm.y,
            2,
          )
        }
        if (zTranslateOffsetRef.current) {
          zTranslateOffsetRef.current.value = formatTruncatedDecimals(
            offsets.translationMm.z,
            2,
          )
        }
        if (xRotationOffsetRef.current) {
          xRotationOffsetRef.current.value = formatTruncatedDecimals(
            offsets.rotationDeg.x,
            2,
          )
        }
        if (yRotationOffsetRef.current) {
          yRotationOffsetRef.current.value = formatTruncatedDecimals(
            offsets.rotationDeg.y,
            2,
          )
        }
        if (zRotationOffsetRef.current) {
          zRotationOffsetRef.current.value = formatTruncatedDecimals(
            offsets.rotationDeg.z,
            2,
          )
        }
      } catch (error) {
        console.error('Failed to parse config.json offsets:', error)
      }
    }

    void updateOffsetInputValues()
  }, [configFile, setSensorOffsets])

  return (
    <div className="flex justify-between items-start my-4">
      <div
        id="video-div"
        className="flex items-center justify-center h-full flex-1"
      >
        {gazeFile && videoFile && configFile ? (
          <VideoPlayer
            videoRef={videoRef}
            gazeDataFile={gazeFile}
            videoFile={videoFile}
            xrConfigFile={configFile}
            fovHorizontalDeg={fovHorizontalDeg}
            sensorOffsets={sensorOffsets}
            circleConfig={{ stroke, radius, color }}
            isSavingEvents={isSavingEvents}
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
        className="flex flex-col align-top gap-2 p-5 mx-5 border h-max w-96 rounded-lg"
      >
        <Accordion type="multiple">
          <AccordionItem value="setup">
            <AccordionTrigger className="text-lg font-semibold">
              Setup
            </AccordionTrigger>
            <AccordionContent className={sectionContentClassName}>
              <Label
                className={sectionLabelClassName}
                htmlFor="recording-folder-upload"
              >
                Recording Folder
              </Label>
              <FolderPicker
                key={packagePickerKey}
                inputRef={packagePickerRef}
                buttonLabel="Choose Folder"
                placeholder="Choose a recording folder"
                onPick={(files, folderName, directoryHandle, entries) => {
                  void handlePackageFolderPick(
                    files,
                    folderName,
                    directoryHandle,
                    entries,
                  )
                }}
              />

              <div
                id="setup-specifics"
                className="flex flex-col gap-2 p-4 border-2 border-accent rounded-md"
              >
                <Label className={'text-xs'} htmlFor="xr-file-upload">
                  XR Video (Scene Video)
                </Label>
                <Input
                  ref={videoInputRef}
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
                <Label className={'text-xs'} htmlFor="neon-gaze-upload">
                  Neon Gaze Data
                </Label>
                <FolderPicker
                  key={folderPickerKey}
                  inputRef={folderPickerRef}
                  selectedLabel={selectedGazeFolderLabel}
                  onPick={handleGazeFolderPick}
                />
                <Label className={'text-xs'} htmlFor="calibration-file-upload">
                  Neon XR Calibration File (config.json)
                </Label>
                <Input
                  ref={configInputRef}
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
              </div>
              <div className='flex w-full items-center justify-between'>
                <Label className={sectionLabelClassName} htmlFor="recording-fov">
                  Projector Settings
                </Label>
                <Button
                  id='config-save'
                  variant={'outline'}
                  size={'icon'}
                  title='Save to config_modified.json'
                  disabled={!configFile}
                  onClick={() => {
                    void handleConfigSave()
                  }}
                >
                  <SaveIcon className="h-2 w-2" />
                </Button>
              </div>
              <div
                id="projector-settings"
                className="flex flex-col gap-2 p-4 border-2 border-accent rounded-md"
              >
                  <Label className='text-sm' htmlFor="recording-fov">
                    Horizontal FOV
                  </Label>
                  <SliderNumberInput
                    id="recording-fov"
                    value={fovHorizontalDeg}
                    onValueChange={setFovHorizontalDeg}
                    sliderTitle='Lower if there is centre pull'
                    min={45}
                    max={120}
                  />
                  <Label className={sectionLabelClassName} htmlFor="sensor-offsets">
                    Sensor Offsets
                  </Label>
                  <Label className='text-sm' htmlFor="sensor-translation-offsets">
                    Translation (mm)
                  </Label>
                  <div
                    id="sensor-translation-offsets"
                    className="flex flex-row items-center justify-center gap-2 text-xs"
                  >
                    x
                    <Input
                      ref={xTranslateOffsetRef}
                      id="x-translate-offset"
                      type="number"
                      min={0}
                      step='0.01'
                      className="h-8 w-18 text-xs p-1.5"
                      onChange={handleOffsetInputChange}
                      onBlur={handleOffsetInputBlur}
                    />
                    y
                    <Input
                      ref={yTranslateOffsetRef}
                      id="y-translate-offset"
                      type="number"
                      min={0}
                      step='0.01'
                      className="h-8 w-18 text-xs p-1.5"
                      onChange={handleOffsetInputChange}
                      onBlur={handleOffsetInputBlur}
                    />
                    z
                    <Input
                      ref={zTranslateOffsetRef}
                      id="z-translate-offset"
                      type="number"
                      min={0}
                      step='0.01'
                      className="h-8 w-18 text-xs p-1.5"
                      onChange={handleOffsetInputChange}
                      onBlur={handleOffsetInputBlur}
                    />
                  </div>
                  <Label className='text-sm' htmlFor="sensor-rotation-offsets">
                    Rotation (degrees)
                  </Label>
                  <div
                    id="sensor-rotation-offsets"
                    className="flex flex-row items-center justify-center gap-2 text-xs"
                  >
                    x
                    <Input
                      ref={xRotationOffsetRef}
                      id="x-rotation-offset"
                      type="number"
                      min={0}
                      max={360}
                      step='0.01'
                      className="h-8 w-18 text-xs p-1.5"
                      onChange={handleOffsetInputChange}
                      onBlur={handleOffsetInputBlur}
                    />
                    y
                    <Input
                      ref={yRotationOffsetRef}
                      id="y-rotation-offset"
                      type="number"
                      min={0}
                      max={360}
                      step='0.01'
                      className="h-8 w-18 text-xs p-1.5"
                      onChange={handleOffsetInputChange}
                      onBlur={handleOffsetInputBlur}
                    />
                    z
                    <Input
                      ref={zRotationOffsetRef}
                      id="z-rotation-offset"
                      type="number"
                      min={0}
                      max={360}
                      step='0.01'
                      className="h-8 w-18 text-xs p-1.5"
                      onChange={handleOffsetInputChange}
                      onBlur={handleOffsetInputBlur}
                    />
                  </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="adjust">
            <AccordionTrigger className="text-lg font-semibold">
              Align
            </AccordionTrigger>
            <AccordionContent className={sectionContentClassName}>
              <Button
                onClick={setCurrentTimeAsGazeStart}
                disabled={!videoFile || !gazeFile || !configFile}
                className="w-full"
              >
                Set Current Time as Gaze Start Time
              </Button>
              <Label
                className={sectionLabelClassName}
                htmlFor="gaze-start-time"
              >
                Gaze Start Time
              </Label>
              <div
                id="gaze-start-time"
                className="flex flex-row items-center gap-2"
              >
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
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="visualizer-style">
            <AccordionTrigger className="text-lg font-semibold">
              Gaze Visualizer Style
            </AccordionTrigger>
            <AccordionContent className={sectionContentClassName}>
              <Label className={sectionLabelClassName} htmlFor="gaze-radius">
                Radius
              </Label>
              <SliderNumberInput
                id="gaze-radius"
                value={radius}
                onValueChange={setRadius}
                min={1}
                max={100}
              />
              <Label className={sectionLabelClassName} htmlFor="gaze-stroke">
                Stroke Width
              </Label>
              <SliderNumberInput
                id="gaze-stroke"
                value={stroke}
                onValueChange={setStroke}
                min={1}
                max={100}
              />
              <Label className={sectionLabelClassName} htmlFor="gaze-color">
                Color
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}
