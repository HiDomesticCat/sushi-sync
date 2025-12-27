<script lang="ts">
  import Modal from './ui/Modal.svelte';
  import Card from './ui/Card.svelte';
  import Button from './ui/Button.svelte';
  import { seatConfigStore, resetSeatsToDefault } from '../stores/config';
  import { uiStore, closeSeatConfigModal } from '../stores/ui';
  import type { SeatConfig } from '../types';

  // Local state
  let singleCount = $state(10);
  let fourPersonCount = $state(4);
  let sixPersonCount = $state(2);

  // Computed values
  const totalSeats = $derived(singleCount + fourPersonCount + sixPersonCount);
  const totalCapacity = $derived(singleCount + (fourPersonCount * 4) + (sixPersonCount * 6));

  // Load current config when modal opens
  $effect(() => {
    if ($uiStore.isSeatConfigModalOpen) {
      loadCurrentConfig();
    }
  });

  function loadCurrentConfig() {
    const seats = $seatConfigStore;
    const single = seats.filter(s => s.type === 'SINGLE');
    const fourP = seats.filter(s => s.type === '4P');
    const sixP = seats.filter(s => s.type === '6P');

    singleCount = single.length;
    fourPersonCount = fourP.length;
    sixPersonCount = sixP.length;
  }

  function generateSeats(): SeatConfig[] {
    const seats: SeatConfig[] = [];

    for (let i = 1; i <= singleCount; i++) {
      seats.push({
        id: `S${String(i).padStart(2, '0')}`,
        type: 'SINGLE',
        canAttachBabyChair: true, // Default support
        isWheelchairAccessible: false // Bar not for wheelchair
      });
    }

    for (let i = 1; i <= fourPersonCount; i++) {
      seats.push({
        id: `4P${String(i).padStart(2, '0')}`,
        type: '4P',
        canAttachBabyChair: true,
        isWheelchairAccessible: true // Sofa is accessible
      });
    }

    for (let i = 1; i <= sixPersonCount; i++) {
      seats.push({
        id: `6P${String(i).padStart(2, '0')}`,
        type: '6P',
        canAttachBabyChair: true,
        isWheelchairAccessible: true // Sofa is accessible
      });
    }

    return seats;
  }

  function handleApply() {
    seatConfigStore.set(generateSeats());
    closeSeatConfigModal();
  }

  function handleReset() {
    singleCount = 10;
    fourPersonCount = 4;
    sixPersonCount = 2;
  }
</script>

<Modal
  isOpen={$uiStore.isSeatConfigModalOpen}
  title="🪑 Seat Configuration"
  onClose={closeSeatConfigModal}
  size="lg"
>
  <div class="space-y-6">

    <!-- Single Seats -->
    <Card variant="bordered" padding="md">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">🪑</span>
        <h3 class="text-lg font-semibold text-hinoki">Single Seats (Bar Counter)</h3>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-sm font-medium text-primary mb-2">
            Count (1-20)
            <input
              type="range"
              bind:value={singleCount}
              min="0"
              max="20"
              class="w-full accent-salmon"
            />
          </label>
          <div class="text-center text-lg font-bold text-salmon">{singleCount}</div>
        </div>
      </div>
    </Card>

    <!-- 4-Person Tables -->
    <Card variant="bordered" padding="md">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">🍽️</span>
        <h3 class="text-lg font-semibold text-hinoki">4-Person Tables</h3>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-sm font-medium text-primary mb-2">
            Count (0-10)
            <input
              type="range"
              bind:value={fourPersonCount}
              min="0"
              max="10"
              class="w-full accent-salmon"
            />
          </label>
          <div class="text-center text-lg font-bold text-salmon">{fourPersonCount}</div>
        </div>
      </div>
    </Card>

    <!-- 6-Person Tables -->
    <Card variant="bordered" padding="md">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">🛋️</span>
        <h3 class="text-lg font-semibold text-hinoki">6-Person Tables</h3>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-sm font-medium text-primary mb-2">
            Count (0-5)
            <input
              type="range"
              bind:value={sixPersonCount}
              min="0"
              max="5"
              class="w-full accent-salmon"
            />
          </label>
          <div class="text-center text-lg font-bold text-salmon">{sixPersonCount}</div>
        </div>
      </div>
    </Card>

    <!-- Preview -->
    <Card variant="elevated" padding="md" class="bg-ocean/5 border-ocean/30">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">📊</span>
        <h3 class="text-lg font-semibold text-ocean">Summary</h3>
      </div>

      <div class="grid grid-cols-2 gap-4 text-center">
        <div>
          <div class="text-3xl font-bold text-primary">{totalSeats}</div>
          <div class="text-sm text-muted">Total Seats</div>
        </div>
        <div>
          <div class="text-3xl font-bold text-matcha">{totalCapacity}</div>
          <div class="text-sm text-muted">Total Capacity</div>
        </div>
      </div>
    </Card>
  </div>

  {#snippet footer()}
    <div class="flex justify-between w-full">
      <Button variant="secondary" onclick={handleReset}>Reset Default</Button>
      <div class="flex gap-3">
        <Button variant="secondary" onclick={closeSeatConfigModal}>Cancel</Button>
        <Button variant="primary" onclick={handleApply}>Apply</Button>
      </div>
    </div>
  {/snippet}
</Modal>
