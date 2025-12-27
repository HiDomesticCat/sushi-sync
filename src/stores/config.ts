import { writable } from 'svelte/store';
import type { SeatConfig, CustomerConfig } from '../types';

// Default seat configuration
const defaultSeats: SeatConfig[] = [
  // Single seats (S01-S10)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `S${String(i + 1).padStart(2, '0')}`,
    type: 'SINGLE' as const,
    canAttachBabyChair: true,
    isWheelchairAccessible: i < 2 // First 2 single seats are wheelchair accessible
  })),
  
  // Four-person tables (4P01-4P04)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `4P${String(i + 1).padStart(2, '0')}`,
    type: '4P' as const,
    canAttachBabyChair: true,
    isWheelchairAccessible: i < 2 // First 2 four-person tables are wheelchair accessible
  })),
  
  // Six-person tables (6P01-6P02)
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `6P${String(i + 1).padStart(2, '0')}`,
    type: '6P' as const,
    canAttachBabyChair: true,
    isWheelchairAccessible: i === 0 // Only first six-person table is wheelchair accessible
  }))
];

export const seatConfigStore = writable<SeatConfig[]>(defaultSeats);
export const customerConfigStore = writable<CustomerConfig[]>([]);

// Helper functions for customer management
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
  const headers = lines[0].split(',').map(h => h.trim());
  
  const customers: CustomerConfig[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length !== headers.length) continue;
    
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

// Helper functions for seat management
export function addSeat(seat: SeatConfig) {
  seatConfigStore.update(seats => [...seats, seat]);
}

export function removeSeat(id: string) {
  seatConfigStore.update(seats => seats.filter(s => s.id !== id));
}

export function updateSeat(id: string, updates: Partial<SeatConfig>) {
  seatConfigStore.update(seats => 
    seats.map(s => s.id === id ? { ...s, ...updates } : s)
  );
}

export function resetSeatsToDefault() {
  seatConfigStore.set(defaultSeats);
}

// Utility functions
export function generateCustomerColors(customers: CustomerConfig[]): Map<number, string> {
  const colors = [
    '#FF7E67', // salmon
    '#B8D086', // matcha
    '#82AAFF', // ocean
    '#FFB347', // orange
    '#DDA0DD', // plum
    '#98FB98', // pale green
    '#F0E68C', // khaki
    '#FFA07A', // light salmon
    '#87CEEB', // sky blue
    '#DEB887'  // burlywood
  ];
  
  const colorMap = new Map<number, string>();
  const familyIds = [...new Set(customers.map(c => c.familyId))];
  
  familyIds.forEach((familyId, index) => {
    colorMap.set(familyId, colors[index % colors.length]);
  });
  
  return colorMap;
}