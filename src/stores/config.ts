import { writable, derived } from 'svelte/store';
import type { SeatConfig, CustomerConfig } from '../types';

// ===== Default Seat Configuration =====
const defaultSeats: SeatConfig[] = [
  // Single seats (S01-S10)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `S${String(i + 1).padStart(2, '0')}`,
    type: 'SINGLE' as const,
    canAttachBabyChair: i >= 5, // Last 5 can attach baby chairs
    isWheelchairAccessible: i < 2 // First 2 are wheelchair accessible
  })),
  // 4-person tables (4P01-4P04)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `4P${String(i + 1).padStart(2, '0')}`,
    type: '4P' as const,
    canAttachBabyChair: true,
    isWheelchairAccessible: i < 2
  })),
  // 6-person tables (6P01-6P02)
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `6P${String(i + 1).padStart(2, '0')}`,
    type: '6P' as const,
    canAttachBabyChair: true,
    isWheelchairAccessible: i === 0
  }))
];

// ===== Stores =====
export const seatConfigStore = writable<SeatConfig[]>(defaultSeats);
export const customerConfigStore = writable<CustomerConfig[]>([]);

// ===== Derived Stores =====
export const totalCapacity = derived(seatConfigStore, ($seats) => {
  return $seats.reduce((total, seat) => {
    switch (seat.type) {
      case 'SINGLE': return total + 1;
      case '4P': return total + 4;
      case '6P': return total + 6;
      default: return total;
    }
  }, 0);
});

export const seatsByType = derived(seatConfigStore, ($seats) => {
  return {
    single: $seats.filter(s => s.type === 'SINGLE'),
    fourPerson: $seats.filter(s => s.type === '4P'),
    sixPerson: $seats.filter(s => s.type === '6P')
  };
});

export const wheelchairAccessibleSeats = derived(seatConfigStore, ($seats) => {
  return $seats.filter(s => s.isWheelchairAccessible);
});

export const babyChairCapableSeats = derived(seatConfigStore, ($seats) => {
  return $seats.filter(s => s.canAttachBabyChair);
});

// ===== Customer Helper Functions =====
export function addCustomer(customer: CustomerConfig) {
  customerConfigStore.update(customers => [...customers, customer]);
}

export function removeCustomer(id: number) {
  customerConfigStore.update(customers => customers.filter(c => c.id !== id));
}

export function updateCustomer(id: number, updates: Partial<CustomerConfig>) {
  customerConfigStore.update(customers =>
    customers.map(c => c.id === id ? { ...c, ...updates } : c)
  );
}

export function clearCustomers() {
  customerConfigStore.set([]);
}

export function loadCustomersFromCSV(csvContent: string): CustomerConfig[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  const customers: CustomerConfig[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < 8) continue;
    
    const customer: CustomerConfig = {
      id: parseInt(values[0]) || i,
      familyId: parseInt(values[1]) || i,
      arrivalTime: parseInt(values[2]) || 0,
      type: (values[3] as CustomerConfig['type']) || 'INDIVIDUAL',
      partySize: parseInt(values[4]) || 1,
      needsBabyChair: values[5]?.toLowerCase() === 'true',
      needsWheelchair: values[6]?.toLowerCase() === 'true',
      estimatedDiningTime: parseInt(values[7]) || 30
    };
    
    customers.push(customer);
  }
  
  return customers;
}

export function importCustomersFromCSV(csvContent: string) {
  const customers = loadCustomersFromCSV(csvContent);
  customerConfigStore.set(customers);
}

export function exportCustomersToCSV(): string {
  let csv = 'id,familyId,arrivalTime,type,partySize,needsBabyChair,needsWheelchair,estimatedDiningTime\n';
  
  customerConfigStore.subscribe(customers => {
    customers.forEach(c => {
      csv += `${c.id},${c.familyId},${c.arrivalTime},${c.type},${c.partySize},${c.needsBabyChair},${c.needsWheelchair},${c.estimatedDiningTime}\n`;
    });
  })();
  
  return csv;
}

// ===== Seat Helper Functions =====
export function resetSeatsToDefault() {
  seatConfigStore.set(defaultSeats);
}

export function updateSeatConfig(seats: SeatConfig[]) {
  seatConfigStore.set(seats);
}

// ===== Color Generation =====
const FAMILY_COLORS = [
  '#FF7E67', '#B8D086', '#82AAFF', '#FFB347', '#DDA0DD',
  '#98FB98', '#F0E68C', '#FFA07A', '#87CEEB', '#DEB887',
  '#E6E6FA', '#F5DEB3', '#ADD8E6', '#FFB6C1', '#90EE90'
];

export function generateCustomerColors(customers: CustomerConfig[]): Map<number, string> {
  const colorMap = new Map<number, string>();
  const familyIds = [...new Set(customers.map(c => c.familyId))];
  
  familyIds.forEach((familyId, index) => {
    colorMap.set(familyId, FAMILY_COLORS[index % FAMILY_COLORS.length]);
  });
  
  return colorMap;
}
