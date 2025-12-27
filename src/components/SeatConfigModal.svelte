<script lang="ts">
  import Modal from './ui/Modal.svelte';
  import Card from './ui/Card.svelte';
  import Button from './ui/Button.svelte';
  import Select from './ui/Select.svelte';
  import Input from './ui/Input.svelte';
  import { seatConfigStore } from '../stores/config';
  import { uiStore, closeSeatConfigModal } from '../stores/ui';
  import type { SeatConfig } from '../types';

  interface SeatTypeConfig {
    count: number;
    canAttachBabyChair: boolean;
    wheelchairAccessibleCount: number;
  }

  // Local reactive state
  let singleSeats = $state<SeatTypeConfig>({
    count: 10,
    canAttachBabyChair: false,
    wheelchairAccessibleCount: 0
  });
  
  let fourPersonTables = $state<SeatTypeConfig>({
    count: 4,
    canAttachBabyChair: true,
    wheelchairAccessibleCount: 1
  });
  
  let sixPersonTables = $state<SeatTypeConfig>({
    count: 2,
    canAttachBabyChair: true,
    wheelchairAccessibleCount: 1
  });

  // String bindings for select components
  let singleSeatsCountStr = $state('10');
  let fourPersonTablesCountStr = $state('4');
  let sixPersonTablesCountStr = $state('2');

  // Update numeric values when string values change
  $effect(() => {
    singleSeats.count = parseInt(singleSeatsCountStr) || 0;
  });

  $effect(() => {
    fourPersonTables.count = parseInt(fourPersonTablesCountStr) || 0;
  });

  $effect(() => {
    sixPersonTables.count = parseInt(sixPersonTablesCountStr) || 0;
  });

  // Computed values using $derived
  const totalSeats = $derived(() => {
    return singleSeats.count + fourPersonTables.count + sixPersonTables.count;
  });

  const totalCapacity = $derived(() => {
    return singleSeats.count + (fourPersonTables.count * 4) + (sixPersonTables.count * 6);
  });

  const totalWheelchairAccessible = $derived(() => {
    return singleSeats.wheelchairAccessibleCount + 
           fourPersonTables.wheelchairAccessibleCount + 
           sixPersonTables.wheelchairAccessibleCount;
  });

  // Options for select dropdowns
  const singleSeatOptions = Array.from({ length: 20 }, (_, i) => ({
    value: (i + 1).toString(),
    label: (i + 1).toString()
  }));

  const fourPersonOptions = Array.from({ length: 11 }, (_, i) => ({
    value: i.toString(),
    label: i.toString()
  }));

  const sixPersonOptions = Array.from({ length: 6 }, (_, i) => ({
    value: i.toString(),
    label: i.toString()
  }));

  // Load current configuration when modal opens
  $effect(() => {
    if ($uiStore.isSeatConfigModalOpen) {
      loadCurrentConfig($seatConfigStore);
    }
  });

  function loadCurrentConfig(seats: SeatConfig[]) {
    // Reset to defaults first
    singleSeats = { count: 0, canAttachBabyChair: false, wheelchairAccessibleCount: 0 };
    fourPersonTables = { count: 0, canAttachBabyChair: false, wheelchairAccessibleCount: 0 };
    sixPersonTables = { count: 0, canAttachBabyChair: false, wheelchairAccessibleCount: 0 };

    // Count existing seats by type
    seats.forEach(seat => {
      switch (seat.type) {
        case 'SINGLE':
          singleSeats.count++;
          if (seat.canAttachBabyChair) singleSeats.canAttachBabyChair = true;
          if (seat.isWheelchairAccessible) singleSeats.wheelchairAccessibleCount++;
          break;
        case '4P':
          fourPersonTables.count++;
          if (seat.canAttachBabyChair) fourPersonTables.canAttachBabyChair = true;
          if (seat.isWheelchairAccessible) fourPersonTables.wheelchairAccessibleCount++;
          break;
        case '6P':
          sixPersonTables.count++;
          if (seat.canAttachBabyChair) sixPersonTables.canAttachBabyChair = true;
          if (seat.isWheelchairAccessible) sixPersonTables.wheelchairAccessibleCount++;
          break;
      }
    });
  }

  function generateSeatConfigs(): SeatConfig[] {
    const seats: SeatConfig[] = [];
    
    // Single seats: S01, S02, ...
    for (let i = 1; i <= singleSeats.count; i++) {
      seats.push({
        id: `S${i.toString().padStart(2, '0')}`,
        type: 'SINGLE',
        canAttachBabyChair: singleSeats.canAttachBabyChair,
        isWheelchairAccessible: i <= singleSeats.wheelchairAccessibleCount
      });
    }
    
    // 4-person tables: 4P01, 4P02, ...
    for (let i = 1; i <= fourPersonTables.count; i++) {
      seats.push({
        id: `4P${i.toString().padStart(2, '0')}`,
        type: '4P',
        canAttachBabyChair: fourPersonTables.canAttachBabyChair,
        isWheelchairAccessible: i <= fourPersonTables.wheelchairAccessibleCount
      });
    }
    
    // 6-person tables: 6P01, 6P02, ...
    for (let i = 1; i <= sixPersonTables.count; i++) {
      seats.push({
        id: `6P${i.toString().padStart(2, '0')}`,
        type: '6P',
        canAttachBabyChair: sixPersonTables.canAttachBabyChair,
        isWheelchairAccessible: i <= sixPersonTables.wheelchairAccessibleCount
      });
    }
    
    return seats;
  }

  function handleResetDefault() {
    singleSeats = { count: 10, canAttachBabyChair: false, wheelchairAccessibleCount: 0 };
    fourPersonTables = { count: 4, canAttachBabyChair: true, wheelchairAccessibleCount: 1 };
    sixPersonTables = { count: 2, canAttachBabyChair: true, wheelchairAccessibleCount: 1 };
    
    // Update string bindings
    singleSeatsCountStr = '10';
    fourPersonTablesCountStr = '4';
    sixPersonTablesCountStr = '2';
  }

  function handleApply() {
    const seats = generateSeatConfigs();
    seatConfigStore.set(seats);
    closeSeatConfigModal();
  }

  function handleClose() {
    closeSeatConfigModal();
  }

  // Validation helpers
  function validateWheelchairCount(maxCount: number, currentCount: number): number {
    return Math.min(Math.max(0, currentCount), maxCount);
  }

  // Update wheelchair accessible counts when seat counts change
  $effect(() => {
    singleSeats.wheelchairAccessibleCount = validateWheelchairCount(
      singleSeats.count, 
      singleSeats.wheelchairAccessibleCount
    );
  });

  $effect(() => {
    fourPersonTables.wheelchairAccessibleCount = validateWheelchairCount(
      fourPersonTables.count, 
      fourPersonTables.wheelchairAccessibleCount
    );
  });

  $effect(() => {
    sixPersonTables.wheelchairAccessibleCount = validateWheelchairCount(
      sixPersonTables.count, 
      sixPersonTables.wheelchairAccessibleCount
    );
  });
</script>

<Modal 
  isOpen={$uiStore.isSeatConfigModalOpen} 
  title="🪑 Seat Configuration" 
  onClose={handleClose}
>
  <div class="space-y-6">
    
    <!-- Single Seats Section -->
    <Card variant="default" padding="md">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">🪑</span>
        <h3 class="text-lg font-semibold text-hinoki">Single Seats (Bar Counter)</h3>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Select
            label="Count"
            options={singleSeatOptions}
            bind:value={singleSeatsCountStr}
            placeholder="Select count..."
          />
        </div>
        
        <div class="space-y-3">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={singleSeats.canAttachBabyChair}
              class="w-4 h-4 text-matcha bg-sumi border-hinoki rounded focus:ring-matcha focus:ring-2"
            />
            <span class="text-primary">Can attach baby chairs</span>
          </label>
          
          {#if singleSeats.count > 0}
            <div>
              <label for="single-wheelchair" class="block text-sm font-medium text-primary mb-2">
                Wheelchair accessible count
              </label>
              <input
                id="single-wheelchair"
                type="number"
                bind:value={singleSeats.wheelchairAccessibleCount}
                min="0"
                max={singleSeats.count}
                placeholder="0"
                class="w-full px-4 py-2 bg-sumi border-2 border-hinoki rounded-lg text-primary placeholder-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ocean focus:border-ocean"
              />
            </div>
          {/if}
        </div>
      </div>
    </Card>

    <!-- 4-Person Tables Section -->
    <Card variant="default" padding="md">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">🍽️</span>
        <h3 class="text-lg font-semibold text-hinoki">4-Person Tables (Semi-booth)</h3>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Select
            label="Count"
            options={fourPersonOptions}
            bind:value={fourPersonTablesCountStr}
            placeholder="Select count..."
          />
        </div>
        
        <div class="space-y-3">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={fourPersonTables.canAttachBabyChair}
              class="w-4 h-4 text-matcha bg-sumi border-hinoki rounded focus:ring-matcha focus:ring-2"
            />
            <span class="text-primary">Can attach baby chairs</span>
          </label>
          
          {#if fourPersonTables.count > 0}
            <div>
              <label for="four-person-wheelchair" class="block text-sm font-medium text-primary mb-2">
                Wheelchair accessible count
              </label>
              <input
                id="four-person-wheelchair"
                type="number"
                bind:value={fourPersonTables.wheelchairAccessibleCount}
                min="0"
                max={fourPersonTables.count}
                placeholder="0"
                class="w-full px-4 py-2 bg-sumi border-2 border-hinoki rounded-lg text-primary placeholder-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ocean focus:border-ocean"
              />
            </div>
          {/if}
        </div>
      </div>
    </Card>

    <!-- 6-Person Tables Section -->
    <Card variant="default" padding="md">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">🛋️</span>
        <h3 class="text-lg font-semibold text-hinoki">6-Person Tables (Large booth)</h3>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Select
            label="Count"
            options={sixPersonOptions}
            bind:value={sixPersonTablesCountStr}
            placeholder="Select count..."
          />
        </div>
        
        <div class="space-y-3">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={sixPersonTables.canAttachBabyChair}
              class="w-4 h-4 text-matcha bg-sumi border-hinoki rounded focus:ring-matcha focus:ring-2"
            />
            <span class="text-primary">Can attach baby chairs</span>
          </label>
          
          {#if sixPersonTables.count > 0}
            <div>
              <label for="six-person-wheelchair" class="block text-sm font-medium text-primary mb-2">
                Wheelchair accessible count
              </label>
              <input
                id="six-person-wheelchair"
                type="number"
                bind:value={sixPersonTables.wheelchairAccessibleCount}
                min="0"
                max={sixPersonTables.count}
                placeholder="0"
                class="w-full px-4 py-2 bg-sumi border-2 border-hinoki rounded-lg text-primary placeholder-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ocean focus:border-ocean"
              />
            </div>
          {/if}
        </div>
      </div>
    </Card>

    <!-- Preview Section -->
    <Card variant="elevated" padding="md" class="border-dashed border-2 border-ocean/30 bg-ocean/5">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">📊</span>
        <h3 class="text-lg font-semibold text-ocean">Preview</h3>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <div class="text-2xl font-bold text-primary">{totalSeats()}</div>
          <div class="text-sm text-muted">Total Seats</div>
          
          <div class="space-y-1 text-sm">
            {#if singleSeats.count > 0}
              <div class="text-muted">• {singleSeats.count} Single seats</div>
            {/if}
            {#if fourPersonTables.count > 0}
              <div class="text-muted">• {fourPersonTables.count} Four-person tables ({fourPersonTables.count * 4} seats)</div>
            {/if}
            {#if sixPersonTables.count > 0}
              <div class="text-muted">• {sixPersonTables.count} Six-person tables ({sixPersonTables.count * 6} seats)</div>
            {/if}
          </div>
        </div>
        
        <div class="space-y-4">
          <div>
            <div class="text-2xl font-bold text-matcha">{totalCapacity()}</div>
            <div class="text-sm text-muted">Total Capacity</div>
          </div>
          
          {#if totalWheelchairAccessible() > 0}
            <div>
              <div class="text-lg font-semibold text-ocean">{totalWheelchairAccessible()}</div>
              <div class="text-sm text-muted">Wheelchair Accessible</div>
            </div>
          {/if}
          
          <div class="text-xs text-muted">
            {#if singleSeats.canAttachBabyChair || fourPersonTables.canAttachBabyChair || sixPersonTables.canAttachBabyChair}
              ✓ Baby chairs available
            {:else}
              ✗ No baby chair support
            {/if}
          </div>
        </div>
      </div>
    </Card>
  </div>

  <div slot="footer" class="flex justify-between">
    <Button variant="secondary" onclick={handleResetDefault}>
      Reset Default
    </Button>
    
    <div class="flex gap-3">
      <Button variant="secondary" onclick={handleClose}>
        Cancel
      </Button>
      <Button variant="primary" onclick={handleApply}>
        Apply & Close
      </Button>
    </div>
  </div>
</Modal>

<style>
  /* Custom checkbox styling */
  input[type="checkbox"] {
    appearance: none;
    background-color: var(--color-sumi);
    border: 2px solid var(--color-hinoki);
    border-radius: 4px;
    width: 1rem;
    height: 1rem;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  input[type="checkbox"]:checked {
    background-color: var(--color-matcha);
    border-color: var(--color-matcha);
  }
  
  input[type="checkbox"]:checked::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--color-sumi);
    font-size: 0.75rem;
    font-weight: bold;
  }
  
  input[type="checkbox"]:hover {
    border-color: var(--color-matcha);
  }
  
  input[type="checkbox"]:focus {
    outline: 2px solid var(--color-matcha);
    outline-offset: 2px;
  }
  
  /* Number input styling */
  input[type="number"] {
    -moz-appearance: textfield;
  }
  
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>