import { writable, derived } from 'svelte/store';

interface SelectionState {
  selectedSeats: string[];      // Seat IDs
  selectedFamilies: number[];   // Family IDs
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

// Derived stores for convenience
export const hasSelection = derived(
  selectionStore,
  $selection => 
    $selection.selectedSeats.length > 0 || 
    $selection.selectedFamilies.length > 0 || 
    $selection.selectedCustomer !== null
);

export const selectedSeatCount = derived(
  selectionStore,
  $selection => $selection.selectedSeats.length
);

export const selectedFamilyCount = derived(
  selectionStore,
  $selection => $selection.selectedFamilies.length
);

export const isMultiSelection = derived(
  selectionStore,
  $selection => 
    $selection.selectedSeats.length > 1 || 
    $selection.selectedFamilies.length > 1
);

// Helper functions for seat selection
export function selectSeat(seatId: string, multiSelect: boolean = false) {
  selectionStore.update(state => {
    if (!multiSelect) {
      // Single selection - replace current selection
      return {
        ...state,
        selectedSeats: [seatId],
        selectedFamilies: [], // Clear family selection when selecting seats
        selectedCustomer: null
      };
    } else {
      // Multi-selection - toggle seat in selection
      const isSelected = state.selectedSeats.includes(seatId);
      const newSelectedSeats = isSelected
        ? state.selectedSeats.filter(id => id !== seatId)
        : [...state.selectedSeats, seatId];
      
      return {
        ...state,
        selectedSeats: newSelectedSeats,
        selectedFamilies: [], // Clear family selection when selecting seats
        selectedCustomer: null
      };
    }
  });
}

export function selectMultipleSeats(seatIds: string[]) {
  selectionStore.update(state => ({
    ...state,
    selectedSeats: [...new Set([...state.selectedSeats, ...seatIds])], // Merge and deduplicate
    selectedFamilies: [], // Clear family selection
    selectedCustomer: null
  }));
}

export function deselectSeat(seatId: string) {
  selectionStore.update(state => ({
    ...state,
    selectedSeats: state.selectedSeats.filter(id => id !== seatId)
  }));
}

export function isSeatSelected(seatId: string): boolean {
  let isSelected = false;
  selectionStore.subscribe(state => {
    isSelected = state.selectedSeats.includes(seatId);
  })();
  return isSelected;
}

// Helper functions for family selection
export function selectFamily(familyId: number, multiSelect: boolean = false) {
  selectionStore.update(state => {
    if (!multiSelect) {
      // Single selection - replace current selection
      return {
        ...state,
        selectedFamilies: [familyId],
        selectedSeats: [], // Clear seat selection when selecting families
        selectedCustomer: null
      };
    } else {
      // Multi-selection - toggle family in selection
      const isSelected = state.selectedFamilies.includes(familyId);
      const newSelectedFamilies = isSelected
        ? state.selectedFamilies.filter(id => id !== familyId)
        : [...state.selectedFamilies, familyId];
      
      return {
        ...state,
        selectedFamilies: newSelectedFamilies,
        selectedSeats: [], // Clear seat selection when selecting families
        selectedCustomer: null
      };
    }
  });
}

export function selectMultipleFamilies(familyIds: number[]) {
  selectionStore.update(state => ({
    ...state,
    selectedFamilies: [...new Set([...state.selectedFamilies, ...familyIds])], // Merge and deduplicate
    selectedSeats: [], // Clear seat selection
    selectedCustomer: null
  }));
}

export function deselectFamily(familyId: number) {
  selectionStore.update(state => ({
    ...state,
    selectedFamilies: state.selectedFamilies.filter(id => id !== familyId)
  }));
}

export function isFamilySelected(familyId: number): boolean {
  let isSelected = false;
  selectionStore.subscribe(state => {
    isSelected = state.selectedFamilies.includes(familyId);
  })();
  return isSelected;
}

// Helper functions for customer selection
export function selectCustomer(customerId: number) {
  selectionStore.update(state => ({
    ...state,
    selectedCustomer: customerId,
    selectedSeats: [], // Clear other selections
    selectedFamilies: []
  }));
}

export function deselectCustomer() {
  selectionStore.update(state => ({
    ...state,
    selectedCustomer: null
  }));
}

export function isCustomerSelected(customerId: number): boolean {
  let isSelected = false;
  selectionStore.subscribe(state => {
    isSelected = state.selectedCustomer === customerId;
  })();
  return isSelected;
}

// Helper functions for hover state
export function setHoveredSeat(seatId: string | null) {
  selectionStore.update(state => ({
    ...state,
    hoveredSeat: seatId
  }));
}

export function setHoveredFamily(familyId: number | null) {
  selectionStore.update(state => ({
    ...state,
    hoveredFamily: familyId
  }));
}

export function clearHover() {
  selectionStore.update(state => ({
    ...state,
    hoveredSeat: null,
    hoveredFamily: null
  }));
}

// General selection functions
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

// Utility functions for selection analysis
export function getSelectionSummary() {
  return derived(
    selectionStore,
    $selection => {
      const summary = {
        type: 'none' as 'none' | 'seats' | 'families' | 'customer' | 'mixed',
        count: 0,
        items: [] as string[]
      };

      if ($selection.selectedCustomer !== null) {
        summary.type = 'customer';
        summary.count = 1;
        summary.items = [`Customer ${$selection.selectedCustomer}`];
      } else if ($selection.selectedSeats.length > 0 && $selection.selectedFamilies.length > 0) {
        summary.type = 'mixed';
        summary.count = $selection.selectedSeats.length + $selection.selectedFamilies.length;
        summary.items = [
          ...$selection.selectedSeats.map(id => `Seat ${id}`),
          ...$selection.selectedFamilies.map(id => `Family ${id}`)
        ];
      } else if ($selection.selectedSeats.length > 0) {
        summary.type = 'seats';
        summary.count = $selection.selectedSeats.length;
        summary.items = $selection.selectedSeats.map(id => `Seat ${id}`);
      } else if ($selection.selectedFamilies.length > 0) {
        summary.type = 'families';
        summary.count = $selection.selectedFamilies.length;
        summary.items = $selection.selectedFamilies.map(id => `Family ${id}`);
      }

      return summary;
    }
  );
}

// Keyboard shortcut helpers
export function handleKeyboardSelection(event: KeyboardEvent, itemId: string, itemType: 'seat' | 'family' | 'customer') {
  const isMultiSelect = event.ctrlKey || event.metaKey;
  
  switch (itemType) {
    case 'seat':
      selectSeat(itemId, isMultiSelect);
      break;
    case 'family':
      selectFamily(parseInt(itemId), isMultiSelect);
      break;
    case 'customer':
      selectCustomer(parseInt(itemId));
      break;
  }
}

// Selection persistence (for undo/redo functionality)
interface SelectionSnapshot {
  timestamp: number;
  state: SelectionState;
}

const selectionHistory = writable<SelectionSnapshot[]>([]);
let currentHistoryIndex = -1;

export function saveSelectionSnapshot() {
  selectionStore.subscribe(currentState => {
    selectionHistory.update(history => {
      const snapshot: SelectionSnapshot = {
        timestamp: Date.now(),
        state: { ...currentState }
      };
      
      // Remove any history after current index (for redo functionality)
      const newHistory = history.slice(0, currentHistoryIndex + 1);
      newHistory.push(snapshot);
      
      // Limit history size
      const maxHistorySize = 50;
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      } else {
        currentHistoryIndex++;
      }
      
      return newHistory;
    });
  })();
}

export function undoSelection() {
  if (currentHistoryIndex > 0) {
    currentHistoryIndex--;
    selectionHistory.subscribe(history => {
      if (history[currentHistoryIndex]) {
        selectionStore.set(history[currentHistoryIndex].state);
      }
    })();
  }
}

export function redoSelection() {
  selectionHistory.subscribe(history => {
    if (currentHistoryIndex < history.length - 1) {
      currentHistoryIndex++;
      if (history[currentHistoryIndex]) {
        selectionStore.set(history[currentHistoryIndex].state);
      }
    }
  })();
}