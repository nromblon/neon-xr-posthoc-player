/**
 * gazeProjection.ts
 *
 * Maps Pupil Neon gaze (azimuth/elevation) onto a Quest 3 rectilinear
 * in-headset recording frame, using the mount calibration quaternion
 * from config.json.
 *
 * Dependencies: gl-matrix
 *   npm install gl-matrix
 *   npm install --save-dev @types/gl-matrix  (if needed — gl-matrix 3.x ships its own types)
 */

import { quat, vec3 } from 'gl-matrix';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Rotation quaternion as stored in config.json (Unity convention: x, y, z, w) */
export interface MountRotation {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Minimal shape of config.json relevant to gaze projection */
export interface NeonXRConfig {
  sensorCalibration: {
    offset: {
      rotation: MountRotation;
      /** Position in metres relative to Quest origin — not used for ray projection */
      position: { x: number; y: number; z: number };
    };
  };
}

/** Pinhole camera intrinsics for the Quest 3 recording */
export interface CameraIntrinsics {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
}

/** Parameters describing the Quest 3 video recording */
export interface VideoParams {
  /** Recording width in pixels */
  videoWidth: number;
  /** Recording height in pixels */
  videoHeight: number;
  /**
   * Horizontal FOV of the recording in degrees.
   *
   * Typical values:
   *   ~89°  → in-headset recording (1920×1080) or MQDH Cropped
   *   ~120° → MQDH Cinematic
   *
   * Verify empirically: display a fixation cross at a known angle in VR,
   * record it, measure its pixel x position, then solve:
   *   fx = (pixel_x - cx) / Math.tan(toRad(knownAngleDeg))
   */
  fovHorizontalDeg: number;
}

/** A built projector — construct once, reuse for all samples in a recording */
export interface Projector {
  mountQuat: quat;
  K: CameraIntrinsics;
  videoWidth: number;
  videoHeight: number;
}

/** Result of projecting a single gaze sample */
export interface GazeProjectionResult {
  /** Pixel x coordinate in the video frame, or null if invalid */
  x: number | null;
  /** Pixel y coordinate in the video frame, or null if invalid */
  y: number | null;
  /**
   * False when the gaze ray points away from the camera (outside FOV, blink)
   * or the input sample was flagged as not worn.
   */
  valid: boolean;
}

/** A single row from gaze.csv with the fields this module uses */
export interface GazeCSVRow {
  'timestamp [ns]': number | string;
  'azimuth [deg]': number | string;
  'elevation [deg]': number | string;
  /** 1.0 = worn, 0.0 = not worn */
  worn?: number | string;
  [key: string]: unknown;
}

/** Projected result with its original timestamp preserved */
export interface ProjectedGazeSample extends GazeProjectionResult {
  timestamp_ns: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Convert Neon's azimuth/elevation (degrees, scene-camera convention) to a
 * unit ray in scene camera Cartesian space.
 *
 * Neon convention (from Pupil Labs IMU Transformations docs):
 *   azimuth=0, elevation=0  → looking straight ahead (+Y in scene cam space)
 *   azimuth positive        → rightward
 *   elevation positive      → upward
 */
function azElToRayScene(azimuthDeg: number, elevationDeg: number): vec3 {
  // Convert to standard spherical coordinates
  const elRad = toRad(elevationDeg) + Math.PI / 2; // elevation=0 → equator
  const azRad = -toRad(azimuthDeg) + Math.PI / 2;  // flip azimuth convention

  const x = Math.sin(elRad) * Math.cos(azRad);
  const y = Math.cos(elRad);
  const z = Math.sin(elRad) * Math.sin(azRad);

  return vec3.fromValues(x, y, z);
}

/**
 * Rotate a ray from Neon scene camera space into Quest 3 headset space
 * using the mount calibration quaternion.
 *
 * Only rotation is applied — translation is irrelevant for ray directions.
 */
function rotateRayToQuestSpace(rayScene: vec3, mountQuat: quat): vec3 {
  const out = vec3.create();
  vec3.transformQuat(out, rayScene, mountQuat);
  return out;
}

/**
 * Project a ray in Quest headset space onto the video frame using a
 * standard pinhole camera model.
 *
 * Valid only for rectilinear recordings (in-headset, MQDH Cropped/Cinematic).
 * Do NOT use with MQDH Original — that output is not rectilinear.
 */
function projectRayToFrame(rayQuest: vec3, K: CameraIntrinsics): GazeProjectionResult {
  // Ray must be facing forward (positive Z) to land on screen
  if (rayQuest[2] <= 0) {
    return { x: null, y: null, valid: false };
  }

  // Perspective divide, then apply intrinsics
  const xNorm = rayQuest[0] / rayQuest[2];
  const yNorm = rayQuest[1] / rayQuest[2];

  return {
    x: K.fx * xNorm + K.cx,
    y: K.fy * yNorm + K.cy,
    valid: true,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a projector from a parsed config.json and video parameters.
 * Construct this once per recording and reuse it for all gaze samples.
 *
 * @param configJson - parsed content of config.json from the Quest 3 app's
 *   persistent data path. Load it however suits your app (fetch, FileReader, etc.)
 * @param videoParams - resolution and FOV of your Quest 3 recording
 */
export function buildProjector(configJson: NeonXRConfig, videoParams: VideoParams): Projector {
  const { videoWidth, videoHeight, fovHorizontalDeg } = videoParams;

  // Mount calibration quaternion — Unity stores as { x, y, z, w }
  // gl-matrix quat.fromValues also takes (x, y, z, w), so no reordering needed
  const r = configJson.sensorCalibration.offset.rotation;
  const mountQuat = quat.fromValues(r.x, r.y, r.z, r.w);

  // Pinhole camera intrinsics derived from resolution and FOV
  const fx = (videoWidth / 2) / Math.tan(toRad(fovHorizontalDeg) / 2);
  const fy = fx; // square pixels in Quest recording output
  const cx = videoWidth / 2;
  const cy = videoHeight / 2;

  return { mountQuat, K: { fx, fy, cx, cy }, videoWidth, videoHeight };
}

/**
 * Project a single gaze sample onto the video frame.
 *
 * @param projector    - built by buildProjector()
 * @param azimuthDeg   - "azimuth [deg]" column from gaze.csv
 * @param elevationDeg - "elevation [deg]" column from gaze.csv
 */
export function projectGazeSample(
  projector: Projector,
  azimuthDeg: number,
  elevationDeg: number,
): GazeProjectionResult {
  const rayScene = azElToRayScene(azimuthDeg, elevationDeg);
  const rayQuest = rotateRayToQuestSpace(rayScene, projector.mountQuat);
  return projectRayToFrame(rayQuest, projector.K);
}

/**
 * Project an array of parsed gaze.csv rows onto the video frame.
 *
 * Rows where `worn === 0` or azimuth/elevation are missing are returned
 * with valid=false and null coordinates — no gaze dot should be rendered
 * for these samples.
 *
 * @param projector - built by buildProjector()
 * @param rows      - parsed gaze.csv rows (e.g. from papaparse with header:true)
 */
export function projectGazeCSV(
  projector: Projector,
  rows: GazeCSVRow[],
): ProjectedGazeSample[] {
  return rows.map((row): ProjectedGazeSample => {
    const timestamp_ns = parseInt(String(row['timestamp [ns]']), 10);
    const az = parseFloat(String(row['azimuth [deg]']));
    const el = parseFloat(String(row['elevation [deg]']));
    const worn = row.worn !== undefined ? parseFloat(String(row.worn)) : 1;

    if (worn === 0 || isNaN(az) || isNaN(el)) {
      return { timestamp_ns, x: null, y: null, valid: false };
    }

    const { x, y, valid } = projectGazeSample(projector, az, el);
    return { timestamp_ns, x, y, valid };
  });
}

export function readConfigJson(configContent: string): NeonXRConfig {
    try {
        const config = JSON.parse(configContent);
        // Basic validation of required fields
        if (
            !config.sensorCalibration ||
            !config.sensorCalibration.offset ||
            !config.sensorCalibration.offset.rotation
        ) {
            throw new Error('Invalid config.json: missing sensorCalibration.offset.rotation');
        }
        return config as NeonXRConfig;
    } catch (error) {
        throw new Error(`Failed to parse config.json: ${error instanceof Error ? error.message : String(error)}`);
    }
}