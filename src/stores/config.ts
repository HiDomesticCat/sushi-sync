import { writable, derived, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { simulationStore } from './simulation';
import type { SeatConfig, CustomerConfig } from '../types';

// ===== Default Seat Configuration =====
const defaultSeats: SeatConfig[] = [
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `S${String(i + 1).padStart(2, '0')}`,
    type: 'SINGLE' as const,
    x: 0,
    y: 0,
    isWheelchairAccessible: i < 2
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `4P${String(i + 1).padStart(2, '0')}`,
    type: '4P' as const,
    x: 0,
    y: 0,
    isWheelchairAccessible: i < 2
  })),
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

// Global resource limits
export const resourceLimitsStore = writable({
  babyChairs: 4,
  wheelchairs: 2
});

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
        // Sync both dining time fields if needed
        if (updates.estDiningTime) updated.estDiningTime = updates.estDiningTime;
        return updated;
      }
      return c;
    })
  );
}

export function clearCustomers() {
  customerConfigStore.set([]);
}

// Deprecated: Old JS parsing logic, use backend load_customers instead
export function loadCustomersFromCSV(csvContent: string): CustomerConfig[] {
  return []; 
}

// Import CSV
export async function importCustomersFromCSV(csvContent: string) {
  try {
    simulationStore.update(s => ({ ...s, loading: true }));
    console.log("Config: Calling Rust load_customers...");
    
    // Receive correctly formatted data directly
    const customers = await invoke<CustomerConfig[]>('load_customers', { csvContent });
    
    console.log("Config: Rust returned customers:", customers);
    
    customerConfigStore.set(customers);
    
    simulationStore.update(s => ({ ...s, loading: false }));
    return true;

  } catch (err) {
    console.error("Failed to import customers:", err);
    simulationStore.update(s => ({ ...s, loading: false }));
    alert("Import failed: " + String(err));
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

// Generate Random Customers
export async function generateCustomersInRust(count: number, maxArrivalTime: number) {
  try {
    console.log("Generating random customers...");
    
    // Receive correctly formatted data directly
    const customers = await invoke<CustomerConfig[]>('generate_customers', { 
        count, 
        maxArrivalTime: Number(maxArrivalTime) // Ensure numeric conversion
    });
    
    customerConfigStore.set(customers);
    
    console.log("Generated:", customers);
    return true;
  } catch (err) {
    console.error("Failed to generate customers:", err);
    alert("Generate failed: " + String(err));
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
