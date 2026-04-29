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

import { quat, vec3 } from 'gl-matrix'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Rotation quaternion as stored in config.json (Unity convention: x, y, z, w) */
export interface MountRotation {
  x: number // pitch (degrees)
  y: number // yaw (degrees)
  z: number // roll (degrees)
  // no w — this is Euler angles, not a quaternion
}

/** Minimal shape of config.json relevant to gaze projection */
export interface NeonXRConfig {
  sensorCalibration: {
    offset: {
      rotation: MountRotation
      position: { x: number; y: number; z: number }
    }
  }
}

/** Pinhole camera intrinsics for the Quest 3 recording */
export interface CameraIntrinsics {
  fx: number
  fy: number
  cx: number
  cy: number
}

/** Parameters describing the Quest 3 video recording */
export interface VideoParams {
  videoWidth: number
  videoHeight: number
  fovHorizontalDeg: number
  gazeOffsetX?: number // pixels, default 0
  gazeOffsetY?: number // pixels, default 0
}

/** A built projector — construct once, reuse for all samples in a recording */
export interface Projector {
  mountQuat: quat
  mountPosition: vec3
  K: CameraIntrinsics
  videoWidth: number
  videoHeight: number
  gazeOffsetX: number
  gazeOffsetY: number
}

/** Result of projecting a single gaze sample */
export interface GazeProjectionResult {
  /** Pixel x coordinate in the video frame, or null if invalid */
  x: number | null
  /** Pixel y coordinate in the video frame, or null if invalid */
  y: number | null
  /**
   * False when the gaze ray points away from the camera (outside FOV, blink)
   * or the input sample was flagged as not worn.
   */
  valid: boolean
}

/** A single row from gaze.csv with the fields this module uses */
export interface GazeCSVRow {
  'timestamp [ns]': number | string
  'azimuth [deg]': number | string
  'elevation [deg]': number | string
  /** 1.0 = worn, 0.0 = not worn */
  worn?: number | string
  [key: string]: unknown
}

/** Projected result with its original timestamp preserved */
export interface ProjectedGazeSample extends GazeProjectionResult {
  timestamp_ns: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const toRad = (deg: number): number => (deg * Math.PI) / 180

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
  const elRad = toRad(elevationDeg) + Math.PI / 2 // elevation=0 → equator
  const azRad = -toRad(azimuthDeg) + Math.PI / 2 // flip azimuth convention

  const x = Math.sin(elRad) * Math.cos(azRad)
  const y = Math.cos(elRad)
  const z = Math.sin(elRad) * Math.sin(azRad)

  return vec3.fromValues(x, y, z)
}

/**
 * Rotate a ray from Neon scene camera space into Quest 3 headset space
 * using the mount calibration quaternion.
 *
 * Only rotation is applied — translation is irrelevant for ray directions.
 */
function rotateRayToQuestSpace(rayScene: vec3, mountQuat: quat): vec3 {
  // Neon scene camera: X-right, Y-down, Z-forward (right-handed)
  // Unity (where the mount calibration is defined): X-right, Y-up, Z-forward (left-handed)
  // The only axis difference is Y — negate it before applying the Unity rotation
  const rayUnity = vec3.fromValues(rayScene[0], -rayScene[1], rayScene[2])

  const rotated = vec3.create()
  vec3.transformQuat(rotated, rayUnity, mountQuat)

  // Convert result back from Unity Y-up to camera/image Y-down for projection
  return vec3.fromValues(rotated[0], -rotated[1], rotated[2])
}

/**
 * Project a ray in Quest headset space onto the video frame using a
 * standard pinhole camera model.
 *
 * Valid only for rectilinear recordings (in-headset, MQDH Cropped/Cinematic).
 * Do NOT use with MQDH Original — that output is not rectilinear.
 */
function projectRayToFrame(
  rayQuest: vec3,
  mountPosition: vec3,
  K: CameraIntrinsics,
  gazeOffsetX: number,
  gazeOffsetY: number,
): GazeProjectionResult {
  // Ray must be facing forward (positive Z) to land on screen
  if (rayQuest[2] <= 0) {
    console.warn(
      `Gaze ray points away from camera (Z=${rayQuest[2]}), skipping projection`,
    )
    return { x: null, y: null, valid: false }
  }

  // The ray originates at the Neon module's physical position in Quest space,
  // not at the Quest camera's optical centre. Find where the ray intersects
  // the normalised image plane (Z=1) given this offset origin.
  //
  // Ray: P(t) = mountPosition + t * rayQuest
  // Solve for t where P(t).z = 1:  t = (1 - mountPosition[2]) / rayQuest[2]
  const t = (1.0 - mountPosition[2]) / rayQuest[2]
  const xAtPlane = mountPosition[0] + t * rayQuest[0]
  const yAtPlane = mountPosition[1] + t * rayQuest[1]

  return {
    x: K.fx * xAtPlane + K.cx + gazeOffsetX,
    y: K.fy * yAtPlane + K.cy + gazeOffsetY,
    valid: true,
  }
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
export function buildProjector(
  configJson: NeonXRConfig,
  videoParams: VideoParams,
): Projector {
  const { videoWidth, videoHeight, fovHorizontalDeg } = videoParams

  const r = configJson.sensorCalibration.offset.rotation
  // config.json stores rotation as Euler angles in degrees (x=pitch, y=yaw, z=roll)
  // Unity's default Euler order is ZXY (applied as: roll first, then pitch, then yaw)
  // // quat.fromEuler expects (out, x_deg, y_deg, z_deg) and uses ZXY order internally
  // If ZXY (default Unity) doesn't look right, try:
  // quat.fromEuler(mountQuat, r.y, r.x, r.z); // swap pitch/yaw if off
  const mountQuat = quat.create()
  console.log('rebuilding projector')
  quat.fromEuler(mountQuat, r.x, r.y, r.z) // standard order, no sign changes

  // Extract position offset — stored in metres in config.json
  const p = configJson.sensorCalibration.offset.position
  const mountPosition = vec3.fromValues(p.x, -p.y, p.z)

  const fx = videoWidth / 2 / Math.tan(toRad(fovHorizontalDeg) / 2)
  const fy = fx
  const cx = videoWidth / 2
  const cy = videoHeight / 2

  return {
    mountQuat,
    mountPosition,
    K: { fx, fy, cx, cy },
    videoWidth,
    videoHeight,
    gazeOffsetX: videoParams.gazeOffsetX || 0,
    gazeOffsetY: videoParams.gazeOffsetY || 0,
  }
}

export function debugProjector(projector: Projector): void {
  // Test ray pointing straight ahead (azimuth=0, elevation=0)
  const rayStraight = azElToRayScene(0, 0)
  const rotatedStraight = rotateRayToQuestSpace(
    rayStraight,
    projector.mountQuat,
  )

  // Test ray pointing 10° up (azimuth=0, elevation=10)
  const rayUp = azElToRayScene(0, 10)
  const rotatedUp = rotateRayToQuestSpace(rayUp, projector.mountQuat)

  // Test ray pointing 10° right (azimuth=10, elevation=0)
  const rayRight = azElToRayScene(10, 0)
  const rotatedRight = rotateRayToQuestSpace(rayRight, projector.mountQuat)

  console.table({
    'straight ahead': {
      scene: Array.from(rayStraight).map((v) => v.toFixed(4)),
      quest: Array.from(rotatedStraight).map((v) => v.toFixed(4)),
    },
    '10° up': {
      scene: Array.from(rayUp).map((v) => v.toFixed(4)),
      quest: Array.from(rotatedUp).map((v) => v.toFixed(4)),
    },
    '10° right': {
      scene: Array.from(rayRight).map((v) => v.toFixed(4)),
      quest: Array.from(rotatedRight).map((v) => v.toFixed(4)),
    },
  })

  console.log(
    'mountQuat:',
    Array.from(projector.mountQuat).map((v) => v.toFixed(6)),
  )
  console.log(
    'mountPosition:',
    Array.from(projector.mountPosition).map((v) => v.toFixed(4)),
  )
  console.log('K:', projector.K)

  // Also project to pixels
  const straight = projectGazeSample(projector, 0, 0)
  const up10 = projectGazeSample(projector, 0, 10)
  const down10 = projectGazeSample(projector, 0, -10)
  const right10 = projectGazeSample(projector, 10, 0)

  console.table({
    'straight (az=0, el=0)': {
      x: straight.x?.toFixed(1),
      y: straight.y?.toFixed(1),
    },
    '10° up   (az=0, el=+10)': { x: up10.x?.toFixed(1), y: up10.y?.toFixed(1) },
    '10° down (az=0, el=-10)': {
      x: down10.x?.toFixed(1),
      y: down10.y?.toFixed(1),
    },
    '10° right(az=10, el=0)': {
      x: right10.x?.toFixed(1),
      y: right10.y?.toFixed(1),
    },
  })

  console.log(
    `Video: ${projector.videoWidth}x${projector.videoHeight}, centre: (${projector.K.cx}, ${projector.K.cy})`,
  )
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
  const rayScene = azElToRayScene(azimuthDeg, elevationDeg)
  const rayQuest = rotateRayToQuestSpace(rayScene, projector.mountQuat)
  return projectRayToFrame(
    rayQuest,
    projector.mountPosition,
    projector.K,
    projector.gazeOffsetX,
    projector.gazeOffsetY,
  )
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
  rows: Array<GazeCSVRow>,
): Array<ProjectedGazeSample> {
  return rows.map((row): ProjectedGazeSample => {
    const timestamp_ns = parseInt(String(row['timestamp [ns]']), 10)
    const az = parseFloat(String(row['azimuth [deg]']))
    const el = parseFloat(String(row['elevation [deg]']))
    const worn = row.worn !== undefined ? parseFloat(String(row.worn)) : 1

    if (worn === 0 || isNaN(az) || isNaN(el)) {
      console.warn(
        `Skipping invalid gaze sample at timestamp ${timestamp_ns}: worn=${worn}, az=${row['azimuth [deg]']}, el=${row['elevation [deg]']}`,
      )
      return { timestamp_ns, x: null, y: null, valid: false }
    }

    const { x, y, valid } = projectGazeSample(projector, az, el)
    return { timestamp_ns, x, y, valid }
  })
}
