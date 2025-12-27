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

export const isSimulationComplete = derived(simulationStore, $s => $s.frames.length > 0);
export const isSimulationRunning = derived(simulationStore, $s => $s.isPlaying);

// 1. Current Frame (for Visualization)
export const currentFrame = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return null;
  return $store.frames[$store.currentFrameIndex];
});

// 2. All Events (Derived for ExportModal)
export const allEvents = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return [];
  // Use the last frame's logs as the full history
  const lastFrame = $store.frames[$store.frames.length - 1];
  return lastFrame ? lastFrame.events : [];
});

// 3. Stats (Derived for ExportModal)
export const simulationStats = derived(simulationStore, ($store) => {
  const frames = $store.frames;
  if (frames.length === 0) {
    return {
      totalCustomers: 0,
      averageWaitTime: 0,
      averageDiningTime: 0,
      tableUtilization: 0,
      totalFrames: 0,
      totalEvents: 0,
      maxWaitingCustomers: 0,
      totalConflicts: 0,
      duration: 0,
      seatUtilization: 0
    };
  }
  
  // Calculate statistics from frames
  const lastFrame = frames[frames.length - 1];
  const events = lastFrame?.events || [];
  
  // Calculate duration from the last frame's timestamp
  const duration = lastFrame?.timestamp || 0;
  
  // Count conflicts
  const totalConflicts = events.filter(e => e.type === 'CONFLICT').length;
  
  // Find max waiting customers (this would need to be tracked in frames)
  let maxWaitingCustomers = 0;
  frames.forEach(frame => {
    if (frame.waitingQueue && frame.waitingQueue.length > maxWaitingCustomers) {
      maxWaitingCustomers = frame.waitingQueue.length;
    }
  });
  
  // Calculate seat utilization (simplified)
  const totalSeats = lastFrame?.seats?.length || 0;
  let occupiedSeats = 0;
  if (lastFrame?.seats) {
    occupiedSeats = lastFrame.seats.filter(seat => seat.occupiedBy !== null).length;
  }
  const seatUtilization = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0;
  
  // Calculate average wait time (simplified)
  let totalWaitTime = 0;
  let seatedCustomers = 0;
  events.forEach(event => {
    if (event.type === 'SEATED') {
      seatedCustomers++;
      // This is a simplification - actual wait time would need to be tracked
      totalWaitTime += event.timestamp;
    }
  });
  const averageWaitTime = seatedCustomers > 0 ? totalWaitTime / seatedCustomers : 0;
  
  return {
    totalCustomers: 0, // This should be calculated from customer data
    averageWaitTime,
    averageDiningTime: 0, // This would need to be tracked in frames
    tableUtilization: seatUtilization,
    totalFrames: frames.length,
    totalEvents: events.length,
    maxWaitingCustomers,
    totalConflicts,
    duration,
    seatUtilization
  };
});

// Helper functions for Header.svelte
export async function runSimulation(seatConfig: any[], customerConfig: any[]) {
  // Convert configs to CSV format for Rust backend
  let csvContent = "family_id,customer_id,customer_type,arrival_time,party_size,needs_baby_chair,needs_wheelchair,estimated_dining_time\n";
  
  customerConfig.forEach(customer => {
    csvContent += `${customer.familyId},${customer.id},${customer.type},${customer.arrivalTime},${customer.partySize},${customer.needsBabyChair ? 1 : 0},${customer.needsWheelchair ? 1 : 0},${customer.estimatedDiningTime}\n`;
  });
  
  simulationStore.update(s => ({ ...s, loading: true, error: null }));
  try {
    // Pass seatConfig as JSON string or object
    const seatConfigJson = JSON.stringify(seatConfig);
    const frames = await invoke<SimulationFrame[]>('start_simulation', { csvContent, seatConfigJson });
    console.log("Rust simulation finished, frames:", frames.length);
    return frames;
  } catch (err) {
    console.error("Simulation failed:", err);
    simulationStore.update(s => ({ ...s, loading: false, error: String(err) }));
    return [];
  }
}

export function loadSimulationFrames(frames: SimulationFrame[]) {
  simulationStore.update(s => ({
    ...s,
    frames: frames,
    currentFrameIndex: 0,
    loading: false
  }));
}

export function resetSimulation() {
  simulationStore.update(s => ({
    ...s,
    frames: [],
    currentFrameIndex: 0,
    isPlaying: false,
    loading: false,
    error: null
  }));
}

export function getFrameAtTime(timestamp: number) {
  const store = simulationStore.get();
  if (store.frames.length === 0) return null;
  
  // Find the frame that is closest to the timestamp
  let closestFrame = store.frames[0];
  let minDiff = Math.abs(store.frames[0].timestamp - timestamp);
  
  for (let i = 1; i < store.frames.length; i++) {
    const diff = Math.abs(store.frames[i].timestamp - timestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closestFrame = store.frames[i];
    }
  }
  
  return closestFrame;
}

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
