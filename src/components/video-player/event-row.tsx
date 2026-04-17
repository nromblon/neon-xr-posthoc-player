import React from 'react'

import type { Event as AnnotationEvent } from '@/types/annotations'

interface EventRowProps {
  draftName: string
  editingEventName: string | null
  eventName: string
  eventNameColumnWidthPx: number
  eventItems: Array<AnnotationEvent>
  isLocked: boolean
  onCommitEventName: (eventName: string) => void
  onDeleteEvent: (
    pointerEvent: React.MouseEvent<HTMLDivElement>,
    eventItem: AnnotationEvent,
  ) => void
  onSetDraftName: (nextName: string) => void
  onStartEditingEvent: (eventName: string) => void
  onStopEditingEvent: () => void
  onTimelinePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onTimelinePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  playhead: React.ReactNode
  safeDuration: number
}

export const EventRow: React.FC<EventRowProps> = ({
  draftName,
  editingEventName,
  eventName,
  eventNameColumnWidthPx,
  eventItems,
  isLocked,
  onCommitEventName,
  onDeleteEvent,
  onSetDraftName,
  onStartEditingEvent,
  onStopEditingEvent,
  onTimelinePointerDown,
  onTimelinePointerMove,
  playhead,
  safeDuration,
}) => {
  return (
    <div
      className="grid min-h-12 border-b"
      style={{
        gridTemplateColumns: `${eventNameColumnWidthPx}px minmax(0, 1fr)`,
      }}
    >
      <div className="border-r px-4 py-3 text-sm">
        {editingEventName === eventName ? (
          <input
            autoFocus
            value={draftName}
            onBlur={() => onCommitEventName(eventName)}
            onChange={(inputEvent) => onSetDraftName(inputEvent.target.value)}
            onKeyDown={(keyboardEvent) => {
              if (keyboardEvent.key === 'Enter') {
                onCommitEventName(eventName)
              }

              if (keyboardEvent.key === 'Escape') {
                onStopEditingEvent()
              }
            }}
            className="w-full rounded-sm border bg-background px-2 py-1 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : (
          <button
            type="button"
            onClick={() => onStartEditingEvent(eventName)}
            disabled={isLocked}
            className={`w-full truncate text-left ${
              isLocked
                ? 'cursor-not-allowed text-muted-foreground'
                : 'cursor-text'
            }`}
            title={
              isLocked ? 'This event name is locked' : 'Click to rename event'
            }
          >
            {eventName}
          </button>
        )}
      </div>
      <div className="relative px-4 py-3">
        <div
          className="relative h-7 cursor-pointer rounded-sm border bg-muted/10"
          onPointerDown={onTimelinePointerDown}
          onPointerMove={onTimelinePointerMove}
        >
          {eventItems.map((eventItem) => {
            const eventTimeSeconds = Math.min(
              Math.max(eventItem.timestamp_ns / 1_000_000_000, 0),
              safeDuration,
            )
            const eventLeft = `${(eventTimeSeconds / safeDuration) * 100}%`

            return (
              <div
                key={`${eventItem.name}-${eventItem.timestamp_ns}`}
                className="absolute inset-y-0 flex -translate-x-1/2 items-center"
                style={{ left: eventLeft }}
                onContextMenu={(pointerEvent) =>
                  onDeleteEvent(pointerEvent, eventItem)
                }
                title={
                  isLocked ? eventItem.name : 'Right-click to delete this event'
                }
              >
                <div className="h-2 w-2 rotate-45 border border-foreground/70 bg-background" />
              </div>
            )
          })}
          {playhead}
        </div>
      </div>
    </div>
  )
}
