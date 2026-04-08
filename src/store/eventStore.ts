import { create } from 'zustand'
import { Event } from '../types/annotations'

interface EventState {
    events: Event[];
    addEvent: (event: Event) => void;
    setEvents: (events: Event[]) => void;
    removeEvent: (timestamp_ns: number) => void;
    removeEvents: () => void;
}

export const useEventStore = create<EventState>((set) => ({
    events: [],
    addEvent: (event: Event) => set((state) => ({ events: [...state.events, event] })),
    setEvents: (events: Event[]) => set({ events }),
    removeEvent: (timestamp_ns: number) => set((state) => ({ events: state.events.filter(event => event.timestamp_ns !== timestamp_ns) })),
    removeEvents: () => set({ events: [] }),
}))
