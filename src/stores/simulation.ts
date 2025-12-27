import { writable, derived, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { SimulationFrame, CustomerConfig } from '../types';
import { customerConfigStore, seatConfigStore } from './config';

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

export const currentFrame = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return null;
  return $store.frames[$store.currentFrameIndex];
});

export const allEvents = derived(simulationStore, ($store) => {
  if ($store.frames.length === 0) return [];
  const lastFrame = $store.frames[$store.frames.length - 1];
  return lastFrame ? lastFrame.events : [];
});

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
  
  const lastFrame = frames[frames.length - 1];
  const events = lastFrame?.events || [];
  const duration = lastFrame?.timestamp || 0;
  const totalConflicts = events.filter(e => e.type === 'CONFLICT').length;
  
  let maxWaitingCustomers = 0;
  frames.forEach(frame => {
    if (frame.waitingQueue && frame.waitingQueue.length > maxWaitingCustomers) {
      maxWaitingCustomers = frame.waitingQueue.length;
    }
  });
  
  let totalSeatFrames = 0;
  let occupiedSeatFrames = 0;
  
  frames.forEach(frame => {
    if (frame.seats) {
      totalSeatFrames += frame.seats.length;
      occupiedSeatFrames += frame.seats.filter(seat => seat.occupiedBy !== null).length;
    }
  });
  
  const seatUtilization = totalSeatFrames > 0 ? (occupiedSeatFrames / totalSeatFrames) * 100 : 0;
  
  let totalWaitTime = 0;
  let seatedCustomers = 0;
  events.forEach(event => {
    if (event.type === 'SEATED') {
      seatedCustomers++;
      totalWaitTime += event.timestamp;
    }
  });
  const averageWaitTime = seatedCustomers > 0 ? totalWaitTime / seatedCustomers : 0;
  
  return {
    totalCustomers: 0,
    averageWaitTime,
    averageDiningTime: 0,
    tableUtilization: seatUtilization,
    totalFrames: frames.length,
    totalEvents: events.length,
    maxWaitingCustomers,
    totalConflicts,
    duration,
    seatUtilization
  };
});

export async function runSimulation(seatConfig: any[], customerConfig: any[]) {
  // CSV format: id, arrival_time, type, party_size, baby_chair_count, wheelchair_count, est_dining_time
  let csvContent = "id,arrival_time,type,party_size,baby_chair_count,wheelchair_count,est_dining_time\n";
  
  customerConfig.forEach(customer => {
    const diningTime = customer.estimatedDiningTime || customer.estDiningTime || 60;
    const id = customer.id || 0;
    const arrival = customer.arrivalTime || 0;
    const type = customer.type || 'INDIVIDUAL';
    const size = customer.partySize || 1;
    const baby = customer.babyChairCount || 0;
    const wheel = customer.wheelchairCount || 0;
    
    csvContent += `${id},${arrival},${type},${size},${baby},${wheel},${diningTime}\n`;
  });
  
  console.log("runSimulation: Sending CSV to Rust:", csvContent);
  
  simulationStore.update(s => ({ ...s, loading: true, error: null }));
  try {
    // 1. Load customers into store
    console.log("runSimulation: Loading customers...");
    const customers = await invoke<any[]>('load_customers', { csvContent });
    console.log("runSimulation: load_customers returned:", customers);
    
    const mappedCustomers: CustomerConfig[] = customers.map(c => ({
      id: Number(c.id),
      familyId: Number(c.family_id),
      arrivalTime: Number(c.arrival_time),
      type: String(c.type_),
      partySize: Number(c.party_size),
      babyChairCount: Number(c.baby_chair_count),
      wheelchairCount: Number(c.wheelchair_count),
      estimatedDiningTime: Number(c.est_dining_time),
      estDiningTime: Number(c.est_dining_time)
    }));
    customerConfigStore.set(mappedCustomers);

    // 2. Run simulation
    console.log("runSimulation: Starting simulation...");
    const seatConfigJson = JSON.stringify(seatConfig);
    const frames = await invoke<SimulationFrame[]>('start_simulation', { csvContent, seatConfigJson });
    
    console.log("runSimulation: Rust returned", frames.length, "frames");
    if (frames.length > 0) {
      loadSimulationFrames(frames);
    }
    
    return frames;
  } catch (err) {
    console.error("runSimulation: Simulation failed:", err);
    const errorMsg = String(err);
    simulationStore.update(s => ({ ...s, loading: false, error: errorMsg }));
    alert("Simulation Error: " + errorMsg);
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
      const seatConfigJson = JSON.stringify(seatConfig);

      // 1. Load customers
      console.log("actions.startSimulation: Loading customers...");
      const customers = await invoke<any[]>('load_customers', { csvContent });
      const mappedCustomers: CustomerConfig[] = customers.map(c => ({
        id: Number(c.id),
        familyId: Number(c.family_id),
        arrivalTime: Number(c.arrival_time),
        type: String(c.type_),
        partySize: Number(c.party_size),
        babyChairCount: Number(c.baby_chair_count),
        wheelchairCount: Number(c.wheelchair_count),
        estDiningTime: Number(c.est_dining_time),
        estimatedDiningTime: Number(c.est_dining_time)
      }));
      customerConfigStore.set(mappedCustomers);

      // 2. Run simulation
      console.log("actions.startSimulation: Calling Rust start_simulation via actions...");
      const frames = await invoke<SimulationFrame[]>('start_simulation', { csvContent, seatConfigJson });
      
      console.log("actions.startSimulation: Rust returned", frames.length, "frames");
      simulationStore.update(s => ({
        ...s,
        frames: frames,
        currentFrameIndex: 0,
        loading: false
      }));
    } catch (err) {
      console.error("actions.startSimulation: Simulation failed:", err);
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
