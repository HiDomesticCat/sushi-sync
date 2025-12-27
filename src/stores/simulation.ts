import { writable, derived, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { SimulationFrame, CustomerConfig } from '../types';
import { customerConfigStore } from './config';

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
  
  // Calculate seat utilization (average over all frames)
  let totalSeatFrames = 0;
  let occupiedSeatFrames = 0;
  
  frames.forEach(frame => {
    if (frame.seats) {
      totalSeatFrames += frame.seats.length;
      occupiedSeatFrames += frame.seats.filter(seat => seat.occupiedBy !== null).length;
    }
  });
  
  const seatUtilization = totalSeatFrames > 0 ? (occupiedSeatFrames / totalSeatFrames) * 100 : 0;
  
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
  // The CSV header must match what src-tauri/src/parser.rs expects:
  // id, arrival_time, type (skipped), party_size, baby_chair_count, wheelchair_count, est_dining_time
  let csvContent = "id,arrival_time,type,party_size,baby_chair_count,wheelchair_count,est_dining_time\n";
  
  customerConfig.forEach(customer => {
    // Note: 'type' is at index 2 and is skipped by the Rust parser, but we include a placeholder
    csvContent += `${customer.id},${customer.arrivalTime},${customer.type},${customer.partySize},${customer.babyChairCount},${customer.wheelchairCount},${customer.estDiningTime}\n`;
  });
  
  console.log("Sending CSV to Rust:", csvContent);
  
  simulationStore.update(s => ({ ...s, loading: true, error: null }));
  try {
    // Step A: Load customer data into store first
    const customers = await invoke<any[]>('load_customers', { csvContent });
    const mappedCustomers: CustomerConfig[] = customers.map(c => ({
      id: c.id,
      familyId: c.family_id,
      arrivalTime: c.arrival_time,
      type: c.type,
      partySize: c.party_size,
      babyChairCount: c.baby_chair_count,
      wheelchairCount: c.wheelchair_count,
      estDiningTime: c.est_dining_time
    }));
    customerConfigStore.set(mappedCustomers);

    // Step B: Start simulation
    const seatConfigJson = JSON.stringify(seatConfig);
    const frames = await invoke<SimulationFrame[]>('start_simulation', { csvContent, seatConfigJson });
    console.log("Rust simulation finished, frames:", frames.length);
    
    if (frames.length > 0) {
      loadSimulationFrames(frames);
    }
    
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
  const store = get(simulationStore);
  if (store.frames.length === 0) return null;
  
  // Find the frame that is closest to the timestamp without exceeding it
  let bestFrame = store.frames[0];
  
  for (let i = 0; i < store.frames.length; i++) {
    if (store.frames[i].timestamp <= timestamp) {
      bestFrame = store.frames[i];
    } else {
      break;
    }
  }
  
  return bestFrame;
}

export const actions = {
  startSimulation: async (csvContent: string, seatConfig: any[]) => {
    simulationStore.update(s => ({ ...s, loading: true, error: null }));
    try {
      // Step A: Load customer data into store first
      // This ensures getCustomerInfo in components can find the data
      console.log("Loading customers...");
      const customers = await invoke<any[]>('load_customers', { csvContent });
      
      // Map Rust snake_case to Frontend camelCase
      const mappedCustomers: CustomerConfig[] = customers.map(c => ({
        id: c.id,
        familyId: c.family_id,
        arrivalTime: c.arrival_time,
        type: c.type,
        partySize: c.party_size,
        babyChairCount: c.baby_chair_count,
        wheelchairCount: c.wheelchair_count,
        estDiningTime: c.est_dining_time
      }));
      
      customerConfigStore.set(mappedCustomers);

      // Step B: Start simulation
      console.log("Starting simulation...");
      const seatConfigJson = JSON.stringify(seatConfig);
      const frames = await invoke<SimulationFrame[]>('start_simulation', { csvContent, seatConfigJson });
      
      console.log("Rust simulation finished, frames:", frames.length);
      if (frames.length > 0) {
        simulationStore.update(s => ({
          ...s,
          frames: frames,
          currentFrameIndex: 0,
          loading: false
        }));
      } else {
        simulationStore.update(s => ({ ...s, loading: false }));
      }
    } catch (err) {
      console.error("Simulation failed:", err);
      simulationStore.update(s => ({ ...s, loading: false, error: String(err) }));
      alert("Error: " + String(err));
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
