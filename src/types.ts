export interface SeatConfig {
  id: string;
  x: number;
  y: number;
  type: 'SINGLE' | '4P' | '6P';
  isWheelchairAccessible: boolean;
  label?: string;
}

export interface CustomerConfig {
  id: number;
  familyId: number;      // Maps to rust: family_id
  arrivalTime: number;   // Maps to rust: arrival_time
  type: string;          // Maps to rust: type_
  partySize: number;     // Maps to rust: party_size
  
  // Critical: must be number for > 0 checks
  babyChairCount: number; 
  wheelchairCount: number;
  
  estDiningTime: number;
}

export interface Seat {
  id: string;
  type: string;
  occupiedBy: number | null; // Stores Family ID
  isBabyChairAttached: boolean;
  isWheelchairAccessible: boolean;
}

export interface SimulationFrame {
  timestamp: number;
  seats: Seat[];
  waitingQueue: CustomerConfig[];
  events: any[];
  logs: string[];
}
