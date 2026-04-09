import { create } from 'zustand'
import { Event } from '../types/annotations'

interface EventState {
    events: Event[];
    gazeStartTime: number;
    eventOriginTimestampNs: number;
    addEvent: (event: Event) => void;
    setEvents: (events: Event[]) => void;
    renameEvent: (oldName: string, newName: string) => void;
    removeEvent: (timestamp_ns: number) => void;
    removeEvents: () => void;
    setGazeStartTime: (timestamp_ns: number) => void;
    setEventOriginTimestampNs: (timestamp_ns: number) => void;
}

export const useEventStore = create<EventState>((set) => ({
    events: [],
    gazeStartTime: 0,
    eventOriginTimestampNs: 0,
    addEvent: (event: Event) => 
        set((state) => {
            const { events } = state

            for (let i = 0; i < events.length; i++) {
                const currentEvent = events[i]

                if (
                    currentEvent.name === event.name &&
                    currentEvent.timestamp_ns === event.timestamp_ns
                ) {
                    return state
                }
            }

            return { events: [...events, event] }
        }),
    setEvents: (events: Event[]) => set({ events }),
    renameEvent: (oldName: string, newName: string) => set((state) => ({
        events: state.events.map((event) => 
            event.name === oldName ? { ...event, name: newName } : event
        )
    })),
    removeEvent: (timestamp_ns: number) => set((state) => ({ events: state.events.filter(event => event.timestamp_ns !== timestamp_ns) })),
    removeEvents: () => set({ events: [] }),
    setGazeStartTime: (timestamp_ns: number) => set({ gazeStartTime: timestamp_ns }),
    setEventOriginTimestampNs: (timestamp_ns: number) => set({ eventOriginTimestampNs: timestamp_ns }),
}))
