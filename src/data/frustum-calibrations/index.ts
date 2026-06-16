import type { FrustumCalibrationFile } from '@/lib/frustum-calibration'
import q3LeftEyeSquare from './q3_left-eye-square_intrinsics.json'

/**
 * Frustum calibration presets bundled with the app.
 *
 * To add a preset: drop a `*_intrinsics.json` file (same shape as a saved
 * calibration, including a `name` field) in this folder, then import and add it
 * to the array below. These are surfaced as options in the recording-mode select.
 */
export const PRESET_FRUSTUM_CALIBRATIONS: FrustumCalibrationFile[] = [
  q3LeftEyeSquare as FrustumCalibrationFile,
]
