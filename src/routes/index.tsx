import { Label } from '@radix-ui/react-label'
import { createFileRoute } from '@tanstack/react-router'
import React, { useRef } from 'react'
import { useIntlayer } from 'react-intlayer'
import Color from 'color'
import {
  BookXIcon,
  HistoryIcon,
  SaveIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { FolderPickEntry } from '@/components/ui/folder-picker'
import type { AdjustmentsConfigFile } from '@/lib/config-file'
import type { VideoExportState } from '@/lib/video-export'
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
  readAdjustmentsConfig,
  readConfigOffsets,
  saveAdjustmentsConfigFile,
  saveModifiedConfigFile,
} from '@/lib/config-file'
import {
  INITIAL_VIDEO_EXPORT_STATE,
  createVideoExportState,
} from '@/lib/video-export'
import { useConfigStore } from '@/store/configStore'
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
  const content = useIntlayer('app')
  const [radius, setRadius] = React.useState(14)
  const [stroke, setStroke] = React.useState(5)
  const [color, setColor] = React.useState('#FF0000')
  const [gazeOffset2d, setGazeOffset2d] = React.useState({ x: 0, y: 0 })
  const [adjustmentsConfigFile, setAdjustmentsConfigFile] =
    React.useState<File | null>(null)

  const folderPickerRef = useRef<HTMLInputElement | null>(null)
  const [folderPickerKey, setFolderPickerKey] = React.useState(0)
  const packagePickerRef = useRef<HTMLInputElement | null>(null)
  const [packagePickerKey, setPackagePickerKey] = React.useState(0)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const configInputRef = useRef<HTMLInputElement | null>(null)
  const adjustmentsInputRef = useRef<HTMLInputElement | null>(null)
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
  const [recordingFolderLabel, setRecordingFolderLabel] = React.useState('')
  const [selectedGazeFolderLabel, setSelectedGazeFolderLabel] =
    React.useState('')
  // Scene Video Data
  const [videoFile, setVideoFile] = React.useState<File | null>(null)
  // Calibration Config Data
  const [configFile, setConfigFile] = React.useState<File | null>(null)
  // Horizontal FOV for projection calculations
  const [fovHorizontalDeg, setFovHorizontalDeg] = React.useState(82)
  const [exportGazeVideo, setExportGazeVideo] = React.useState<
    (() => Promise<void>) | null
  >(null)
  const [videoExportState, setVideoExportState] =
    React.useState<VideoExportState>(INITIAL_VIDEO_EXPORT_STATE)
  const handleExportReady = React.useCallback(
    (exportHandler: (() => Promise<void>) | null) => {
      setExportGazeVideo(() => exportHandler)
    },
    [],
  )

  const videoRef = useRef<HTMLVideoElement>(null)
  const gazeStartMs = useConfigStore((state) => state.gazeStartTime)
  const sensorOffsets = useConfigStore((state) => state.sensorOffsets)
  const setGazeStartTimeInStore = useConfigStore(
    (state) => state.setGazeStartTime,
  )
  const setRotationOffset = useConfigStore((state) => state.setRotationOffset)
  const setSensorOffsets = useConfigStore((state) => state.setSensorOffsets)
  const setTranslationOffset = useConfigStore(
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
  const gazeStartMinutes = Math.floor(gazeStartMs / 60000)
  const gazeStartSeconds = Math.floor((gazeStartMs % 60000) / 1000)
  const gazeStartMilliseconds = gazeStartMs % 1000

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

  const findAdjustmentsEntry = (entries: Array<FolderPickEntry>) =>
    entries.find((entry) => {
      const segments = entry.relativePath.split('/')
      return (
        segments.length === 2 && entry.file.name === 'adjustments-config.json'
      )
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

  const setInputFiles = (
    input: HTMLInputElement | null,
    files: Array<File>,
  ) => {
    if (!input) {
      return
    }

    const dataTransfer = new DataTransfer()
    for (const file of files) {
      dataTransfer.items.add(file)
    }
    input.files = dataTransfer.files
  }

  const setAdjustmentsInputElement = React.useCallback(
    (input: HTMLInputElement | null) => {
      adjustmentsInputRef.current = input
      if (input && adjustmentsConfigFile) {
        setInputFiles(input, [adjustmentsConfigFile])
      }
    },
    [adjustmentsConfigFile],
  )

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
    const adjustmentsEntry = findAdjustmentsEntry(normalizedEntries)
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

    setRecordingFolderLabel(folderName)

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

    if (adjustmentsEntry) {
      setAdjustmentsConfigFile(adjustmentsEntry.file)
      setInputFiles(adjustmentsInputRef.current, [adjustmentsEntry.file])
      try {
        const adjustments = await readAdjustmentsConfig(adjustmentsEntry.file)
        applyAdjustmentsConfig(adjustments)
        toast.success('Adjustments Loaded', {
          description:
            'Loaded adjustments-config.json from the recording folder.',
        })
      } catch (error) {
        console.error('Failed to parse adjustments-config.json:', error)
        toast.error('Adjustments Load Failed', {
          description:
            'Unable to parse adjustments-config.json from the recording folder.',
        })
      }
    }

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

  const setGazeStartTime = (nextGazeStartMs: number) => {
    const boundedGazeStartMs = Math.max(0, Math.round(nextGazeStartMs))
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

  const handleConfigReset = async () => {
    if (!configFile) {
      return
    }
    try {
      const offsets = await readConfigOffsets(configFile)
      setSensorOffsets(offsets)
      toast.success('Config Reset', {
        description: 'Reset offsets to values from config.json.',
      })
    } catch (error) {
      console.error('Failed to parse config.json offsets:', error)
      toast.error('Config Reset Failed', {
        description: 'Unable to parse config.json to reset offsets.',
      })
    }
  }

  const handleGazeOffset2dChange =
    (axis: 'x' | 'y') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.currentTarget

      if (value === '' || value === '-' || value.endsWith('.')) {
        return
      }

      const numericValue = Number(value)
      if (!Number.isFinite(numericValue)) {
        return
      }

      const nextValue = parseFloat(formatTruncatedDecimals(numericValue, 2))
      setGazeOffset2d((current) => ({
        ...current,
        [axis]: nextValue,
      }))
    }

  const handleGazeOffset2dBlur =
    (axis: 'x' | 'y') => (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.value = formatTruncatedDecimals(gazeOffset2d[axis], 2)
    }

  const applyAdjustmentsConfig = (adjustments: AdjustmentsConfigFile) => {
    setGazeStartTime(adjustments.gazeStartTimeMs)
    setGazeOffset2d({
      x: adjustments.gazeOffset2d.x,
      y: adjustments.gazeOffset2d.y,
    })
    setRadius(adjustments.gazeVisualizerStyle.radius)
    setStroke(adjustments.gazeVisualizerStyle.stroke)
    setColor(adjustments.gazeVisualizerStyle.color)
  }

  const handleAdjustmentsUpload = async (file: File) => {
    try {
      const adjustments = await readAdjustmentsConfig(file)
      applyAdjustmentsConfig(adjustments)
      setAdjustmentsConfigFile(file)
      setInputFiles(adjustmentsInputRef.current, [file])
      toast.success('Adjustments Loaded', {
        description: 'Loaded adjustments-config.json.',
      })
    } catch (error) {
      console.error('Failed to parse adjustments-config.json:', error)
      toast.error('Adjustments Load Failed', {
        description: 'Unable to parse adjustments-config.json.',
      })
      if (adjustmentsInputRef.current) {
        adjustmentsInputRef.current.value = ''
      }
      setAdjustmentsConfigFile(null)
    }
  }

  const handleAdjustmentsSave = async () => {
    const adjustmentsConfig = {
      gazeStartTimeMs: gazeStartMs,
      gazeOffset2d,
      gazeVisualizerStyle: {
        radius,
        stroke,
        color,
      },
    }

    try {
      await saveAdjustmentsConfigFile(
        adjustmentsConfig,
        recordingDirectoryHandle,
      )
      toast.success('Adjustments Saved', {
        description: 'Saved the adjustments to adjustments-config.json.',
      })
    } catch (error) {
      console.error('Failed to save adjustments-config.json:', error)
      toast.error('Save Failed', {
        description: 'Unable to save adjustments-config.json.',
      })
    }
  }

  const sectionLabelClassName = 'text-sm font-medium'
  const sectionContentClassName = 'flex flex-col gap-2'
  const isExportBusy =
    videoExportState.status === 'preparing' ||
    videoExportState.status === 'exporting' ||
    videoExportState.status === 'saving'
  const canExportVideo =
    Boolean(videoFile && gazeFile && configFile && exportGazeVideo) &&
    !isExportBusy
  const exportButtonLabel =
    videoExportState.status === 'preparing'
      ? content.exportPreparing
      : videoExportState.status === 'exporting'
        ? `${String(content.exportInProgress)} ${videoExportState.progress}%`
        : videoExportState.status === 'saving'
          ? content.exportSaving
          : content.exportGazeVideo
  const exportStatusMessage =
    videoExportState.status === 'success'
      ? content.exportSuccess
      : videoExportState.status === 'error'
        ? videoExportState.errorMessage
        : videoExportState.statusMessage
          ? videoExportState.statusMessage
          : !videoFile || !gazeFile || !configFile
            ? content.exportLoadFilesHint
            : content.exportUsesSettings

  React.useEffect(() => {
    const updateOffsetInputValues = async () => {
      if (!configFile) {
        return
      }

      try {
        const offsets = await readConfigOffsets(configFile)
        setSensorOffsets(offsets)
      } catch (error) {
        console.error('Failed to parse config.json offsets:', error)
      }
    }

    void updateOffsetInputValues()
  }, [configFile, setSensorOffsets])

  React.useEffect(() => {
    if (!videoFile || !gazeFile || !configFile) {
      setVideoExportState(createVideoExportState('idle'))
      setExportGazeVideo(null)
    }
  }, [configFile, gazeFile, videoFile])

  React.useEffect(() => {
    if (
      exportGazeVideo &&
      videoExportState.status === 'error' &&
      videoExportState.errorMessage ===
        'Load the scene video metadata before exporting.'
    ) {
      setVideoExportState(createVideoExportState('idle'))
    }
  }, [exportGazeVideo, videoExportState.errorMessage, videoExportState.status])

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
            recordingLabel={recordingFolderLabel}
            videoFile={videoFile}
            xrConfigFile={configFile}
            fovHorizontalDeg={fovHorizontalDeg}
            sensorOffsets={sensorOffsets}
            gazeOffset2d={gazeOffset2d}
            circleConfig={{ stroke, radius, color }}
            isSavingEvents={isSavingEvents}
            onFrameDurationChange={(frameDurationSeconds) => {
              if (frameDurationSeconds > 0) {
                setFrameDurationMs(frameDurationSeconds * 1000)
              }
            }}
            onExportReady={handleExportReady}
            onExportStateChange={setVideoExportState}
          />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookXIcon />
              </EmptyMedia>
              <EmptyTitle>{content.noData}</EmptyTitle>
              <EmptyDescription>{content.chooseFiles}</EmptyDescription>
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
              {content.setup}
            </AccordionTrigger>
            <AccordionContent className={sectionContentClassName}>
              <Label
                className={sectionLabelClassName}
                htmlFor="recording-folder-upload"
              >
                {content.recordingFolder}
              </Label>
              <FolderPicker
                key={packagePickerKey}
                inputRef={packagePickerRef}
                buttonLabel={String(content.chooseFolderButton)}
                placeholder={String(content.chooseRecordingFolderPlaceholder)}
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
                  {content.xrVideoLabel}
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
                  {content.neonGazeData}
                </Label>
                <FolderPicker
                  key={folderPickerKey}
                  inputRef={folderPickerRef}
                  selectedLabel={selectedGazeFolderLabel}
                  onPick={handleGazeFolderPick}
                />
              </div>
              <div className="flex w-full items-center justify-between">
                <Label
                  className={sectionLabelClassName}
                  htmlFor="recording-fov"
                >
                  {content.projectorSettings}
                </Label>
                <div className="flex space-x-2">
                  <Button
                    id="config-reset"
                    variant={'outline'}
                    size={'icon'}
                    title={String(content.resetConfigTitle)}
                    disabled={!configFile}
                    onClick={() => {
                      void handleConfigReset()
                    }}
                  >
                    <HistoryIcon className="h-2 w-2" />
                  </Button>
                  <Button
                    id="config-save"
                    variant={'outline'}
                    size={'icon'}
                    title={String(content.saveConfigTitle)}
                    disabled={!configFile}
                    onClick={() => {
                      void handleConfigSave()
                    }}
                  >
                    <SaveIcon className="h-2 w-2" />
                  </Button>
                </div>
              </div>
              <div
                id="projector-settings"
                className="flex flex-col gap-2 p-4 border-2 border-accent rounded-md"
              >
                <Label className={'text-xs'} htmlFor="calibration-file-upload">
                  {content.calibrationFile}
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
                <Label className="text-sm" htmlFor="recording-fov">
                  {content.horizontalFov}
                </Label>
                <SliderNumberInput
                  id="recording-fov"
                  value={fovHorizontalDeg}
                  onValueChange={setFovHorizontalDeg}
                  sliderTitle={String(content.fovSliderHint)}
                  min={45}
                  max={120}
                />
                <Label
                  className={sectionLabelClassName}
                  htmlFor="sensor-offsets"
                >
                  {content.sensorOffsets}
                </Label>
                <Label className="text-sm" htmlFor="sensor-translation-offsets">
                  {content.translationMm}
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
                    value={sensorOffsets.translationMm.x}
                    step="0.1"
                    min={-50}
                    max={50}
                    className="h-8 w-18 text-xs p-1.5"
                    onChange={handleOffsetInputChange}
                    onBlur={handleOffsetInputBlur}
                  />
                  y
                  <Input
                    ref={yTranslateOffsetRef}
                    id="y-translate-offset"
                    type="number"
                    value={sensorOffsets.translationMm.y}
                    step="0.1"
                    min={-50}
                    max={50}
                    className="h-8 w-18 text-xs p-1.5"
                    onChange={handleOffsetInputChange}
                    onBlur={handleOffsetInputBlur}
                  />
                  z
                  <Input
                    ref={zTranslateOffsetRef}
                    id="z-translate-offset"
                    type="number"
                    value={sensorOffsets.translationMm.z}
                    step="0.1"
                    min={-50}
                    max={50}
                    className="h-8 w-18 text-xs p-1.5"
                    onChange={handleOffsetInputChange}
                    onBlur={handleOffsetInputBlur}
                  />
                </div>
                <Label className="text-sm" htmlFor="sensor-rotation-offsets">
                  {content.rotationDeg}
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
                    value={sensorOffsets.rotationDeg.x}
                    min={0}
                    max={360}
                    step="0.01"
                    className="h-8 w-18 text-xs p-1.5"
                    onChange={handleOffsetInputChange}
                    onBlur={handleOffsetInputBlur}
                  />
                  y
                  <Input
                    ref={yRotationOffsetRef}
                    id="y-rotation-offset"
                    type="number"
                    value={sensorOffsets.rotationDeg.y}
                    min={0}
                    max={360}
                    step="0.01"
                    className="h-8 w-18 text-xs p-1.5"
                    onChange={handleOffsetInputChange}
                    onBlur={handleOffsetInputBlur}
                  />
                  z
                  <Input
                    ref={zRotationOffsetRef}
                    id="z-rotation-offset"
                    type="number"
                    value={sensorOffsets.rotationDeg.z}
                    min={0}
                    max={360}
                    step="0.01"
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
              {content.adjustments}
            </AccordionTrigger>
            <AccordionContent className={sectionContentClassName}>
              <Label
                className={sectionLabelClassName}
                htmlFor="adjustments-file-upload"
              >
                {content.adjustmentsMetadata}
              </Label>
              <div className="flex w-full items-center gap-2 justify-between">
                <Input
                  ref={setAdjustmentsInputElement}
                  id="adjustments-file-upload"
                  type="file"
                  className="text-muted-foreground"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      void handleAdjustmentsUpload(file)
                    }
                  }}
                />
                <Button
                  id="save-adjustment-btn"
                  size="icon"
                  variant="outline"
                  title={String(content.saveAdjustmentsTitle)}
                  disabled={!configFile}
                  onClick={() => {
                    void handleAdjustmentsSave()
                  }}
                >
                  <SaveIcon className="h-4 w-4" />
                </Button>
              </div>
              <Label
                className={sectionLabelClassName}
                htmlFor="gaze-start-time"
              >
                {content.gazeStartTime}
              </Label>
              <div
                id="gaze-start-time"
                className="flex flex-row items-center gap-2"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title={String(content.gazeBackOneFrame)}
                  onClick={() => shiftGazeStartByFrame(-1)}
                  disabled={!videoFile || !gazeFile || !configFile}
                >
                  <SkipBackIcon />
                </Button>
                <Input
                  id="m-gst"
                  type="number"
                  value={gazeStartMinutes}
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
                  value={gazeStartSeconds}
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
                  value={gazeStartMilliseconds}
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
                  title={String(content.gazeForwardOneFrame)}
                  onClick={() => shiftGazeStartByFrame(1)}
                  disabled={!videoFile || !gazeFile || !configFile}
                >
                  <SkipForwardIcon />
                </Button>
              </div>
              <Button
                onClick={setCurrentTimeAsGazeStart}
                disabled={!videoFile || !gazeFile || !configFile}
                className="w-full"
              >
                {content.setCurrentTimeAsGazeStart}
              </Button>
              <Label
                className={sectionLabelClassName}
                htmlFor="player-gaze-offset"
              >
                {content.gazeOffset2d}
              </Label>
              <div
                id="player-gaze-offset"
                className="flex flex-row items-center gap-2 text-xs"
              >
                x
                <Input
                  id="x-2dgaze-offset"
                  value={gazeOffset2d.x}
                  type="number"
                  step="1"
                  className="h-8 w-22 text-xs p-1.5"
                  onChange={handleGazeOffset2dChange('x')}
                  onBlur={handleGazeOffset2dBlur('x')}
                />
                y
                <Input
                  id="y-2dgaze-offset"
                  value={gazeOffset2d.y}
                  type="number"
                  step="1"
                  className="h-8 w-22 text-xs p-1.5"
                  onChange={handleGazeOffset2dChange('y')}
                  onBlur={handleGazeOffset2dBlur('y')}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="export-gaze-video">
            <AccordionTrigger className="text-lg font-semibold">
              {content.exportGazeVideo}
            </AccordionTrigger>
            <AccordionContent className={sectionContentClassName}>
              <p className="text-sm text-muted-foreground">
                {content.exportDescription}
              </p>
              <Button
                disabled={!canExportVideo}
                onClick={() => {
                  void exportGazeVideo?.()
                }}
              >
                {exportButtonLabel}
              </Button>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${videoExportState.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {exportStatusMessage}
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="visualizer-style">
            <AccordionTrigger className="text-lg font-semibold">
              {content.gazeVisualizerStyle}
            </AccordionTrigger>
            <AccordionContent className={sectionContentClassName}>
              <Label className={sectionLabelClassName} htmlFor="gaze-radius">
                {content.radius}
              </Label>
              <SliderNumberInput
                id="gaze-radius"
                value={radius}
                onValueChange={setRadius}
                min={1}
                max={100}
              />
              <Label className={sectionLabelClassName} htmlFor="gaze-stroke">
                {content.strokeWidth}
              </Label>
              <SliderNumberInput
                id="gaze-stroke"
                value={stroke}
                onValueChange={setStroke}
                min={1}
                max={100}
              />
              <Label className={sectionLabelClassName} htmlFor="gaze-color">
                {content.color}
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
