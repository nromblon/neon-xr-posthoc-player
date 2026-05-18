export type VideoExportStatus =
  | 'idle'
  | 'preparing'
  | 'exporting'
  | 'saving'
  | 'success'
  | 'error'

export interface VideoExportState {
  status: VideoExportStatus
  progress: number
  errorMessage: string | null
  statusMessage: string | null
}

export interface VideoExportSupportOptions {
  audioRequired?: boolean
  videoEncoderAvailable?: boolean
  audioEncoderAvailable?: boolean
  videoFrameAvailable?: boolean
  videoCaptureStreamAvailable?: boolean
  audioTrackAvailable?: boolean
}

export const INITIAL_VIDEO_EXPORT_STATE: VideoExportState = {
  status: 'idle',
  progress: 0,
  errorMessage: null,
  statusMessage: null,
}

export function createVideoExportState(
  status: VideoExportStatus,
  options?: {
    progress?: number
    errorMessage?: string | null
    statusMessage?: string | null
  },
): VideoExportState {
  return {
    status,
    progress: clampProgress(options?.progress ?? (status === 'success' ? 100 : 0)),
    errorMessage: options?.errorMessage ?? null,
    statusMessage: options?.statusMessage ?? null,
  }
}

export function buildGazeVideoExportFileName(sourceLabel: string) {
  const trimmedName = sourceLabel.trim()
  const fallbackName = 'recording'

  if (trimmedName.length === 0) {
    return `gaze-video_${fallbackName}.mp4`
  }

  const extensionIndex = trimmedName.lastIndexOf('.')
  const baseName =
    extensionIndex > 0 ? trimmedName.slice(0, extensionIndex) : trimmedName

  return `gaze-video_${baseName}.mp4`
}

export function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(progress)))
}

export function getVideoExportSupportError(
  options: VideoExportSupportOptions,
) {
  const {
    audioRequired = true,
    videoEncoderAvailable = typeof VideoEncoder !== 'undefined',
    audioEncoderAvailable = typeof AudioEncoder !== 'undefined',
    videoFrameAvailable = typeof VideoFrame !== 'undefined',
    videoCaptureStreamAvailable = true,
    audioTrackAvailable = true,
  } = options

  if (!videoEncoderAvailable || !videoFrameAvailable) {
    return 'This browser does not support WebCodecs-based H.264 video export.'
  }

  if (audioRequired && !audioEncoderAvailable) {
    return 'This browser does not support WebCodecs-based AAC audio export.'
  }

  if (!videoCaptureStreamAvailable) {
    return 'This browser cannot capture the scene video audio track for export.'
  }

  if (audioRequired && !audioTrackAvailable) {
    return 'The source video audio track is unavailable, so MP4 export cannot preserve audio.'
  }

  return null
}

export async function promptExportedVideoFileHandle(sourceLabel: string) {
  const fileName = buildGazeVideoExportFileName(sourceLabel)

  if (
    typeof window === 'undefined' ||
    !('showSaveFilePicker' in window) ||
    typeof window.showSaveFilePicker !== 'function'
  ) {
    return null
  }

  const saveFilePicker = window.showSaveFilePicker.bind(window)
  return saveFilePicker({
    suggestedName: fileName,
    types: [
      {
        description: 'MP4 Video',
        accept: { 'video/mp4': ['.mp4'] },
      },
    ],
  })
}

export async function saveExportedVideoFile(
  blob: Blob,
  sourceLabel: string,
  fileHandle?: FileSystemFileHandle | null,
) {
  const fileName = buildGazeVideoExportFileName(sourceLabel)

  if (fileHandle) {
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
    return fileName
  }

  const promptedFileHandle = await promptExportedVideoFileHandle(sourceLabel)
  if (promptedFileHandle) {
    const writable = await promptedFileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
    return fileName
  }

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(objectUrl)

  return fileName
}
