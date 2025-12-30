import { writable, derived, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { SimulationFrame, CustomerConfig, SeatConfig } from '../types';
import { customerConfigStore, seatConfigStore, exportCustomersToCSV, resourceLimitsStore } from './config';

// ===== State Interface Definition =====
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

// ===== Main Store =====
export const simulationStore = writable<SimulationState>(initialState);

// ===== Derived Stores =====
export const isSimulationComplete = derived(simulationStore, $s => $s.frames.length > 0);
export const isSimulationRunning = derived(simulationStore, $s => $s.isPlaying);

export const currentFrame = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return null;
  return $store.frames[$store.currentFrameIndex];
});

// Get all events (for Log Terminal)
export const allEvents = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return [];
  const events: any[] = [];
  const seen = new Set();
  
  $store.frames.forEach(frame => {
    frame.events.forEach(event => {
      // Generate unique key to avoid duplicate display
      const key = `${event.timestamp}-${event.type}-${event.familyId}`;
      if (!seen.has(key)) {
        events.push(event);
        seen.add(key);
      }
    });
  });
  
  return events.sort((a, b) => a.timestamp - b.timestamp);
});

// Calculate statistics (for Analysis Panel) - OS Oriented Analysis
export const simulationStats = derived(simulationStore, ($store) => {
  const frames = $store.frames;
  const customers = get(customerConfigStore);
  
  if (frames.length === 0 || customers.length === 0) {
    return {
      totalCustomers: 0,
      averageWaitTime: 0,
      averageTurnaroundTime: 0,
      throughput: 0,
      cpuUtilization: 0, // Maps to seat utilization
      maxWaitingCustomers: 0,
      totalConflicts: 0,
      duration: 0,
      seatUtilization: 0
    };
  }
  
  const lastFrame = frames[frames.length - 1];
  const duration = lastFrame?.timestamp || 1;
  
  // 1. Calculate wait time and turnaround time
  let totalWaitTime = 0;
  let totalTurnaroundTime = 0;
  let completedCustomers = 0;
  let maxWaiting = 0;
  let totalConflicts = 0;

  customers.forEach(c => {
    const events = frames.flatMap(f => f.events).filter(e => e.familyId === c.familyId);
    const arrival = events.find(e => e.type === 'ARRIVAL')?.timestamp ?? c.arrivalTime;
    const seated = events.find(e => e.type === 'SEATED')?.timestamp;
    const left = events.find(e => e.type === 'LEFT')?.timestamp;

    if (seated !== undefined) {
      totalWaitTime += (seated - arrival);
      if (left !== undefined) {
        totalTurnaroundTime += (left - arrival);
        completedCustomers++;
      }
    }
    
    // Count conflicts (WAITING event count)
    totalConflicts += events.filter(e => e.type === 'WAITING').length;
  });

  // 2. Calculate peak waiting count
  frames.forEach(f => {
    if (f.waitingQueue.length > maxWaiting) maxWaiting = f.waitingQueue.length;
  });

  // 3. Calculate resource utilization (seats)
  let totalSeatSlots = 0;
  let occupiedSeatSlots = 0;
  frames.forEach(frame => {
    totalSeatSlots += frame.seats.length;
    occupiedSeatSlots += frame.seats.filter(s => s.occupiedBy !== null).length;
  });

  const seatUtilization = (occupiedSeatSlots / Math.max(1, totalSeatSlots)) * 100;
  const throughput = (completedCustomers / duration);

  return {
    totalCustomers: customers.length,
    averageWaitTime: totalWaitTime / Math.max(1, completedCustomers),
    averageTurnaroundTime: totalTurnaroundTime / Math.max(1, completedCustomers),
    throughput,
    cpuUtilization: seatUtilization,
    maxWaitingCustomers: maxWaiting,
    totalConflicts,
    duration,
    seatUtilization
  };
});

// ===== Helper Functions =====

// Get frame at specific timestamp
export function getFrameAtTime(timestamp: number) {
  const store = get(simulationStore);
  if (store.frames.length === 0) return null;
  
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
    ...initialState
  }));
}

// ===== Actions (Core Logic) =====
export const actions = {
  setLoading: (loading: boolean) => {
    simulationStore.update(s => ({ ...s, loading }));
  },

  // Start simulation: Main entry point
  startSimulation: async (csvContent?: string) => {
    simulationStore.update(s => ({ ...s, loading: true, error: null }));
    
    try {
      // 1. Prepare data
      // If no CSV provided, generate from current store
      const finalCsvContent = csvContent || exportCustomersToCSV();
      const seatConfig = get(seatConfigStore);
      const seatConfigJson = JSON.stringify(seatConfig);
      
      console.log("Starting simulation...");

      // 2. Load and parse customer data
      // Use generic <CustomerConfig[]> for automatic camelCase mapping
      const customers = await invoke<CustomerConfig[]>('load_customers', { csvContent: finalCsvContent });
      
      console.log("Customers loaded from backend:", customers.length);
      // Save parsed data back to store
      customerConfigStore.set(customers);

      // 3. Execute simulation
      const limits = get(resourceLimitsStore);
      const frames = await invoke<SimulationFrame[]>('start_simulation', { 
        csvContent: finalCsvContent,
        seatConfigJson,
        babyChairs: limits.babyChairs,
        wheelchairs: limits.wheelchairs
      });

      console.log("Simulation finished:", frames.length, "frames generated.");

      // 4. Update simulation state
      simulationStore.update(s => ({
        ...s,
        frames: frames,
        currentFrameIndex: 0,
        loading: false
      }));

      return frames;

    } catch (err) {
      console.error("Simulation failed:", err);
      const errorMsg = String(err);
      simulationStore.update(s => ({ ...s, loading: false, error: errorMsg }));
      alert("Simulation Error: " + errorMsg);
      return [];
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
  },

  reset: () => {
    resetSimulation();
  }
};

// ===== Compatibility Functions (Deprecated) =====
export async function runSimulation(seatConfig: any[], customerConfig: any[]) {
  console.log("Legacy runSimulation called, redirecting to actions.startSimulation...");
  return await actions.startSimulation();
}
