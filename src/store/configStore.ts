import { create } from 'zustand'
import type { SensorOffsetValues } from '@/lib/config-file'

interface ConfigState {
  gazeStartTime: number
  sensorOffsets: SensorOffsetValues
  setGazeStartTime: (gazeStartMs: number) => void
  setSensorOffsets: (offsets: SensorOffsetValues) => void
  setRotationOffset: (
    axis: keyof SensorOffsetValues['rotationDeg'],
    value: number,
  ) => void
  setTranslationOffset: (
    axis: keyof SensorOffsetValues['translationMm'],
    value: number,
  ) => void
}

export const useConfigStore = create<ConfigState>((set) => ({
  gazeStartTime: 0,
  sensorOffsets: {
    translationMm: { x: 0, y: 0, z: 0 },
    rotationDeg: { x: 0, y: 0, z: 0 },
  },
  setGazeStartTime: (gazeStartMs) => set({ gazeStartTime: gazeStartMs }),
  setSensorOffsets: (sensorOffsets) => set({ sensorOffsets }),
  setTranslationOffset: (axis, value) =>
    set((state) => ({
      sensorOffsets: {
        ...state.sensorOffsets,
        translationMm: { ...state.sensorOffsets.translationMm, [axis]: value },
      },
    })),
  setRotationOffset: (axis, value) =>
    set((state) => ({
      sensorOffsets: {
        ...state.sensorOffsets,
        rotationDeg: { ...state.sensorOffsets.rotationDeg, [axis]: value },
      },
    })),
}))
