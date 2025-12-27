export interface Customer {
  id: number;
  familyId: number;
  type: 'INDIVIDUAL' | 'FAMILY' | 'WITH_BABY' | 'WHEELCHAIR';
  partySize: number;
  needsBabyChair: boolean;
  needsWheelchair: boolean;
  arrivalTime: number;
  estimatedDiningTime: number;
  status: 'WAITING' | 'SEATED' | 'LEFT';
  color: string;
}

export interface Seat {
  id: string;
  type: 'SINGLE' | '4P' | '6P';
  occupiedBy: number | null;
  isBabyChairAttached: boolean;
  isWheelchairAccessible: boolean;
}

export interface SeatConfig {
  id: string;
  type: 'SINGLE' | '4P' | '6P';
  canAttachBabyChair: boolean;
  isWheelchairAccessible: boolean;
}

export interface CustomerConfig {
  id: number;
  familyId: number;
  arrivalTime: number;
  type: 'INDIVIDUAL' | 'FAMILY' | 'WITH_BABY' | 'WHEELCHAIR';
  partySize: number;
  needsBabyChair: boolean;
  needsWheelchair: boolean;
  estimatedDiningTime: number;
}

export interface SimulationFrame {
  timestamp: number;
  seats: Seat[];
  waitingQueue: Customer[];
  events: SimulationEvent[];
}

export interface SimulationEvent {
  timestamp: number;
  type: 'ARRIVAL' | 'SEATED' | 'LEFT' | 'CONFLICT';
  customerId: number;
  familyId: number;
  seatId?: string;
  message: string;
}

export interface TimelineInterval {
  id: string;
  startTime: number;
  endTime: number;
  type: 'WAITING' | 'DINING';
  familyId: number;
  color: string;
}

export interface OverlapInfo {
  startTime: number;
  endTime: number;
  families: number[];
  conflictType: 'SEAT' | 'RESOURCE';
}