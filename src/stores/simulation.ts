import { writable, derived } from 'svelte/store';
import type { SimulationFrame, Seat, Customer, SimulationEvent } from '../types';

interface SimulationState {
  frames: SimulationFrame[];
  isRunning: boolean;
  isComplete: boolean;
  error: string | null;
}

export const simulationStore = writable<SimulationState>({
  frames: [],
  isRunning: false,
  isComplete: false,
  error: null
});

// Derived store to get frame at specific timestamp
export const getFrameAtTime = (timestamp: number) => derived(
  simulationStore,
  $store => $store.frames.find(f => f.timestamp === timestamp) || null
);

// Derived store to get current frame based on playback time
export const currentFrame = derived(
  [simulationStore],
  ([$simulation]) => {
    if ($simulation.frames.length === 0) return null;
    return $simulation.frames[0]; // Will be updated with playback integration
  }
);

// Derived store to get simulation statistics
export const simulationStats = derived(
  simulationStore,
  $store => {
    if ($store.frames.length === 0) {
      return {
        totalFrames: 0,
        totalEvents: 0,
        maxWaitingCustomers: 0,
        totalConflicts: 0,
        averageWaitTime: 0,
        duration: 0
      };
    }

    const totalFrames = $store.frames.length;
    const totalEvents = $store.frames.reduce((sum, frame) => sum + frame.events.length, 0);
    const maxWaitingCustomers = Math.max(...$store.frames.map(f => f.waitingQueue.length));
    const totalConflicts = $store.frames.reduce(
      (sum, frame) => sum + frame.events.filter(e => e.type === 'CONFLICT').length, 
      0
    );
    
    const lastFrame = $store.frames[$store.frames.length - 1];
    const duration = lastFrame ? lastFrame.timestamp : 0;

    // Calculate average wait time (simplified)
    const arrivalEvents = $store.frames.flatMap(f => f.events.filter(e => e.type === 'ARRIVAL'));
    const seatedEvents = $store.frames.flatMap(f => f.events.filter(e => e.type === 'SEATED'));
    
    let totalWaitTime = 0;
    let waitingCustomers = 0;
    
    arrivalEvents.forEach(arrival => {
      const seated = seatedEvents.find(s => s.familyId === arrival.familyId);
      if (seated) {
        totalWaitTime += seated.timestamp - arrival.timestamp;
        waitingCustomers++;
      }
    });

    const averageWaitTime = waitingCustomers > 0 ? totalWaitTime / waitingCustomers : 0;

    return {
      totalFrames,
      totalEvents,
      maxWaitingCustomers,
      totalConflicts,
      averageWaitTime,
      duration
    };
  }
);

// Helper functions
export function startSimulation() {
  simulationStore.update(state => ({
    ...state,
    isRunning: true,
    isComplete: false,
    error: null
  }));
}

export function stopSimulation() {
  simulationStore.update(state => ({
    ...state,
    isRunning: false
  }));
}

export function completeSimulation() {
  simulationStore.update(state => ({
    ...state,
    isRunning: false,
    isComplete: true
  }));
}

export function resetSimulation() {
  simulationStore.update(state => ({
    ...state,
    frames: [],
    isRunning: false,
    isComplete: false,
    error: null
  }));
}

export function setSimulationError(error: string) {
  simulationStore.update(state => ({
    ...state,
    isRunning: false,
    error
  }));
}

export function loadSimulationFrames(frames: SimulationFrame[]) {
  // Sort frames by timestamp to ensure correct order
  const sortedFrames = [...frames].sort((a, b) => a.timestamp - b.timestamp);
  
  simulationStore.update(state => ({
    ...state,
    frames: sortedFrames,
    isComplete: sortedFrames.length > 0,
    error: null
  }));
}

export function addSimulationFrame(frame: SimulationFrame) {
  simulationStore.update(state => {
    const newFrames = [...state.frames, frame].sort((a, b) => a.timestamp - b.timestamp);
    return {
      ...state,
      frames: newFrames
    };
  });
}

export function clearSimulationFrames() {
  simulationStore.update(state => ({
    ...state,
    frames: []
  }));
}

// Utility functions for frame analysis
export function getFramesByTimeRange(startTime: number, endTime: number) {
  return derived(
    simulationStore,
    $store => $store.frames.filter(f => f.timestamp >= startTime && f.timestamp <= endTime)
  );
}

export function getEventsByType(eventType: SimulationEvent['type']) {
  return derived(
    simulationStore,
    $store => $store.frames.flatMap(f => f.events.filter(e => e.type === eventType))
  );
}

export function getConflictEvents() {
  return getEventsByType('CONFLICT');
}

export function getCustomerJourney(familyId: number) {
  return derived(
    simulationStore,
    $store => {
      const events = $store.frames
        .flatMap(f => f.events.filter(e => e.familyId === familyId))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      return events;
    }
  );
}

// Mock simulation runner (placeholder for actual algorithm)
export async function runSimulation(
  seats: Seat[], 
  customers: Customer[]
): Promise<SimulationFrame[]> {
  // This is a placeholder - actual simulation logic would go here
  const frames: SimulationFrame[] = [];
  
  // Generate mock frames for demonstration
  for (let time = 0; time <= 100; time += 5) {
    const frame: SimulationFrame = {
      timestamp: time,
      seats: seats.map(seat => ({
        ...seat,
        occupiedBy: Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 1 : null,
        isBabyChairAttached: Math.random() > 0.8,
        isWheelchairAccessible: seat.isWheelchairAccessible
      })),
      waitingQueue: customers.slice(0, Math.floor(Math.random() * 5)),
      events: []
    };
    
    frames.push(frame);
  }
  
  return frames;
}