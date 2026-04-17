import { create } from 'zustand'
import type { Event } from '../types/annotations'

interface EventState {
  recordingId: string
  events: Array<Event>
  gazeStartTime: number
  eventOriginTimestampNs: number
  addEvent: (event: Event) => void
  setEvents: (events: Array<Event>) => void
  renameEvent: (oldName: string, newName: string) => void
  removeEvent: (timestamp_ns: number) => void
  removeEvents: () => void
  setRecordingId: (recordingId: string) => void
  setGazeStartTime: (timestamp_ns: number) => void
  setEventOriginTimestampNs: (timestamp_ns: number) => void
}

export const useEventStore = create<EventState>((set) => ({
  recordingId: '',
  events: [],
  gazeStartTime: 0,
  eventOriginTimestampNs: 0,
  addEvent: (event: Event) =>
    set((state) => {
      const { events } = state

      for (const currentEvent of events) {
        if (
          currentEvent.name === event.name &&
          currentEvent.timestamp_ns === event.timestamp_ns
        ) {
          return state
        }
      }

      return { events: [...events, event] }
    }),
  setEvents: (events: Array<Event>) => set({ events }),
  renameEvent: (oldName: string, newName: string) =>
    set((state) => ({
      events: state.events.map((event) =>
        event.name === oldName ? { ...event, name: newName } : event,
      ),
    })),
  removeEvent: (timestamp_ns: number) =>
    set((state) => ({
      events: state.events.filter(
        (event) => event.timestamp_ns !== timestamp_ns,
      ),
    })),
  removeEvents: () => set({ events: [] }),
  setRecordingId: (recordingId: string) => set({ recordingId }),
  setGazeStartTime: (timestamp_ns: number) =>
    set({ gazeStartTime: timestamp_ns }),
  setEventOriginTimestampNs: (timestamp_ns: number) =>
    set({ eventOriginTimestampNs: timestamp_ns }),
}))
