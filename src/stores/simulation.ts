import { writable, derived, get } from 'svelte/store';
import type { SimulationFrame, Seat, Customer, SimulationEvent, CustomerConfig, SeatConfig, SimulationStatistics } from '../types';

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

// ===== Derived Stores =====
export const simulationStats = derived(simulationStore, ($store): SimulationStatistics => {
  if ($store.frames.length === 0) {
    return {
      totalFrames: 0,
      totalEvents: 0,
      maxWaitingCustomers: 0,
      totalConflicts: 0,
      averageWaitTime: 0,
      duration: 0,
      seatUtilization: 0
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

  // Calculate average wait time
  const arrivalEvents = $store.frames.flatMap(f => f.events.filter(e => e.type === 'ARRIVAL'));
  const seatedEvents = $store.frames.flatMap(f => f.events.filter(e => e.type === 'SEATED'));

  let totalWaitTime = 0;
  let waitingCount = 0;

  arrivalEvents.forEach(arrival => {
    const seated = seatedEvents.find(s => s.familyId === arrival.familyId);
    if (seated) {
      totalWaitTime += seated.timestamp - arrival.timestamp;
      waitingCount++;
    }
  });

  const averageWaitTime = waitingCount > 0 ? totalWaitTime / waitingCount : 0;

  // Calculate seat utilization
  let totalOccupiedSlots = 0;
  let totalSlots = 0;

  $store.frames.forEach(frame => {
    frame.seats.forEach(seat => {
      totalSlots++;
      if (seat.occupiedBy !== null) {
        totalOccupiedSlots++;
      }
    });
  });

  const seatUtilization = totalSlots > 0 ? (totalOccupiedSlots / totalSlots) * 100 : 0;

  return {
    totalFrames,
    totalEvents,
    maxWaitingCustomers,
    totalConflicts,
    averageWaitTime,
    duration,
    seatUtilization
  };
});

export const allEvents = derived(simulationStore, ($store) => {
  return $store.frames.flatMap(f => f.events).sort((a, b) => a.timestamp - b.timestamp);
});

// ===== Helper Functions =====
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
  simulationStore.set({
    frames: [],
    isRunning: false,
    isComplete: false,
    error: null
  });
}

export function setSimulationError(error: string) {
  simulationStore.update(state => ({
    ...state,
    isRunning: false,
    error
  }));
}

export function loadSimulationFrames(frames: SimulationFrame[]) {
  const sortedFrames = [...frames].sort((a, b) => a.timestamp - b.timestamp);
  simulationStore.update(state => ({
    ...state,
    frames: sortedFrames,
    isComplete: sortedFrames.length > 0,
    error: null
  }));
}

// ===== Frame Access =====
export function getFrameAtTime(timestamp: number): SimulationFrame | null {
  const state = get(simulationStore);
  // Find the frame at or just before the given timestamp
  for (let i = state.frames.length - 1; i >= 0; i--) {
    if (state.frames[i].timestamp <= timestamp) {
      return state.frames[i];
    }
  }
  return state.frames[0] || null;
}

export function getFramesByTimeRange(startTime: number, endTime: number): SimulationFrame[] {
  const state = get(simulationStore);
  return state.frames.filter(f => f.timestamp >= startTime && f.timestamp <= endTime);
}

// ===== Simulation Runner =====
export async function runSimulation(
  seatConfigs: SeatConfig[],
  customerConfigs: CustomerConfig[]
): Promise<SimulationFrame[]> {
  const frames: SimulationFrame[] = [];
  const maxTime = Math.max(
    ...customerConfigs.map(c => c.arrivalTime + c.estimatedDiningTime),
    100
  );

  // Initialize seats from config
  const seats: Seat[] = seatConfigs.map(config => ({
    id: config.id,
    type: config.type,
    occupiedBy: null,
    isBabyChairAttached: false,
    isWheelchairAccessible: config.isWheelchairAccessible
  }));

  // Track customer states
  const customerStates = new Map<number, {
    config: CustomerConfig;
    status: 'WAITING' | 'SEATED' | 'LEFT';
    seatedTime?: number;
    seatId?: string;
  }>();

  customerConfigs.forEach(c => {
    customerStates.set(c.id, { config: c, status: 'WAITING' });
  });

  // Sort customers by arrival time
  const sortedCustomers = [...customerConfigs].sort((a, b) => a.arrivalTime - b.arrivalTime);

  // Generate frames
  for (let time = 0; time <= maxTime; time++) {
    const events: SimulationEvent[] = [];
    const waitingQueue: Customer[] = [];

    // Process arrivals
    sortedCustomers.forEach(customer => {
      if (customer.arrivalTime === time) {
        events.push({
          timestamp: time,
          type: 'ARRIVAL',
          customerId: customer.id,
          familyId: customer.familyId,
          message: `Family ${customer.familyId} arrived (party of ${customer.partySize})`
        });
      }
    });

    // Process seating logic
    customerStates.forEach((state, customerId) => {
      const customer = state.config;

      // Check if customer should leave
      if (state.status === 'SEATED' && state.seatedTime !== undefined) {
        if (time >= state.seatedTime + customer.estimatedDiningTime) {
          state.status = 'LEFT';
          // Free the seat
          const seat = seats.find(s => s.id === state.seatId);
          if (seat) {
            seat.occupiedBy = null;
            seat.isBabyChairAttached = false;
          }
          events.push({
            timestamp: time,
            type: 'LEFT',
            customerId: customer.id,
            familyId: customer.familyId,
            seatId: state.seatId,
            message: `Family ${customer.familyId} left seat ${state.seatId}`
          });
        }
      }

      // Check if waiting customer can be seated
      if (state.status === 'WAITING' && customer.arrivalTime <= time) {
        // Find suitable seat
        const suitableSeat = findSuitableSeat(seats, customer, seatConfigs);
        
        if (suitableSeat) {
          state.status = 'SEATED';
          state.seatedTime = time;
          state.seatId = suitableSeat.id;
          suitableSeat.occupiedBy = customer.familyId;
          
          if (customer.needsBabyChair) {
            suitableSeat.isBabyChairAttached = true;
          }

          events.push({
            timestamp: time,
            type: 'SEATED',
            customerId: customer.id,
            familyId: customer.familyId,
            seatId: suitableSeat.id,
            message: `Family ${customer.familyId} seated at ${suitableSeat.id}`
          });
        } else {
          // Add to waiting queue
          waitingQueue.push({
            id: customer.id,
            familyId: customer.familyId,
            type: customer.type,
            partySize: customer.partySize,
            needsBabyChair: customer.needsBabyChair,
            needsWheelchair: customer.needsWheelchair,
            arrivalTime: customer.arrivalTime,
            estimatedDiningTime: customer.estimatedDiningTime,
            status: 'WAITING',
            color: getColorForFamily(customer.familyId)
          });
        }
      }
    });

    // Create frame snapshot
    frames.push({
      timestamp: time,
      seats: seats.map(s => ({ ...s })),
      waitingQueue: [...waitingQueue],
      events: [...events]
    });
  }

  return frames;
}

function findSuitableSeat(
  seats: Seat[],
  customer: CustomerConfig,
  seatConfigs: SeatConfig[]
): Seat | null {
  const requiredCapacity = customer.partySize;

  for (const seat of seats) {
    if (seat.occupiedBy !== null) continue;

    const config = seatConfigs.find(c => c.id === seat.id);
    if (!config) continue;

    // Check capacity
    let seatCapacity = 1;
    if (seat.type === '4P') seatCapacity = 4;
    if (seat.type === '6P') seatCapacity = 6;

    if (seatCapacity < requiredCapacity) continue;

    // Check wheelchair accessibility
    if (customer.needsWheelchair && !seat.isWheelchairAccessible) continue;

    // Check baby chair
    if (customer.needsBabyChair && !config.canAttachBabyChair) continue;

    return seat;
  }

  return null;
}

function getColorForFamily(familyId: number): string {
  const colors = [
    '#FF7E67', '#B8D086', '#82AAFF', '#FFB347', '#DDA0DD',
    '#98FB98', '#F0E68C', '#FFA07A', '#87CEEB', '#DEB887'
  ];
  return colors[familyId % colors.length];
}
