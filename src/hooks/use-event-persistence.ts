import * as React from 'react'

import { parseCsvLine, serializeEventsCsv, writeEventsCsv } from '@/lib/utils'
import { useEventStore } from '@/store/eventStore'
import type { Event as AnnotationEvent } from '@/types/annotations'

const NANOSECONDS_PER_MILLISECOND = 1_000_000

function normalizeHeaderName(header: string) {
  return header.trim().replace(/^['"`]+|['"`]+$/g, '').toLowerCase()
}

interface UseEventPersistenceParams {
  eventsDirectoryHandle: FileSystemDirectoryHandle | null
  eventsFile: File | null
  gazeStartMs: number
}

interface UseEventPersistenceResult {
  isLoading: boolean
  isSaving: boolean
  loadError: Error | null
  saveError: Error | null
}

export function useEventPersistence({
  eventsDirectoryHandle,
  eventsFile,
  gazeStartMs,
}: UseEventPersistenceParams): UseEventPersistenceResult {
  const events = useEventStore((state) => state.events)
  const removeEvents = useEventStore((state) => state.removeEvents)
  const setEventOriginTimestampNs = useEventStore(
    (state) => state.setEventOriginTimestampNs,
  )
  const setEvents = useEventStore((state) => state.setEvents)
  const setRecordingId = useEventStore((state) => state.setRecordingId)
  const gazeStartMsRef = React.useRef(gazeStartMs)
  const previousTimelineGazeStartMsRef = React.useRef(gazeStartMs)
  const persistedEventsCsvRef = React.useRef(serializeEventsCsv([]))
  const skipNextSaveRef = React.useRef(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [loadError, setLoadError] = React.useState<Error | null>(null)
  const [saveError, setSaveError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    gazeStartMsRef.current = gazeStartMs
  }, [gazeStartMs])

  React.useEffect(() => {
    let cancelled = false

    const resetEvents = () => {
      skipNextSaveRef.current = true
      previousTimelineGazeStartMsRef.current = gazeStartMsRef.current
      persistedEventsCsvRef.current = serializeEventsCsv([])
      setRecordingId('')
      setEventOriginTimestampNs(0)
      removeEvents()
    }

    resetEvents()
    setLoadError(null)

    if (!eventsFile) {
      setIsLoading(false)
      return
    }

    const loadEvents = async () => {
      setIsLoading(true)

      try {
        const text = await eventsFile.text()
        if (cancelled) {
          return
        }

        const lines = text
          .split('\n')
          .map((line) => line.replace(/\r$/, ''))
          .filter((line) => line.trim().length > 0)

        if (lines.length < 2) {
          skipNextSaveRef.current = true
          previousTimelineGazeStartMsRef.current = gazeStartMsRef.current
          persistedEventsCsvRef.current = serializeEventsCsv([])
          setEventOriginTimestampNs(0)
          setEvents([])
          return
        }

        const headers = parseCsvLine(lines[0]).map(normalizeHeaderName)
        const col = (name: string) => headers.indexOf(name)

        const idxRecordingId = col('recording id')
        const idxType = col('type')
        const idxTimestamp = col('timestamp [ns]')
        const idxName = col('name')

        if (idxTimestamp === -1 || idxName === -1) {
          throw new Error(
            `events.csv missing required columns. Found headers: ${headers.join(', ')}`,
          )
        }

        const rawEvents = lines
          .slice(1)
          .map((line) => {
            const cols = parseCsvLine(line).map((value) => value.trim())
            const utx_timestamp_ns = Number(cols[idxTimestamp])
            const name = cols[idxName] ?? ''

            if (!name || !Number.isFinite(utx_timestamp_ns)) {
              return null
            }

            return {
              recording_id: cols[idxRecordingId] ?? '',
              type: cols[idxType] ?? '',
              name,
              timestamp_ns: utx_timestamp_ns,
              utx_timestamp_ns,
            }
          })
          .filter((event): event is AnnotationEvent => event !== null)
          .sort((a, b) => a.timestamp_ns - b.timestamp_ns)

        setRecordingId(rawEvents[0]?.recording_id ?? '')

        const originTimestamp =
          rawEvents.find((event) => event.name === 'recording.begin')
            ?.timestamp_ns ?? rawEvents[0]?.timestamp_ns
        const gazeStartOffsetNs =
          gazeStartMsRef.current * NANOSECONDS_PER_MILLISECOND

        const normalizedEvents = rawEvents.map((event) => ({
          ...event,
          timestamp_ns: Math.max(
            event.timestamp_ns - (originTimestamp ?? 0) + gazeStartOffsetNs,
            0,
          ),
        }))

        if (!cancelled) {
          skipNextSaveRef.current = true
          previousTimelineGazeStartMsRef.current = gazeStartMsRef.current
          persistedEventsCsvRef.current = serializeEventsCsv(rawEvents)
          setEventOriginTimestampNs(originTimestamp ?? 0)
          setEvents(normalizedEvents)
        }
      } catch (error) {
        if (!cancelled) {
          const nextError =
            error instanceof Error ? error : new Error('Failed to load events.csv')
          setLoadError(nextError)
          setRecordingId('')
          setEventOriginTimestampNs(0)
          skipNextSaveRef.current = true
          previousTimelineGazeStartMsRef.current = gazeStartMsRef.current
          persistedEventsCsvRef.current = serializeEventsCsv([])
          setEvents([])
          console.error('Failed to load events.csv:', nextError)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadEvents()

    return () => {
      cancelled = true
    }
  }, [
    eventsFile,
    removeEvents,
    setEventOriginTimestampNs,
    setEvents,
    setRecordingId,
  ])

  React.useEffect(() => {
    const previousGazeStartMs = previousTimelineGazeStartMsRef.current
    const deltaNs =
      (gazeStartMs - previousGazeStartMs) * NANOSECONDS_PER_MILLISECOND

    if (deltaNs === 0 || events.length === 0) {
      previousTimelineGazeStartMsRef.current = gazeStartMs
      return
    }

    skipNextSaveRef.current = true
    setEvents(
      events.map((event) => ({
        ...event,
        timestamp_ns: Math.max(event.timestamp_ns + deltaNs, 0),
      })),
    )
    previousTimelineGazeStartMsRef.current = gazeStartMs
  }, [events, gazeStartMs, setEvents])

  React.useEffect(() => {
    if (!eventsDirectoryHandle) {
      return
    }

    const nextEventsCsv = serializeEventsCsv(events)

    if (nextEventsCsv === persistedEventsCsvRef.current) {
      skipNextSaveRef.current = false
      return
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    let cancelled = false

    const syncEventsFile = async () => {
      setIsSaving(true)
      setSaveError(null)

      try {
        await writeEventsCsv(eventsDirectoryHandle, events)
        persistedEventsCsvRef.current = nextEventsCsv
      } catch (error) {
        if (!cancelled) {
          const nextError =
            error instanceof Error ? error : new Error('Failed to update events.csv')
          setSaveError(nextError)
          console.error('Failed to update events.csv:', nextError)
        }
      } finally {
        if (!cancelled) {
          setIsSaving(false)
        }
      }
    }

    void syncEventsFile()

    return () => {
      cancelled = true
    }
  }, [events, eventsDirectoryHandle])

  return { isLoading, isSaving, loadError, saveError }
}
