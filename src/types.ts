// ===== Customer Types =====
export type CustomerType = 'INDIVIDUAL' | 'FAMILY' | 'WITH_BABY' | 'WHEELCHAIR';
export type CustomerStatus = 'WAITING' | 'SEATED' | 'LEFT';

export interface Customer {
  id: number;
  familyId: number;
  type: CustomerType;
  partySize: number;
  needsBabyChair: boolean;
  needsWheelchair: boolean;
  arrivalTime: number;
  estimatedDiningTime: number;
  status: CustomerStatus;
  color: string;
}

export interface CustomerConfig {
  id: number;
  familyId: number;
  arrivalTime: number;
  type: CustomerType;
  partySize: number;
  needsBabyChair: boolean;
  needsWheelchair: boolean;
  estimatedDiningTime: number;
}

// ===== Seat Types =====
export type SeatType = 'SINGLE' | '4P' | '6P';

export interface Seat {
  id: string;
  type: SeatType;
  occupiedBy: number | null;
  isBabyChairAttached: boolean;
  isWheelchairAccessible: boolean;
}

export interface SeatConfig {
  id: string;
  type: SeatType;
  canAttachBabyChair: boolean;
  isWheelchairAccessible: boolean;
}

// ===== Simulation Types =====
export type SimulationEventType = 'ARRIVAL' | 'SEATED' | 'LEFT' | 'CONFLICT' | 'WAITING';

export interface SimulationEvent {
  timestamp: number;
  type: SimulationEventType;
  customerId: number;
  familyId: number;
  seatId?: string;
  message: string;
}

export interface SimulationFrame {
  timestamp: number;
  seats: Seat[];
  waitingQueue: Customer[];
  events: SimulationEvent[];
}

// ===== Timeline Types =====
export interface TimelineInterval {
  id: string;
  startTime: number;
  endTime: number;
  type: 'WAITING' | 'DINING';
  familyId: number;
  seatId?: string;
  color: string;
}

export interface OverlapInfo {
  startTime: number;
  endTime: number;
  families: number[];
  conflictType: 'SEAT' | 'RESOURCE';
}

// ===== Log Types =====
export interface LogEntry {
  id: string;
  timestamp: number;
  type: SimulationEventType;
  message: string;
  familyId?: number;
  seatId?: string;
  details?: Record<string, unknown>;
}

// ===== Export Types =====
export interface ExportData {
  metadata: {
    exportedAt: string;
    version: string;
    totalCustomers: number;
    totalSeats: number;
    simulationDuration: number;
  };
  seatConfig: SeatConfig[];
  customerConfig: CustomerConfig[];
  events: SimulationEvent[];
  statistics: SimulationStatistics;
}

export interface SimulationStatistics {
  totalFrames: number;
  totalEvents: number;
  maxWaitingCustomers: number;
  totalConflicts: number;
  averageWaitTime: number;
  duration: number;
  seatUtilization: number;
}

// ===== UI State Types =====
export interface TooltipData {
  text: string;
  x: number;
  y: number;
  visible: boolean;
}

export interface ModalState {
  isOpen: boolean;
  data?: unknown;
}
