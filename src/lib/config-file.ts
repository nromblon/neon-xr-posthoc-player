import type { NeonXRConfig } from '@/lib/gaze-projection'

export interface SensorOffsetValues {
  rotationDeg: {
    x: number
    y: number
    z: number
  }
  translationMm: {
    x: number
    y: number
    z: number
  }
}

export interface AdjustmentsConfigFile {
  gazeStartTimeMs: number
  gazeOffset2d: {
    x: number
    y: number
  }
  gazeVisualizerStyle: {
    radius: number
    stroke: number
    color: string
  }
}

interface AdjustmentsConfigFileInput {
  gazeStartTimeMs?: unknown
  gazeOffset2d?: {
    x?: unknown
    y?: unknown
  }
  gazeVisualizerStyle?: {
    radius?: unknown
    stroke?: unknown
    color?: unknown
  }
}

interface NeonXRConfigFile {
  sensorCalibration?: {
    offset?: {
      position?: {
        x?: number
        y?: number
        z?: number
      }
      rotation?: {
        x?: number
        y?: number
        z?: number
      }
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export function applySensorOffsetsToConfig(
  config: NeonXRConfig,
  offsets: SensorOffsetValues,
): NeonXRConfig {
  return {
    ...config,
    sensorCalibration: {
      ...config.sensorCalibration,
      offset: {
        ...config.sensorCalibration.offset,
        position: {
          x: offsets.translationMm.x / 1000,
          y: offsets.translationMm.y / 1000,
          z: offsets.translationMm.z / 1000,
        },
        rotation: {
          x: offsets.rotationDeg.x,
          y: offsets.rotationDeg.y,
          z: offsets.rotationDeg.z,
        },
      },
    },
  }
}

export function truncateToDecimals(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.trunc(value * factor) / factor
}

export function formatTruncatedDecimals(value: number, decimals: number) {
  return truncateToDecimals(value, decimals).toFixed(decimals)
}

export async function readConfigOffsets(
  file: File,
): Promise<SensorOffsetValues> {
  const text = await file.text()
  const config = JSON.parse(text) as NeonXRConfigFile
  const position = config.sensorCalibration?.offset?.position
  const rotation = config.sensorCalibration?.offset?.rotation

  return {
    translationMm: {
      x: (position?.x ?? 0) * 1000,
      y: (position?.y ?? 0) * 1000,
      z: (position?.z ?? 0) * 1000,
    },
    rotationDeg: {
      x: rotation?.x ?? 0,
      y: rotation?.y ?? 0,
      z: rotation?.z ?? 0,
    },
  }
}

export async function buildModifiedConfigText(
  file: File,
  offsets: SensorOffsetValues,
) {
  const text = await file.text()
  const config = JSON.parse(text) as NeonXRConfig
  const nextConfig = applySensorOffsetsToConfig(config, offsets)

  return JSON.stringify(nextConfig, null, 4)
}

export async function buildModifiedConfigFile(
  file: File,
  offsets: SensorOffsetValues,
) {
  const serializedConfig = await buildModifiedConfigText(file, offsets)

  return new File([serializedConfig], 'config_modified.json', {
    type: 'application/json',
  })
}

export async function saveModifiedConfigFile(
  file: File,
  offsets: SensorOffsetValues,
  directoryHandle?: FileSystemDirectoryHandle | null,
) {
  const modifiedConfigFile = await buildModifiedConfigFile(file, offsets)
  const serializedConfig = await modifiedConfigFile.text()

  if (directoryHandle) {
    const fileHandle = await directoryHandle.getFileHandle(
      'config_modified.json',
      { create: true },
    )
    const writable = await fileHandle.createWritable()
    await writable.write(serializedConfig)
    await writable.close()
    return modifiedConfigFile
  }

  if (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    typeof window.showSaveFilePicker === 'function'
  ) {
    const saveFilePicker = window.showSaveFilePicker.bind(window)
    const fileHandle = await saveFilePicker({
      suggestedName: 'config_modified.json',
      types: [
        {
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        },
      ],
    })
    const writable = await fileHandle.createWritable()
    await writable.write(serializedConfig)
    await writable.close()
    return modifiedConfigFile
  }

  const blob = new Blob([serializedConfig], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = 'config_modified.json'
  link.click()
  URL.revokeObjectURL(objectUrl)

  return modifiedConfigFile
}

export function buildAdjustmentsConfigText(adjustments: AdjustmentsConfigFile) {
  return JSON.stringify(adjustments, null, 4)
}

export async function saveAdjustmentsConfigFile(
  adjustments: AdjustmentsConfigFile,
  directoryHandle?: FileSystemDirectoryHandle | null,
) {
  const serializedConfig = buildAdjustmentsConfigText(adjustments)
  const adjustmentsConfigFile = new File(
    [serializedConfig],
    'adjustments-config.json',
    {
      type: 'application/json',
    },
  )

  if (directoryHandle) {
    const fileHandle = await directoryHandle.getFileHandle(
      'adjustments-config.json',
      { create: true },
    )
    const writable = await fileHandle.createWritable()
    await writable.write(serializedConfig)
    await writable.close()
    return adjustmentsConfigFile
  }

  if (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    typeof window.showSaveFilePicker === 'function'
  ) {
    const saveFilePicker = window.showSaveFilePicker.bind(window)
    const fileHandle = await saveFilePicker({
      suggestedName: 'adjustments-config.json',
      types: [
        {
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        },
      ],
    })
    const writable = await fileHandle.createWritable()
    await writable.write(serializedConfig)
    await writable.close()
    return adjustmentsConfigFile
  }

  const blob = new Blob([serializedConfig], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = 'adjustments-config.json'
  link.click()
  URL.revokeObjectURL(objectUrl)

  return adjustmentsConfigFile
}

function normalizeFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeColor(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

export async function readAdjustmentsConfig(
  file: File,
): Promise<AdjustmentsConfigFile> {
  const text = await file.text()
  const config = JSON.parse(text) as AdjustmentsConfigFileInput

  return {
    gazeStartTimeMs: Math.max(
      0,
      Math.round(normalizeFiniteNumber(config.gazeStartTimeMs, 0)),
    ),
    gazeOffset2d: {
      x: normalizeFiniteNumber(config.gazeOffset2d?.x, 0),
      y: normalizeFiniteNumber(config.gazeOffset2d?.y, 0),
    },
    gazeVisualizerStyle: {
      radius: Math.max(
        1,
        Math.round(
          normalizeFiniteNumber(config.gazeVisualizerStyle?.radius, 14),
        ),
      ),
      stroke: Math.max(
        1,
        Math.round(
          normalizeFiniteNumber(config.gazeVisualizerStyle?.stroke, 5),
        ),
      ),
      color: normalizeColor(config.gazeVisualizerStyle?.color, '#FF0000'),
    },
  }
}
