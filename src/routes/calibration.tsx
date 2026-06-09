import React, { useEffect, useReducer, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useIntlayer } from 'react-intlayer'
import { toast } from 'sonner'
import { CheckCircle2Icon, CircleDashedIcon, CircleDotIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  type CalibrationMarker,
  type CalibrationSession,
  type FrustumCalibrationResult,
  type MarkerMeasurement,
  type ReprojectionRow,
  CalibrationError,
  parseFrustumCalibrationSession,
  saveFrustumCalibration,
  solveFrustumCalibration,
} from '@/lib/frustum-calibration'

export const Route = createFileRoute('/calibration')({ component: CalibrationPage })

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type Phase =
  | 'idle'
  | 'sessionLoaded'
  | 'videoLoaded'
  | 'measuring'
  | 'allMeasured'
  | 'solved'
  | 'saved'

interface CalibState {
  phase: Phase
  session: CalibrationSession | null
  videoObjectUrl: string | null
  videoNativeWidth: number
  videoNativeHeight: number
  measurements: Map<number, { u: number; v: number }>
  activeMarkerId: number | null
  result: FrustumCalibrationResult | null
  reprojectionRows: ReprojectionRow[] | null
}

type CalibAction =
  | { type: 'LOAD_SESSION'; session: CalibrationSession }
  | {
      type: 'LOAD_VIDEO_META'
      url: string
      width: number
      height: number
    }
  | { type: 'SET_ACTIVE_MARKER'; id: number | null }
  | { type: 'RECORD_MEASUREMENT'; id: number; u: number; v: number }
  | { type: 'CLEAR_MEASUREMENT'; id: number }
  | {
      type: 'SOLVE'
      result: FrustumCalibrationResult
      rows: ReprojectionRow[]
    }
  | { type: 'SAVE' }
  | { type: 'RESET' }

const initialState: CalibState = {
  phase: 'idle',
  session: null,
  videoObjectUrl: null,
  videoNativeWidth: 0,
  videoNativeHeight: 0,
  measurements: new Map(),
  activeMarkerId: null,
  result: null,
  reprojectionRows: null,
}

function allMeasured(
  markers: CalibrationMarker[],
  measurements: Map<number, { u: number; v: number }>,
): boolean {
  return markers.every((m) => measurements.has(m.id))
}

function reducer(state: CalibState, action: CalibAction): CalibState {
  switch (action.type) {
    case 'LOAD_SESSION':
      return {
        ...initialState,
        videoObjectUrl: state.videoObjectUrl,
        phase: 'sessionLoaded',
        session: action.session,
      }
    case 'LOAD_VIDEO_META': {
      const phase =
        state.session && state.measurements.size > 0
          ? allMeasured(state.session.markers, state.measurements)
            ? 'allMeasured'
            : 'measuring'
          : state.session
            ? 'videoLoaded'
            : 'idle'
      return {
        ...state,
        videoObjectUrl: action.url,
        videoNativeWidth: action.width,
        videoNativeHeight: action.height,
        phase,
      }
    }
    case 'SET_ACTIVE_MARKER':
      return {
        ...state,
        activeMarkerId: action.id,
        phase: state.phase === 'solved' || state.phase === 'saved' ? 'measuring' : state.phase === 'videoLoaded' ? 'measuring' : state.phase,
      }
    case 'RECORD_MEASUREMENT': {
      const next = new Map(state.measurements)
      next.set(action.id, { u: action.u, v: action.v })
      const nextActive =
        state.session
          ? (() => {
              const unmet = state.session.markers.find((m) => !next.has(m.id))
              return unmet ? unmet.id : null
            })()
          : null
      const phase =
        state.session && allMeasured(state.session.markers, next)
          ? 'allMeasured'
          : 'measuring'
      return {
        ...state,
        measurements: next,
        activeMarkerId: nextActive,
        phase,
      }
    }
    case 'CLEAR_MEASUREMENT': {
      const next = new Map(state.measurements)
      next.delete(action.id)
      return {
        ...state,
        measurements: next,
        phase: 'measuring',
        result: null,
        reprojectionRows: null,
      }
    }
    case 'SOLVE':
      return {
        ...state,
        phase: 'solved',
        result: action.result,
        reprojectionRows: action.rows,
        activeMarkerId: null,
      }
    case 'SAVE':
      return { ...state, phase: 'saved' }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Canvas drawing
// ---------------------------------------------------------------------------

function drawOverlay(
  canvas: HTMLCanvasElement,
  measurements: Map<number, { u: number; v: number }>,
  markers: CalibrationMarker[],
  activeMarkerId: number | null,
  reprojectionRows: ReprojectionRow[] | null,
  nativeWidth: number,
  nativeHeight: number,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, nativeWidth, nativeHeight)

  const R = 10
  const font = `bold ${Math.max(12, nativeWidth / 80)}px sans-serif`

  // Draw measured points (red)
  for (const marker of markers) {
    const m = measurements.get(marker.id)
    if (!m) continue
    ctx.beginPath()
    ctx.arc(m.u, m.v, R, 0, Math.PI * 2)
    ctx.fillStyle = marker.id === activeMarkerId ? 'rgba(255,200,0,0.85)' : 'rgba(220,50,50,0.85)'
    ctx.fill()
    ctx.font = font
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(marker.id), m.u, m.v)
  }

  // After solve: green projected circles + lines
  if (reprojectionRows) {
    for (const row of reprojectionRows) {
      const meas = measurements.get(row.id)
      if (!meas) continue
      // Connecting line
      ctx.beginPath()
      ctx.moveTo(meas.u, meas.v)
      ctx.lineTo(row.projectedU, row.projectedV)
      ctx.strokeStyle = 'rgba(100,220,100,0.7)'
      ctx.lineWidth = Math.max(1, nativeWidth / 600)
      ctx.stroke()
      // Green projected circle
      ctx.beginPath()
      ctx.arc(row.projectedU, row.projectedV, R, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(80,220,80,0.9)'
      ctx.lineWidth = Math.max(2, nativeWidth / 400)
      ctx.stroke()
    }
  }

  // Crosshair hint for active marker
  if (activeMarkerId !== null && !measurements.has(activeMarkerId)) {
    // nothing to draw yet — cursor is the indicator
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CalibrationPage() {
  const content = useIntlayer('calibration')
  const [state, dispatch] = useReducer(reducer, initialState)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const prevObjectUrlRef = useRef<string | null>(null)

  // Revoke old object URL when a new one is set
  useEffect(() => {
    const prev = prevObjectUrlRef.current
    if (prev && prev !== state.videoObjectUrl) {
      URL.revokeObjectURL(prev)
    }
    prevObjectUrlRef.current = state.videoObjectUrl
  }, [state.videoObjectUrl])

  // Revoke on unmount
  useEffect(() => {
    return () => {
      if (prevObjectUrlRef.current) {
        URL.revokeObjectURL(prevObjectUrlRef.current)
      }
    }
  }, [])

  // Sync canvas size to native video dimensions
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || state.videoNativeWidth === 0) return
    canvas.width = state.videoNativeWidth
    canvas.height = state.videoNativeHeight
  }, [state.videoNativeWidth, state.videoNativeHeight])

  // Redraw canvas when measurements or result change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !state.session || state.videoNativeWidth === 0) return
    drawOverlay(
      canvas,
      state.measurements,
      state.session.markers,
      state.activeMarkerId,
      state.reprojectionRows ?? null,
      state.videoNativeWidth,
      state.videoNativeHeight,
    )
  }, [
    state.measurements,
    state.reprojectionRows,
    state.activeMarkerId,
    state.session,
    state.videoNativeWidth,
    state.videoNativeHeight,
  ])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSessionUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const session = parseFrustumCalibrationSession(e.target?.result as string)
        dispatch({ type: 'LOAD_SESSION', session })
      } catch (err) {
        toast.error(String(content.toastSessionError), {
          description: err instanceof CalibrationError ? err.message : String(err),
        })
      }
    }
    reader.readAsText(file)
  }

  const handleVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file)
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.onloadedmetadata = () => {
      dispatch({
        type: 'LOAD_VIDEO_META',
        url,
        width: vid.videoWidth,
        height: vid.videoHeight,
      })
    }
    vid.src = url
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.activeMarkerId === null) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const u = (e.clientX - rect.left) * (state.videoNativeWidth / rect.width)
    const v = (e.clientY - rect.top) * (state.videoNativeHeight / rect.height)
    dispatch({ type: 'RECORD_MEASUREMENT', id: state.activeMarkerId, u, v })
  }

  const handleSolve = () => {
    if (!state.session) return
    try {
      const measurements: MarkerMeasurement[] = state.session.markers
        .filter((m) => state.measurements.has(m.id))
        .map((m) => {
          const px = state.measurements.get(m.id)!
          return { id: m.id, az: m.az, el: m.el, u: px.u, v: px.v }
        })
      const raw = solveFrustumCalibration(
        measurements,
        state.videoNativeWidth,
        state.videoNativeHeight,
      )
      const result: FrustumCalibrationResult = {
        recordingMode: state.session.recordingMode,
        intrinsics: raw.intrinsics,
        videoWidth: raw.videoWidth,
        videoHeight: raw.videoHeight,
        meanReprojectionError: raw.meanReprojectionError,
        solvedAt: raw.solvedAt,
      }
      dispatch({ type: 'SOLVE', result, rows: raw.reprojectionRows })
    } catch (err) {
      toast.error(String(content.toastSolveError), {
        description: err instanceof CalibrationError ? err.message : String(err),
      })
    }
  }

  const handleSave = () => {
    if (!state.result) return
    saveFrustumCalibration(state.result)
    dispatch({ type: 'SAVE' })
    toast.success(String(content.toastSaved), {
      description: String(content.toastSavedDesc),
    })
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const canSolve =
    state.session !== null &&
    state.videoNativeWidth > 0 &&
    state.measurements.size >= 4

  const cyWarning =
    state.result &&
    Math.abs(state.result.intrinsics.cy - state.videoNativeHeight / 2) >
      state.videoNativeHeight * 0.05

  const qualityBadge = state.result
    ? state.result.meanReprojectionError < 2
      ? { label: String(content.qualityExcellent), className: 'bg-green-600 text-white' }
      : state.result.meanReprojectionError < 5
        ? { label: String(content.qualityUsable), className: 'bg-yellow-500 text-white' }
        : { label: String(content.qualityRedo), className: 'bg-red-600 text-white' }
    : null

  const sortedRows = state.reprojectionRows
    ? [...state.reprojectionRows].sort((a, b) => b.errorPx - a.errorPx)
    : null

  const videoShowing =
    state.videoObjectUrl !== null && state.videoNativeWidth > 0

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          {String(content.backToPlayer)}
        </Link>
        <h1 className="text-xl font-bold">{String(content.pageTitle)}</h1>
      </div>

      {/* Main two-column layout */}
      <div className="flex gap-4 flex-1 items-start">
        {/* Left: Video + Canvas */}
        <div className="flex-1 min-w-0">
          {videoShowing ? (
            <div
              className="relative w-full"
              style={{
                aspectRatio: `${state.videoNativeWidth} / ${state.videoNativeHeight}`,
              }}
            >
              <video
                ref={videoRef}
                src={state.videoObjectUrl ?? undefined}
                className="absolute inset-0 w-full h-full object-contain bg-black"
                controls
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{
                  cursor: state.activeMarkerId !== null ? 'crosshair' : 'default',
                  pointerEvents: state.activeMarkerId !== null ? 'auto' : 'none',
                }}
                onClick={handleCanvasClick}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center border-2 border-dashed rounded-lg aspect-video text-muted-foreground text-sm">
              {state.session ? String(content.uploadVideoHint) : String(content.uploadSessionHint)}
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="w-80 flex flex-col gap-4 shrink-0">
          {/* Session upload */}
          <div className="flex flex-col gap-2 p-4 border rounded-lg">
            <Label className="text-sm font-medium">{String(content.uploadSession)}</Label>
            <Input
              type="file"
              accept=".json"
              className="text-muted-foreground"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleSessionUpload(file)
              }}
            />
            {state.session && (
              <div className="text-xs text-muted-foreground">
                {String(content.mode)}: <span className="font-medium">{state.session.recordingMode}</span>
                {' · '}{state.session.markers.length} markers
              </div>
            )}
          </div>

          {/* Video upload */}
          {state.session && (
            <div className="flex flex-col gap-2 p-4 border rounded-lg">
              <Label className="text-sm font-medium">{String(content.uploadVideo)}</Label>
              <Input
                type="file"
                accept="video/*"
                className="text-muted-foreground"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleVideoUpload(file)
                }}
              />
            </div>
          )}

          {/* Marker list */}
          {state.session && videoShowing && (
            <div className="flex flex-col gap-1 p-4 border rounded-lg">
              <Label className="text-sm font-medium mb-2">{String(content.markers)}</Label>
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                {state.session.markers.map((marker) => {
                  const measured = state.measurements.has(marker.id)
                  const isActive = state.activeMarkerId === marker.id
                  return (
                    <div
                      key={marker.id}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-xs cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-yellow-100 dark:bg-yellow-900'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() =>
                        dispatch({
                          type: 'SET_ACTIVE_MARKER',
                          id: isActive ? null : marker.id,
                        })
                      }
                    >
                      {measured ? (
                        <CheckCircle2Icon className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : isActive ? (
                        <CircleDotIcon className="h-3.5 w-3.5 text-yellow-500 shrink-0 animate-pulse" />
                      ) : (
                        <CircleDashedIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium w-5">{marker.id}</span>
                      <span className="text-muted-foreground">
                        Az {marker.az.toFixed(1)}° El {marker.el.toFixed(1)}°
                      </span>
                      {measured && (
                        <button
                          className="ml-auto text-muted-foreground hover:text-foreground text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            dispatch({ type: 'CLEAR_MEASUREMENT', id: marker.id })
                            dispatch({ type: 'SET_ACTIVE_MARKER', id: marker.id })
                          }}
                        >
                          {String(content.remeasure)}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {state.measurements.size} / {state.session.markers.length} {String(content.measured)}
              </div>
            </div>
          )}

          {/* Solve button */}
          {videoShowing && (
            <Button
              disabled={!canSolve}
              onClick={handleSolve}
              variant="default"
            >
              {String(content.solve)}
            </Button>
          )}

          {/* Results */}
          {state.result && (
            <div className="flex flex-col gap-3 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{String(content.results)}</span>
                {qualityBadge && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${qualityBadge.className}`}>
                    {qualityBadge.label}
                  </span>
                )}
              </div>

              {cyWarning && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-500 text-xs">
                  {String(content.cyWarning)}
                </Badge>
              )}

              {/* Intrinsics table */}
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 text-muted-foreground font-normal">{String(content.parameter)}</th>
                    <th className="text-right py-1 text-muted-foreground font-normal">{String(content.calibrated)}</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['fx', state.result.intrinsics.fx],
                      ['fy', state.result.intrinsics.fy],
                      ['cx', state.result.intrinsics.cx],
                      ['cy', state.result.intrinsics.cy],
                    ] as [string, number][]
                  ).map(([name, val]) => (
                    <tr key={name} className="border-b last:border-0">
                      <td className="py-1 font-mono">{name}</td>
                      <td className="py-1 text-right font-mono">{val.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-xs text-muted-foreground">
                {String(content.meanError)}: {state.result.meanReprojectionError.toFixed(2)} px
              </div>

              {/* Reprojection table */}
              {sortedRows && (
                <div className="overflow-y-auto max-h-48">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 text-muted-foreground font-normal">{String(content.markerCol)}</th>
                        <th className="text-right py-1 text-muted-foreground font-normal">{String(content.measuredCol)}</th>
                        <th className="text-right py-1 text-muted-foreground font-normal">{String(content.projectedCol)}</th>
                        <th className="text-right py-1 text-muted-foreground font-normal">{String(content.errorCol)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="py-1 font-mono">{row.id}</td>
                          <td className="py-1 text-right font-mono">
                            {row.measuredU.toFixed(0)},{row.measuredV.toFixed(0)}
                          </td>
                          <td className="py-1 text-right font-mono">
                            {row.projectedU.toFixed(0)},{row.projectedV.toFixed(0)}
                          </td>
                          <td className={`py-1 text-right font-mono ${row.errorPx > 5 ? 'text-red-500' : row.errorPx > 2 ? 'text-yellow-500' : 'text-green-600'}`}>
                            {row.errorPx.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button onClick={handleSave} variant="outline" disabled={state.phase === 'saved'}>
                {String(content.save)}
              </Button>
            </div>
          )}

          {/* Reset */}
          {state.phase !== 'idle' && (
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => dispatch({ type: 'RESET' })}
            >
              {String(content.reset)}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
