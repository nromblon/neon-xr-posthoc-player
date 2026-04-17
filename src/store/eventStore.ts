import { create } from 'zustand'
import type { SensorOffsetValues } from '@/lib/config-file'
import type { Event } from '../types/annotations'

// TODO: refactor to split into separate stores for events vs config, and use immer for immutability

interface EventState {
  eventOriginTimestampNs: number
  events: Array<Event>
  gazeStartTime: number
  recordingId: string
  addEvent: (event: Event) => void
  removeEvent: (timestamp_ns: number) => void
  removeEvents: () => void
  renameEvent: (oldName: string, newName: string) => void
  sensorOffsets: SensorOffsetValues
  setEvents: (events: Array<Event>) => void
  setRotationOffset: (
    axis: keyof SensorOffsetValues['rotationDeg'],
    value: number,
  ) => void
  setSensorOffsets: (offsets: SensorOffsetValues) => void
  setRecordingId: (recordingId: string) => void
  setTranslationOffset: (
    axis: keyof SensorOffsetValues['translationMm'],
    value: number,
  ) => void
  setGazeStartTime: (timestamp_ns: number) => void
  setEventOriginTimestampNs: (timestamp_ns: number) => void
}

export const useEventStore = create<EventState>((set) => ({
  recordingId: '',
  events: [],
  gazeStartTime: 0,
  eventOriginTimestampNs: 0,
  sensorOffsets: {
    translationMm: { x: 0, y: 0, z: 0 },
    rotationDeg: { x: 0, y: 0, z: 0 },
  },
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
  setSensorOffsets: (sensorOffsets: SensorOffsetValues) => set({ sensorOffsets }),
  setTranslationOffset: (axis, value) =>
    set((state) => ({
      sensorOffsets: {
        ...state.sensorOffsets,
        translationMm: {
          ...state.sensorOffsets.translationMm,
          [axis]: value,
        },
      },
    })),
  setRotationOffset: (axis, value) =>
    set((state) => ({
      sensorOffsets: {
        ...state.sensorOffsets,
        rotationDeg: {
          ...state.sensorOffsets.rotationDeg,
          [axis]: value,
        },
      },
    })),
  setRecordingId: (recordingId: string) => set({ recordingId }),
  setGazeStartTime: (timestamp_ns: number) =>
    set({ gazeStartTime: timestamp_ns }),
  setEventOriginTimestampNs: (timestamp_ns: number) =>
    set({ eventOriginTimestampNs: timestamp_ns }),
}))
