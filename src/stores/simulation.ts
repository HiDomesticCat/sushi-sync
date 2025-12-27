import { writable, derived } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { SimulationFrame } from '../types';

interface SimulationState {
  frames: SimulationFrame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: SimulationState = {
  frames: [],
  currentFrameIndex: 0,
  isPlaying: false,
  loading: false,
  error: null
};

export const simulationStore = writable<SimulationState>(initialState);

// 1. Current Frame (for Visualization)
export const currentFrame = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return null;
  return $store.frames[$store.currentFrameIndex];
});

// 2. All Events (Derived for ExportModal)
export const allEvents = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return [];
  // In our OS simulation, logs accumulate. The last frame has the full history.
  const lastFrame = $store.frames[$store.frames.length - 1];
  return lastFrame ? lastFrame.logs : [];
});

// 3. Stats (Derived for ExportModal)
export const simulationStats = derived(simulationStore, ($store) => {
  const frames = $store.frames;
  return {
    totalCustomers: 0, // Placeholder: implement parsing logic if needed
    averageWaitTime: 0,
    averageDiningTime: 0,
    tableUtilization: 0,
    totalFrames: frames.length
  };
});

export const actions = {
  startSimulation: async (csvContent: string) => {
    simulationStore.update(s => ({ ...s, loading: true, error: null }));
    try {
      const frames = await invoke<SimulationFrame[]>('start_simulation', { csvContent });
      console.log("Rust simulation finished, frames:", frames.length);
      simulationStore.update(s => ({
        ...s,
        frames: frames,
        currentFrameIndex: 0,
        loading: false
      }));
    } catch (err) {
      console.error("Simulation failed:", err);
      simulationStore.update(s => ({ ...s, loading: false, error: String(err) }));
    }
  },
  setFrameIndex: (index: number) => {
    simulationStore.update(s => {
      const safeIndex = Math.max(0, Math.min(index, s.frames.length - 1));
      return { ...s, currentFrameIndex: safeIndex };
    });
  },
  togglePlayback: () => {
    simulationStore.update(s => ({ ...s, isPlaying: !s.isPlaying }));
  }
};
