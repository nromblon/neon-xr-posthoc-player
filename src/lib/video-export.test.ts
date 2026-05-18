import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildGazeVideoExportFileName,
  clampProgress,
  createVideoExportState,
  getVideoExportSupportError,
  promptExportedVideoFileHandle,
  saveExportedVideoFile,
} from './video-export'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('video-export helpers', () => {
  it('builds an mp4 filename from the source video name', () => {
    expect(buildGazeVideoExportFileName('recording-folder')).toBe(
      'gaze-video_recording-folder.mp4',
    )
    expect(buildGazeVideoExportFileName('recording.session.v2')).toBe(
      'gaze-video_recording.session.mp4',
    )
    expect(buildGazeVideoExportFileName('')).toBe('gaze-video_recording.mp4')
  })

  it('clamps export progress to a safe percentage', () => {
    expect(clampProgress(-20)).toBe(0)
    expect(clampProgress(25.4)).toBe(25)
    expect(clampProgress(140)).toBe(100)
  })

  it('creates export states with normalized progress', () => {
    expect(createVideoExportState('preparing')).toEqual({
      status: 'preparing',
      progress: 0,
      errorMessage: null,
      statusMessage: null,
    })
    expect(
      createVideoExportState('success', {
        progress: 140,
        errorMessage: null,
        statusMessage: 'Done',
      }),
    ).toEqual({
      status: 'success',
      progress: 100,
      errorMessage: null,
      statusMessage: 'Done',
    })
  })

  it('reports support failures for missing audio track availability', () => {
    expect(
      getVideoExportSupportError({
        videoEncoderAvailable: true,
        audioEncoderAvailable: true,
        videoFrameAvailable: true,
        videoCaptureStreamAvailable: true,
        audioRequired: true,
        audioTrackAvailable: false,
      }),
    ).toContain('audio track')
  })

  it('reports support failures for missing webcodecs video support', () => {
    expect(
      getVideoExportSupportError({
        videoEncoderAvailable: false,
        audioEncoderAvailable: true,
        videoFrameAvailable: true,
      }),
    ).toContain('WebCodecs-based H.264')
  })

  it('opens a save picker when available', async () => {
    const close = vi.fn()
    const write = vi.fn()
    const createWritable = vi.fn(() => Promise.resolve({ close, write }))
    const showSaveFilePicker = vi.fn(() =>
      Promise.resolve({ createWritable } as FileSystemFileHandle),
    )
    vi.stubGlobal('window', { showSaveFilePicker })

    const fileHandle = await promptExportedVideoFileHandle('recording-folder')

    expect(fileHandle).not.toBeNull()
    expect(showSaveFilePicker).toHaveBeenCalled()
  })

  it('saves to a chosen file handle when available', async () => {
    const close = vi.fn()
    const write = vi.fn()
    const createWritable = vi.fn(() => Promise.resolve({ close, write }))
    const fileHandle = { createWritable } as unknown as FileSystemFileHandle

    const fileName = await saveExportedVideoFile(
      new Blob(['test'], { type: 'video/mp4' }),
      'recording-folder',
      fileHandle,
    )

    expect(fileName).toBe('gaze-video_recording-folder.mp4')
    expect(write).toHaveBeenCalled()
    expect(close).toHaveBeenCalled()
  })

  it('falls back to anchor download when no picker or file handle exists', async () => {
    vi.stubGlobal('window', {})
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-export')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(
      () => undefined,
    )
    const click = vi.fn()
    const anchor = {
      click,
      download: '',
      href: '',
    }
    const documentMock = {
      createElement: vi.fn().mockReturnValue(
        anchor as unknown as HTMLAnchorElement,
      ),
    }
    vi.stubGlobal('document', documentMock)
    vi.spyOn(documentMock, 'createElement').mockReturnValue(
      anchor as unknown as HTMLAnchorElement,
    )

    const fileName = await saveExportedVideoFile(
      new Blob(['test'], { type: 'video/mp4' }),
      'recording-folder',
    )

    expect(fileName).toBe('gaze-video_recording-folder.mp4')
    expect(anchor.download).toBe('gaze-video_recording-folder.mp4')
    expect(anchor.href).toBe('blob:mock-export')
    expect(click).toHaveBeenCalled()
    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-export')
  })
})
