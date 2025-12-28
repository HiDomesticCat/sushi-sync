import { writable } from 'svelte/store';

interface SelectionState {
  selectedSeatIds: string[];
  selectedFamilyIds: number[];
  hoveredSeat: string | null;
}

const initialState: SelectionState = {
  selectedSeatIds: [],
  selectedFamilyIds: [],
  hoveredSeat: null,
};

export const selectionStore = writable<SelectionState>(initialState);

export const selectSeat = (seatId: string, multiSelect: boolean = false) => {
  selectionStore.update(s => {
    let newSeats = [...s.selectedSeatIds];
    
    if (multiSelect) {
      // Multi-select mode: toggle inclusion
      if (newSeats.includes(seatId)) {
        newSeats = newSeats.filter(id => id !== seatId);
      } else {
        newSeats.push(seatId);
      }
    } else {
      // Single-select mode: toggle or replace
      if (newSeats.includes(seatId) && newSeats.length === 1) {
        newSeats = [];
      } else {
        newSeats = [seatId];
      }
    }

    return { ...s, selectedSeatIds: newSeats };
  });
};

export const selectFamily = (familyId: number, multiSelect: boolean = false) => {
  selectionStore.update(s => {
    let newFamilies = [...s.selectedFamilyIds];

    if (multiSelect) {
      // Multi-select mode: toggle inclusion
      if (newFamilies.includes(familyId)) {
        newFamilies = newFamilies.filter(id => id !== familyId);
      } else {
        newFamilies.push(familyId);
      }
    } else {
      // Single-select mode: toggle or add to list
      if (newFamilies.includes(familyId)) {
        newFamilies = newFamilies.filter(id => id !== familyId);
      } else {
        newFamilies.push(familyId);
      }
    }

    return { ...s, selectedFamilyIds: newFamilies };
  });
};

export const setHoveredSeat = (seatId: string | null) => {
  selectionStore.update(s => ({ ...s, hoveredSeat: seatId }));
};

export const clearHover = () => {
  selectionStore.update(s => ({ ...s, hoveredSeat: null }));
};

export const clearSelection = () => {
  selectionStore.set(initialState);
};
