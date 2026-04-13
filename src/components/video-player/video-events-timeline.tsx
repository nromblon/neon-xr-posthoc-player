import { SearchIcon } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEventStore } from '@/store/eventStore'
import type { Event as AnnotationEvent } from '@/types/annotations'
import { EventRow } from './event-row'
import { Badge } from "@/components/ui/badge"
import { Spinner } from '../ui/spinner'

const TIMELINE_PLAYHEAD = '#6366f1'
const LOCKED_EVENT_NAMES = new Set(['recording.begin', 'recording.end'])

export interface VideoEventsTimelineProps {
  currentTime: number
  duration: number
  eventNameColumnWidthPx: number
  events: AnnotationEvent[]
  formatTime: (seconds: number) => string
  isSaving: boolean
  onSeek: (nextTime: number) => void
}

export const VideoEventsTimeline: React.FC<VideoEventsTimelineProps> = ({
  currentTime,
  duration,
  eventNameColumnWidthPx,
  events,
  formatTime,
  isSaving,
  onSeek,
}) => {
  const addEvent = useEventStore((state) => state.addEvent)
  const gazeStartTime = useEventStore((state) => state.gazeStartTime)
  const recordingId = useEventStore((state) => state.recordingId)
  const eventOriginTimestampNs = useEventStore(
    (state) => state.eventOriginTimestampNs,
  )
  const renameEvent = useEventStore((state) => state.renameEvent)
  const removeEvent = useEventStore((state) => state.removeEvent)
  const [addingEvent, setAddingEvent] = React.useState(false)
  const [editingEventName, setEditingEventName] = React.useState<string | null>(
    null,
  )
  const [draftName, setDraftName] = React.useState('')

  const groupedEvents = Array.from(
    events.reduce((groups, eventItem) => {
      const existingGroup = groups.get(eventItem.name) ?? []
      existingGroup.push(eventItem)
      groups.set(eventItem.name, existingGroup)
      return groups
    }, new Map<string, AnnotationEvent[]>()),
  )

  const timelineGridTemplate = `${eventNameColumnWidthPx}px minmax(0, 1fr)`
  const safeDuration = duration > 0 ? duration : 1
  const playheadPercent =
    Math.min(Math.max(currentTime / safeDuration, 0), 1) * 100
  const majorTickCount = Math.max(
    6,
    Math.min(12, Math.floor(safeDuration / 10) + 1),
  )
  const tickMarks = Array.from({ length: majorTickCount }, (_, index) => {
    const ratio = majorTickCount === 1 ? 0 : index / (majorTickCount - 1)
    const timeAtTick = ratio * safeDuration
    return {
      id: index,
      label: formatTime(timeAtTick).replace(/^00:/, ''),
      left: `${ratio * 100}%`,
    }
  })
  const denseTicks = Array.from({ length: 60 }, (_, index) => ({
    id: index,
    left: `${(index / 59) * 100}%`,
    tall: index % 5 === 0,
  }))
  const pupilWave = Array.from({ length: 120 }, (_, index) => {
    const normalized = index / 119
    const base = 0.55 + 0.18 * Math.sin(normalized * 18)
    const spikes =
      index % 17 === 0 || index % 29 === 0
        ? 0.18
        : index % 11 === 0
          ? -0.2
          : 0
    return {
      id: index,
      height: `${Math.max(18, Math.min(92, (base + spikes) * 100))}%`,
      left: `${normalized * 100}%`,
    }
  })
  const audioWave = Array.from({ length: 120 }, (_, index) => {
    const normalized = index / 119
    const pulse =
      index === 36 || index === 58 || index === 105
        ? 0.65
        : index % 23 === 0
          ? 0.2
          : 0.06
    return {
      id: index,
      height: `${Math.max(6, pulse * 100)}%`,
      left: `${normalized * 100}%`,
    }
  })

  const renderPlayhead = () => (
    <div
      className="pointer-events-none absolute inset-y-0 z-20"
      style={{ left: `${playheadPercent}%` }}
    >
      <div
        className="absolute inset-y-0 -translate-x-1/2 border-l-2"
        style={{ borderColor: TIMELINE_PLAYHEAD }}
      />
    </div>
  )

  const seekFromTimelinePointer = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width <= 0) {
      return
    }

    const ratio = Math.min(
      Math.max((event.clientX - bounds.left) / bounds.width, 0),
      1,
    )

    onSeek(ratio * safeDuration)
  }

  const handleTimelinePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    seekFromTimelinePointer(event)
  }

  const handleTimelinePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if ((event.buttons & 1) !== 1) {
      return
    }

    seekFromTimelinePointer(event)
  }

  const startEditingEvent = (eventName: string) => {
    if (LOCKED_EVENT_NAMES.has(eventName)) {
      return
    }

    setEditingEventName(eventName)
    setDraftName(eventName)
  }

  const stopEditingEvent = () => {
    setEditingEventName(null)
    setDraftName('')
  }

  const commitEventName = (eventName: string) => {
    if (LOCKED_EVENT_NAMES.has(eventName)) {
      stopEditingEvent()
      return
    }

    const nextName = draftName.trim()
    if (nextName && nextName !== eventName) {
      renameEvent(eventName, nextName)
    }
    stopEditingEvent()
  }

  const handleAddEvent = () => {
    setAddingEvent(true)
    setDraftName("")
    setEditingEventName("")
  }

  const handleAddEventFinish = () => {
    setAddingEvent(false)
    if (draftName === '') {
      return
    }

    const trimmedName = draftName.trim()
    setDraftName('')

    if (!trimmedName) {
      return
    }

    if (LOCKED_EVENT_NAMES.has(trimmedName)) {
      window.alert(`"${trimmedName}" is reserved and cannot be created manually.`)
      return
    }

    const timelineTimestampNs = Math.round(currentTime * 1_000_000_000)
    const gazeStartOffsetNs = Math.round(gazeStartTime * 1_000_000)

    addEvent({
      recording_id: recordingId,
      type: "posthoc player",
      name: trimmedName,
      timestamp_ns: timelineTimestampNs,
      utx_timestamp_ns: Math.max(
        timelineTimestampNs - gazeStartOffsetNs + eventOriginTimestampNs,
        0,
      ),
    })
  }

  const handleDeleteEvent = (
    pointerEvent: React.MouseEvent<HTMLDivElement>,
    eventItem: AnnotationEvent,
  ) => {
    pointerEvent.preventDefault()
    pointerEvent.stopPropagation()

    if (LOCKED_EVENT_NAMES.has(eventItem.name)) {
      return
    }

    const shouldDelete = window.confirm(
      `Delete "${eventItem.name}" at ${formatTime(
        eventItem.timestamp_ns / 1_000_000_000,
      )}?`,
    )

    if (!shouldDelete) {
      return
    }

    removeEvent(eventItem.timestamp_ns)
  }

  return (
    <div className="p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleAddEvent}
          >
            + Add Event
          </Button>
          {isSaving ? (
            <Badge variant={"secondary"}>
              <Spinner data-icon="inline-start" />
              Saving Events
            </Badge>
          ) : null}
        </div>
        <InputGroup className="w-44">
          <SearchIcon className="ml-2 size-4 text-muted-foreground" />
          <InputGroupInput placeholder="Search events..." className="text-xs" />
        </InputGroup>
      </div>

      <div className="overflow-hidden rounded-md border bg-background">
        <div
          className="grid border-b bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: timelineGridTemplate }}
        >
          <div className="border-r px-4 py-2">Track</div>
          <div className="relative px-4 py-2">
            <div className="relative h-4">
              {tickMarks.map((tick) => (
                <div
                  key={tick.id}
                  className="absolute top-0 -translate-x-1/2 tabular-nums"
                  style={{ left: tick.left }}
                >
                  {tick.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <ScrollArea className="h-80">
          <div>
            {/* <div
              className="sticky top-0 z-10 grid min-h-14 border-b bg-background"
              style={{ gridTemplateColumns: timelineGridTemplate }}
            >
              <div className="border-r px-4 py-3 text-sm font-medium">
                Thumbnail
              </div>
              <div className="relative px-4 py-3">
                <div
                  className="relative h-10 cursor-pointer overflow-hidden rounded-sm border bg-muted/20"
                  onPointerDown={handleTimelinePointerDown}
                  onPointerMove={handleTimelinePointerMove}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.06)_0_1px,transparent_1px_100%)] bg-[length:48px_100%]" />
                  <div className="absolute inset-y-0 left-0 right-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(0,0,0,0.03))]" />
                  {denseTicks.map((tick) => (
                    <div
                      key={tick.id}
                      className="absolute bottom-0 w-px -translate-x-1/2 bg-foreground/60"
                      style={{
                        left: tick.left,
                        height: tick.tall ? '70%' : '38%',
                        opacity: tick.tall ? 0.9 : 0.45,
                      }}
                    />
                  ))}
                  {renderPlayhead()}
                </div>
              </div>
            </div> */}

            {/* <div
              className="grid min-h-20 border-b"
              style={{ gridTemplateColumns: timelineGridTemplate }}
            >
              <div className="border-r px-4 py-3 text-sm font-medium">
                Pupil diameter
              </div>
              <div className="relative px-4 py-3">
                <div
                  className="relative h-14 cursor-pointer overflow-hidden rounded-sm border bg-muted/10"
                  onPointerDown={handleTimelinePointerDown}
                  onPointerMove={handleTimelinePointerMove}
                >
                  <div className="absolute inset-x-0 top-1/2 border-t border-border/70" />
                  {pupilWave.map((point) => (
                    <div
                      key={point.id}
                      className="absolute bottom-0 w-px -translate-x-1/2 bg-foreground/80"
                      style={{ left: point.left, height: point.height }}
                    />
                  ))}
                  {renderPlayhead()}
                </div>
              </div>
            </div> */}
{/* 
            <div
              className="grid min-h-20 border-b"
              style={{ gridTemplateColumns: timelineGridTemplate }}
            >
              <div className="border-r px-4 py-3 text-sm font-medium">
                Audio
              </div>
              <div className="relative px-4 py-3">
                <div
                  className="relative h-14 cursor-pointer overflow-hidden rounded-sm border bg-muted/10"
                  onPointerDown={handleTimelinePointerDown}
                  onPointerMove={handleTimelinePointerMove}
                >
                  <div className="absolute inset-x-0 top-1/2 border-t border-border/70" />
                  {audioWave.map((point) => (
                    <div
                      key={point.id}
                      className="absolute top-1/2 w-px -translate-x-1/2 -translate-y-1/2 bg-foreground/75"
                      style={{ left: point.left, height: point.height }}
                    />
                  ))}
                  {renderPlayhead()}
                </div>
              </div>
            </div> */}

            <div
              className="grid min-h-14 border-b"
              style={{ gridTemplateColumns: timelineGridTemplate }}
            >
              <div className="border-r px-4 py-3 text-sm font-medium">
                Events
              </div>
              <div className="relative px-4 py-3">
                <div
                  className="relative h-8 cursor-pointer rounded-sm border bg-muted/10"
                  onPointerDown={handleTimelinePointerDown}
                  onPointerMove={handleTimelinePointerMove}
                >
                  {denseTicks.map((tick) => (
                    <div
                      key={tick.id}
                      className="absolute inset-y-0 w-px -translate-x-1/2 bg-border/70"
                      style={{ left: tick.left }}
                    />
                  ))}
                  {events.map((eventItem) => {
                    const eventTimeSeconds = Math.min(
                      Math.max(eventItem.timestamp_ns / 1_000_000_000, 0),
                      safeDuration,
                    )
                    const eventLeft = `${(eventTimeSeconds / safeDuration) * 100}%`

                    return (
                      <div
                        key={`head-${eventItem.name}-${eventItem.timestamp_ns}`}
                        className="absolute inset-y-0 flex -translate-x-1/2 items-center"
                        style={{ left: eventLeft }}
                        onContextMenu={(pointerEvent) =>
                          handleDeleteEvent(pointerEvent, eventItem)
                        }
                        title={
                          LOCKED_EVENT_NAMES.has(eventItem.name)
                            ? eventItem.name
                            : 'Right-click to delete this event'
                        }
                      >
                        <div className="h-2 w-2 rotate-45 border border-foreground/70 bg-background" />
                      </div>
                    )
                  })}
                  {renderPlayhead()}
                </div>
              </div>
            </div>

            {groupedEvents.map(([eventName, eventItems]) => (
              <EventRow
                key={eventName}
                draftName={draftName}
                editingEventName={editingEventName}
                eventName={eventName}
                eventNameColumnWidthPx={eventNameColumnWidthPx}
                eventItems={eventItems}
                isLocked={LOCKED_EVENT_NAMES.has(eventName)}
                onCommitEventName={commitEventName}
                onDeleteEvent={handleDeleteEvent}
                onSetDraftName={setDraftName}
                onStartEditingEvent={startEditingEvent}
                onStopEditingEvent={stopEditingEvent}
                onTimelinePointerDown={handleTimelinePointerDown}
                onTimelinePointerMove={handleTimelinePointerMove}
                playhead={renderPlayhead()}
                safeDuration={safeDuration}
              />
            ))}
            {/* New events get added here  */}
            {addingEvent && (
              <EventRow
                draftName={draftName}
                editingEventName={editingEventName}
                eventName={""}
                eventNameColumnWidthPx={eventNameColumnWidthPx}
                eventItems={[
                  {
                    timestamp_ns: Math.round(currentTime * 1_000_000_000),
                    utx_timestamp_ns: Math.max(
                      Math.round(currentTime * 1_000_000_000) -
                        Math.round(gazeStartTime * 1_000_000) +
                        eventOriginTimestampNs,
                      0,
                    ),
                    name: draftName,
                  } as AnnotationEvent
                ]}
                isLocked={false}
                onCommitEventName={handleAddEventFinish}
                onDeleteEvent={() => {}}
                onSetDraftName={setDraftName}
                onStartEditingEvent={startEditingEvent}
                onStopEditingEvent={stopEditingEvent}
                onTimelinePointerDown={() => {}}
                onTimelinePointerMove={() => {}}
                playhead={renderPlayhead()}
                safeDuration={safeDuration}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
