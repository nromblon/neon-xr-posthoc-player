import type { CameraIntrinsics } from './gaze-projection'

export type RecordingMode = 'LeftEye' | 'RightEye' | 'Binocular'

export interface CalibrationMarker {
  id: number
  az: number
  el: number
}

export interface CalibrationSession {
  recordingMode: RecordingMode
  markerDistance: number
  markers: Array<CalibrationMarker>
}

export interface MarkerMeasurement {
  id: number
  az: number
  el: number
  u: number
  v: number
}

export interface FrustumCalibrationResult {
  recordingMode: string
  intrinsics: CameraIntrinsics
  videoWidth: number
  videoHeight: number
  meanReprojectionError: number
  solvedAt: string
}

export interface ReprojectionRow {
  id: number
  measuredU: number
  measuredV: number
  projectedU: number
  projectedV: number
  errorPx: number
}

export class CalibrationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CalibrationError'
  }
}

// ---------------------------------------------------------------------------
// Solver
// ---------------------------------------------------------------------------

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Projects (az, el) in degrees through pinhole intrinsics to pixel (u, v).
 * Convention matches gaze-projection.ts:
 *   rx = sin(az)*cos(el), ry = -sin(el), rz = cos(az)*cos(el)
 */
export function projectToPixel(
  azDeg: number,
  elDeg: number,
  intrinsics: CameraIntrinsics,
): { u: number; v: number } {
  const az = toRad(azDeg)
  const el = toRad(elDeg)
  const rx = Math.sin(az) * Math.cos(el)
  const ry = -Math.sin(el)
  const rz = Math.cos(az) * Math.cos(el)
  const { fx, fy, cx, cy } = intrinsics
  return {
    u: (rx / rz) * fx + cx,
    v: (ry / rz) * fy + cy,
  }
}

/**
 * Solves for pinhole intrinsics (fx, fy, cx, cy) from a set of marker
 * measurements using separable 2×2 normal equations (Cramer's rule).
 * Requires at least 4 measurements with sufficient angular spread.
 */
export function solveFrustumCalibration(
  measurements: Array<MarkerMeasurement>,
  videoWidth: number,
  videoHeight: number,
): FrustumCalibrationResult & { reprojectionRows: Array<ReprojectionRow> } {
  if (measurements.length < 4) {
    throw new CalibrationError(
      `Need at least 4 marker measurements, got ${measurements.length}.`,
    )
  }

  // Accumulate normal equations A^T A x = A^T b for [fx, cx] and [fy, cy]
  // u = (rx/rz)*fx + cx  →  row: [rx/rz, 1]
  // v = (ry/rz)*fy + cy  →  row: [ry/rz, 1]
  let a00u = 0,
    a01u = 0,
    a11u = 0,
    b0u = 0,
    b1u = 0
  let a00v = 0,
    a01v = 0,
    a11v = 0,
    b0v = 0,
    b1v = 0

  for (const m of measurements) {
    const az = toRad(m.az)
    const el = toRad(m.el)
    const rx = Math.sin(az) * Math.cos(el)
    const ry = -Math.sin(el)
    const rz = Math.cos(az) * Math.cos(el)

    if (Math.abs(rz) < 1e-9) continue

    const pu = rx / rz
    const pv = ry / rz

    // u-system: [pu, 1] · [fx, cx]^T = m.u
    a00u += pu * pu
    a01u += pu
    a11u += 1
    b0u += pu * m.u
    b1u += m.u

    // v-system: [pv, 1] · [fy, cy]^T = m.v
    a00v += pv * pv
    a01v += pv
    a11v += 1
    b0v += pv * m.v
    b1v += m.v
  }

  const detU = a00u * a11u - a01u * a01u
  const detV = a00v * a11v - a01v * a01v

  if (Math.abs(detU) < 1e-10) {
    throw new CalibrationError(
      'Degenerate marker placement for horizontal axis (markers may all share the same azimuth). Add markers with varied horizontal positions.',
    )
  }
  if (Math.abs(detV) < 1e-10) {
    throw new CalibrationError(
      'Degenerate marker placement for vertical axis (markers may all share the same elevation). Add markers with varied vertical positions.',
    )
  }

  const fx = (b0u * a11u - b1u * a01u) / detU
  const cx = (a00u * b1u - a01u * b0u) / detU
  const fy = (b0v * a11v - b1v * a01v) / detV
  const cy = (a00v * b1v - a01v * b0v) / detV

  if (fx < 50 || fy < 50) {
    throw new CalibrationError(
      `Solved focal length is implausibly small (fx=${fx.toFixed(1)}, fy=${fy.toFixed(1)}). Check that marker angles are in degrees and match the video.`,
    )
  }

  const intrinsics: CameraIntrinsics = { fx, fy, cx, cy }

  // Compute reprojection errors
  const reprojectionRows: Array<ReprojectionRow> = measurements.map((m) => {
    const { u: projU, v: projV } = projectToPixel(m.az, m.el, intrinsics)
    return {
      id: m.id,
      measuredU: m.u,
      measuredV: m.v,
      projectedU: projU,
      projectedV: projV,
      errorPx: Math.hypot(projU - m.u, projV - m.v),
    }
  })

  const meanReprojectionError =
    reprojectionRows.reduce((sum, r) => sum + r.errorPx, 0) /
    reprojectionRows.length

  return {
    recordingMode: '',
    intrinsics,
    videoWidth,
    videoHeight,
    meanReprojectionError,
    solvedAt: new Date().toISOString(),
    reprojectionRows,
  }
}

// ---------------------------------------------------------------------------
// File persistence (save dialog)
// ---------------------------------------------------------------------------

/** Shape of the saved JSON file: the solved result plus a user-provided name. */
export interface FrustumCalibrationFile extends FrustumCalibrationResult {
  name: string
}

/**
 * Serialize the solved calibration (with a `name` field) and prompt the user to
 * save it as a JSON file. Uses the File System Access save dialog when available,
 * falling back to a download. Throws if the user cancels the dialog.
 */
export async function saveFrustumCalibrationFile(
  result: FrustumCalibrationResult,
  name: string,
): Promise<void> {
  const fileData: FrustumCalibrationFile = { name, ...result }
  const serialized = JSON.stringify(fileData, null, 2)
  const trimmed = name.trim()
  const suggestedName = `${trimmed.length > 0 ? trimmed : 'frustum-calibration'}.json`

  if (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    typeof window.showSaveFilePicker === 'function'
  ) {
    const saveFilePicker = window.showSaveFilePicker.bind(window)
    const fileHandle = await saveFilePicker({
      suggestedName,
      types: [
        {
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        },
      ],
    })
    const writable = await fileHandle.createWritable()
    await writable.write(serialized)
    await writable.close()
    return
  }

  const blob = new Blob([serialized], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = suggestedName
  link.click()
  URL.revokeObjectURL(objectUrl)
}

// ---------------------------------------------------------------------------
// Uploaded calibration parsing + localStorage persistence
//
// NOTE: uploaded calibrations are kept in localStorage for now. This is a
// temporary store — they are intended to move to a database in the future.
// ---------------------------------------------------------------------------

const UPLOADS_STORAGE_KEY = 'frustum_calibration_uploads'

/**
 * Validate and parse a saved frustum calibration JSON file (the shape produced
 * by `saveFrustumCalibrationFile`, i.e. a result plus a `name`). Throws a
 * `CalibrationError` with a descriptive message on any structural problem.
 */
export function parseFrustumCalibrationFile(
  jsonText: string,
): FrustumCalibrationFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new CalibrationError(
      'Invalid JSON: could not parse frustum calibration file.',
    )
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new CalibrationError('Frustum calibration must be a JSON object.')
  }

  const obj = parsed as Record<string, unknown>

  if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
    throw new CalibrationError('"name" must be a non-empty string.')
  }

  const k = obj.intrinsics
  if (typeof k !== 'object' || k === null) {
    throw new CalibrationError('"intrinsics" must be an object.')
  }
  const ko = k as Record<string, unknown>
  for (const key of ['fx', 'fy', 'cx', 'cy'] as const) {
    if (typeof ko[key] !== 'number' || !Number.isFinite(ko[key])) {
      throw new CalibrationError(`"intrinsics.${key}" must be a finite number.`)
    }
  }

  if (
    typeof obj.videoWidth !== 'number' ||
    typeof obj.videoHeight !== 'number'
  ) {
    throw new CalibrationError(
      '"videoWidth" and "videoHeight" must be numbers.',
    )
  }

  return {
    name: obj.name,
    recordingMode:
      typeof obj.recordingMode === 'string' ? obj.recordingMode : '',
    intrinsics: {
      fx: ko.fx as number,
      fy: ko.fy as number,
      cx: ko.cx as number,
      cy: ko.cy as number,
    },
    videoWidth: obj.videoWidth,
    videoHeight: obj.videoHeight,
    meanReprojectionError:
      typeof obj.meanReprojectionError === 'number'
        ? obj.meanReprojectionError
        : 0,
    solvedAt: typeof obj.solvedAt === 'string' ? obj.solvedAt : '',
  }
}

/** List user-uploaded frustum calibrations from localStorage. */
export function listUploadedFrustumCalibrations(): Array<FrustumCalibrationFile> {
  const raw = localStorage.getItem(UPLOADS_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Array<FrustumCalibrationFile>) : []
  } catch {
    return []
  }
}

/**
 * Persist an uploaded frustum calibration to localStorage. If one with the same
 * `name` already exists it is replaced. Returns the updated list.
 */
export function saveUploadedFrustumCalibration(
  calibration: FrustumCalibrationFile,
): Array<FrustumCalibrationFile> {
  const existing = listUploadedFrustumCalibrations().filter(
    (c) => c.name !== calibration.name,
  )
  const next = [...existing, calibration]
  localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(next))
  return next
}

// ---------------------------------------------------------------------------
// Session JSON parser
// ---------------------------------------------------------------------------

export function parseFrustumCalibrationSession(
  jsonText: string,
): CalibrationSession {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new CalibrationError(
      'Invalid JSON: could not parse calibration session file.',
    )
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new CalibrationError('Calibration session must be a JSON object.')
  }

  const obj = parsed as Record<string, unknown>

  const validModes: Array<RecordingMode> = ['LeftEye', 'RightEye', 'Binocular']
  if (!validModes.includes(obj.recordingMode as RecordingMode)) {
    throw new CalibrationError(
      `"recordingMode" must be one of: ${validModes.join(', ')}. Got: "${String(obj.recordingMode)}".`,
    )
  }

  if (typeof obj.markerDistance !== 'number' || obj.markerDistance <= 0) {
    throw new CalibrationError(
      '"markerDistance" must be a positive number (distance in metres).',
    )
  }

  if (!Array.isArray(obj.markers) || obj.markers.length === 0) {
    throw new CalibrationError('"markers" must be a non-empty array.')
  }

  const markers: Array<CalibrationMarker> = obj.markers.map(
    (m: unknown, i: number) => {
      if (typeof m !== 'object' || m === null) {
        throw new CalibrationError(`markers[${i}] must be an object.`)
      }
      const mo = m as Record<string, unknown>
      if (typeof mo.id !== 'number') {
        throw new CalibrationError(`markers[${i}].id must be a number.`)
      }
      if (typeof mo.az !== 'number') {
        throw new CalibrationError(
          `markers[${i}].az must be a number (degrees).`,
        )
      }
      if (typeof mo.el !== 'number') {
        throw new CalibrationError(
          `markers[${i}].el must be a number (degrees).`,
        )
      }
      return { id: mo.id, az: mo.az, el: mo.el }
    },
  )

  return {
    recordingMode: obj.recordingMode as RecordingMode,
    markerDistance: obj.markerDistance,
    markers,
  }
}
