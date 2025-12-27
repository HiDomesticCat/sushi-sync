import { writable, derived, get } from 'svelte/store';

interface SelectionState {
  selectedSeats: string[];
  selectedFamilies: number[];
  selectedCustomer: number | null;
  hoveredSeat: string | null;
  hoveredFamily: number | null;
}

export const selectionStore = writable<SelectionState>({
  selectedSeats: [],
  selectedFamilies: [],
  selectedCustomer: null,
  hoveredSeat: null,
  hoveredFamily: null
});

// ===== Derived Stores =====
export const hasSelection = derived(selectionStore, ($sel) =>
  $sel.selectedSeats.length > 0 ||
  $sel.selectedFamilies.length > 0 ||
  $sel.selectedCustomer !== null
);

export const selectedSeatCount = derived(selectionStore, ($sel) =>
  $sel.selectedSeats.length
);

export const selectedFamilyCount = derived(selectionStore, ($sel) =>
  $sel.selectedFamilies.length
);

// ===== Seat Selection =====
export function selectSeat(seatId: string, multiSelect = false) {
  selectionStore.update(state => {
    if (!multiSelect) {
      return {
        ...state,
        selectedSeats: [seatId],
        selectedFamilies: [],
        selectedCustomer: null
      };
    } else {
      const isSelected = state.selectedSeats.includes(seatId);
      return {
        ...state,
        selectedSeats: isSelected
          ? state.selectedSeats.filter(id => id !== seatId)
          : [...state.selectedSeats, seatId],
        // selectedFamilies: [], // Allow mixed selection
        selectedCustomer: null
      };
    }
  });
}

export function deselectSeat(seatId: string) {
  selectionStore.update(state => ({
    ...state,
    selectedSeats: state.selectedSeats.filter(id => id !== seatId)
  }));
}

export function isSeatSelected(seatId: string): boolean {
  return get(selectionStore).selectedSeats.includes(seatId);
}

// ===== Family Selection =====
export function selectFamily(familyId: number, multiSelect = false) {
  selectionStore.update(state => {
    if (!multiSelect) {
      return {
        ...state,
        selectedFamilies: [familyId],
        selectedSeats: [],
        selectedCustomer: null
      };
    } else {
      const isSelected = state.selectedFamilies.includes(familyId);
      return {
        ...state,
        selectedFamilies: isSelected
          ? state.selectedFamilies.filter(id => id !== familyId)
          : [...state.selectedFamilies, familyId],
        // selectedSeats: [], // Allow mixed selection
        selectedCustomer: null
      };
    }
  });
}

export function deselectFamily(familyId: number) {
  selectionStore.update(state => ({
    ...state,
    selectedFamilies: state.selectedFamilies.filter(id => id !== familyId)
  }));
}

export function isFamilySelected(familyId: number): boolean {
  return get(selectionStore).selectedFamilies.includes(familyId);
}

// ===== Customer Selection =====
export function selectCustomer(customerId: number) {
  selectionStore.update(state => ({
    ...state,
    selectedCustomer: customerId,
    selectedSeats: [],
    selectedFamilies: []
  }));
}

export function deselectCustomer() {
  selectionStore.update(state => ({
    ...state,
    selectedCustomer: null
  }));
}

// ===== Hover State =====
export function setHoveredSeat(seatId: string | null) {
  selectionStore.update(state => ({ ...state, hoveredSeat: seatId }));
}

export function setHoveredFamily(familyId: number | null) {
  selectionStore.update(state => ({ ...state, hoveredFamily: familyId }));
}

export function clearHover() {
  selectionStore.update(state => ({
    ...state,
    hoveredSeat: null,
    hoveredFamily: null
  }));
}

// ===== Clear All =====
export function clearSelection() {
  selectionStore.update(state => ({
    ...state,
    selectedSeats: [],
    selectedFamilies: [],
    selectedCustomer: null
  }));
}

export function clearAllSelection() {
  selectionStore.set({
    selectedSeats: [],
    selectedFamilies: [],
    selectedCustomer: null,
    hoveredSeat: null,
    hoveredFamily: null
  });
}
