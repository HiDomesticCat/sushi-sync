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
  let singleWheelchair = $state(2);
  let fourPersonWheelchair = $state(2);
  let sixPersonWheelchair = $state(1);
  let singleBabyChair = $state(true);
  let fourPersonBabyChair = $state(true);
  let sixPersonBabyChair = $state(true);

  // Computed values
  const totalSeats = $derived(singleCount + fourPersonCount + sixPersonCount);
  const totalCapacity = $derived(singleCount + (fourPersonCount * 4) + (sixPersonCount * 6));
  const totalWheelchair = $derived(singleWheelchair + fourPersonWheelchair + sixPersonWheelchair);

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

    singleWheelchair = single.filter(s => s.isWheelchairAccessible).length;
    fourPersonWheelchair = fourP.filter(s => s.isWheelchairAccessible).length;
    sixPersonWheelchair = sixP.filter(s => s.isWheelchairAccessible).length;

    singleBabyChair = single.some(s => s.canAttachBabyChair);
    fourPersonBabyChair = fourP.some(s => s.canAttachBabyChair);
    sixPersonBabyChair = sixP.some(s => s.canAttachBabyChair);
  }

  function generateSeats(): SeatConfig[] {
    const seats: SeatConfig[] = [];

    for (let i = 1; i <= singleCount; i++) {
      seats.push({
        id: `S${String(i).padStart(2, '0')}`,
        type: 'SINGLE',
        canAttachBabyChair: singleBabyChair,
        isWheelchairAccessible: i <= singleWheelchair
      });
    }

    for (let i = 1; i <= fourPersonCount; i++) {
      seats.push({
        id: `4P${String(i).padStart(2, '0')}`,
        type: '4P',
        canAttachBabyChair: fourPersonBabyChair,
        isWheelchairAccessible: i <= fourPersonWheelchair
      });
    }

    for (let i = 1; i <= sixPersonCount; i++) {
      seats.push({
        id: `6P${String(i).padStart(2, '0')}`,
        type: '6P',
        canAttachBabyChair: sixPersonBabyChair,
        isWheelchairAccessible: i <= sixPersonWheelchair
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
    singleWheelchair = 2;
    fourPersonWheelchair = 2;
    sixPersonWheelchair = 1;
    singleBabyChair = true;
    fourPersonBabyChair = true;
    sixPersonBabyChair = true;
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

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-primary mb-2">Count (1-20)</label>
          <input
            type="range"
            bind:value={singleCount}
            min="0"
            max="20"
            class="w-full accent-salmon"
          />
          <div class="text-center text-lg font-bold text-salmon">{singleCount}</div>
        </div>

        <div>
          <label class="block text-sm font-medium text-primary mb-2">Wheelchair Accessible</label>
          <input
            type="range"
            bind:value={singleWheelchair}
            min="0"
            max={singleCount}
            class="w-full accent-ocean"
          />
          <div class="text-center text-lg font-bold text-ocean">{singleWheelchair}</div>
        </div>

        <div class="flex items-center">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" bind:checked={singleBabyChair} class="w-4 h-4 accent-matcha" />
            <span class="text-primary">Baby Chair Support</span>
          </label>
        </div>
      </div>
    </Card>

    <!-- 4-Person Tables -->
    <Card variant="bordered" padding="md">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">🍽️</span>
        <h3 class="text-lg font-semibold text-hinoki">4-Person Tables</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-primary mb-2">Count (0-10)</label>
          <input
            type="range"
            bind:value={fourPersonCount}
            min="0"
            max="10"
            class="w-full accent-salmon"
          />
          <div class="text-center text-lg font-bold text-salmon">{fourPersonCount}</div>
        </div>

        <div>
          <label class="block text-sm font-medium text-primary mb-2">Wheelchair Accessible</label>
          <input
            type="range"
            bind:value={fourPersonWheelchair}
            min="0"
            max={fourPersonCount}
            class="w-full accent-ocean"
          />
          <div class="text-center text-lg font-bold text-ocean">{fourPersonWheelchair}</div>
        </div>

        <div class="flex items-center">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" bind:checked={fourPersonBabyChair} class="w-4 h-4 accent-matcha" />
            <span class="text-primary">Baby Chair Support</span>
          </label>
        </div>
      </div>
    </Card>

    <!-- 6-Person Tables -->
    <Card variant="bordered" padding="md">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">🛋️</span>
        <h3 class="text-lg font-semibold text-hinoki">6-Person Tables</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-primary mb-2">Count (0-5)</label>
          <input
            type="range"
            bind:value={sixPersonCount}
            min="0"
            max="5"
            class="w-full accent-salmon"
          />
          <div class="text-center text-lg font-bold text-salmon">{sixPersonCount}</div>
        </div>

        <div>
          <label class="block text-sm font-medium text-primary mb-2">Wheelchair Accessible</label>
          <input
            type="range"
            bind:value={sixPersonWheelchair}
            min="0"
            max={sixPersonCount}
            class="w-full accent-ocean"
          />
          <div class="text-center text-lg font-bold text-ocean">{sixPersonWheelchair}</div>
        </div>

        <div class="flex items-center">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" bind:checked={sixPersonBabyChair} class="w-4 h-4 accent-matcha" />
            <span class="text-primary">Baby Chair Support</span>
          </label>
        </div>
      </div>
    </Card>

    <!-- Preview -->
    <Card variant="elevated" padding="md" class="bg-ocean/5 border-ocean/30">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">📊</span>
        <h3 class="text-lg font-semibold text-ocean">Summary</h3>
      </div>

      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-3xl font-bold text-primary">{totalSeats}</div>
          <div class="text-sm text-muted">Total Seats</div>
        </div>
        <div>
          <div class="text-3xl font-bold text-matcha">{totalCapacity}</div>
          <div class="text-sm text-muted">Total Capacity</div>
        </div>
        <div>
          <div class="text-3xl font-bold text-ocean">{totalWheelchair}</div>
          <div class="text-sm text-muted">Wheelchair</div>
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
