import { writable, derived } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core'; // Tauri v2 import
import type { SimulationFrame } from '../types';

// Define the store state
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

// Derived store for the current frame to visualize
export const currentFrame = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return null;
  return $store.frames[$store.currentFrameIndex];
});

// Actions
export const actions = {
  // Call the Rust Backend!
  startSimulation: async (csvContent: string) => {
    simulationStore.update(s => ({ ...s, loading: true, error: null }));
    try {
      // Invoke the Tauri command defined in src-tauri/src/main.rs
      const frames = await invoke<SimulationFrame[]>('start_simulation', { csvContent });
      
      console.log("Rust simulation finished, received frames:", frames.length);
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
