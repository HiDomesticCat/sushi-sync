import { writable, derived, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { SeatConfig, CustomerConfig } from '../types';

// ===== Default Seat Configuration =====
const defaultSeats: SeatConfig[] = [
  // Single seats (S01-S10)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `S${String(i + 1).padStart(2, '0')}`,
    type: 'SINGLE' as const,
    x: 0,
    y: 0,
    isWheelchairAccessible: i < 2 // First 2 are wheelchair accessible
  })),
  // 4-person tables (4P01-4P04)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `4P${String(i + 1).padStart(2, '0')}`,
    type: '4P' as const,
    x: 0,
    y: 0,
    isWheelchairAccessible: i < 2
  })),
  // 6-person tables (6P01-6P02)
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `6P${String(i + 1).padStart(2, '0')}`,
    type: '6P' as const,
    x: 0,
    y: 0,
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

// ===== Customer Helper Functions =====
export function addCustomer(customer: CustomerConfig) {
  customerConfigStore.update(customers => [...customers, customer]);
}

export function removeCustomer(id: number) {
  customerConfigStore.update(customers => customers.filter(c => c.id !== id));
}

export function updateCustomer(id: number, updates: Partial<CustomerConfig>) {
  customerConfigStore.update(customers =>
    customers.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updates };
        // Sync both dining time fields
        if (updates.estimatedDiningTime) updated.estDiningTime = updates.estimatedDiningTime;
        if (updates.estDiningTime) updated.estimatedDiningTime = updates.estDiningTime;
        return updated;
      }
      return c;
    })
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
    if (values.length < 7) continue;
    
    const id = parseInt(values[0]) || i;
    const arrivalTime = parseInt(values[1]) || 0;
    const type = values[2] || 'INDIVIDUAL';
    const partySize = parseInt(values[3]) || 1;
    const babyChairCount = parseInt(values[4]) || 0;
    const wheelchairCount = parseInt(values[5]) || 0;
    const diningTime = parseInt(values[6]) || 30;

    const customer: CustomerConfig = {
      id,
      familyId: id,
      arrivalTime,
      type,
      partySize,
      babyChairCount,
      wheelchairCount,
      estDiningTime: diningTime,
      estimatedDiningTime: diningTime
    };
    
    customers.push(customer);
  }
  
  return customers;
}

import { simulationStore } from './simulation';

export async function importCustomersFromCSV(csvContent: string) {
  try {
    simulationStore.update(s => ({ ...s, loading: true }));
    console.log("importCustomersFromCSV: Calling Rust load_customers...");
    const customers = await invoke<any[]>('load_customers', { csvContent });
    console.log("importCustomersFromCSV: Rust returned", customers.length, "customers");
    
    const mappedCustomers: CustomerConfig[] = customers.map(c => ({
      id: Number(c.id),
      familyId: Number(c.family_id),
      arrivalTime: Number(c.arrival_time),
      type: String(c.type_ || c.type || 'INDIVIDUAL'),
      partySize: Number(c.party_size),
      babyChairCount: Number(c.baby_chair_count),
      wheelchairCount: Number(c.wheelchair_count),
      estDiningTime: Number(c.est_dining_time),
      estimatedDiningTime: Number(c.est_dining_time)
    }));
    
    customerConfigStore.set(mappedCustomers);
    simulationStore.update(s => ({ ...s, loading: false }));
    return true;
  } catch (err) {
    console.error("Failed to import customers:", err);
    simulationStore.update(s => ({ ...s, loading: false }));
    alert("Import failed: " + err);
    return false;
  }
}

export function exportCustomersToCSV(): string {
  let csv = 'id,arrival_time,type,party_size,baby_chair,wheel_chair,est_dining_time\n';
  
  const customers = get(customerConfigStore);
  customers.forEach(c => {
    csv += `${c.id},${c.arrivalTime},${c.type},${c.partySize},${c.babyChairCount},${c.wheelchairCount},${c.estDiningTime}\n`;
  });
  
  return csv;
}

export async function generateCustomersInRust(count: number, maxArrivalTime: number) {
  try {
    const customers = await invoke<any[]>('generate_customers', { count, maxArrivalTime });
    
    const mappedCustomers: CustomerConfig[] = customers.map(c => ({
      id: Number(c.id),
      familyId: Number(c.family_id),
      arrivalTime: Number(c.arrival_time),
      type: String(c.type_ || c.type || 'INDIVIDUAL'),
      partySize: Number(c.party_size),
      babyChairCount: Number(c.baby_chair_count),
      wheelchairCount: Number(c.wheelchair_count),
      estDiningTime: Number(c.est_dining_time),
      estimatedDiningTime: Number(c.est_dining_time)
    }));
    
    customerConfigStore.set(mappedCustomers);
    return true;
  } catch (err) {
    console.error("Failed to generate customers:", err);
    return false;
  }
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
