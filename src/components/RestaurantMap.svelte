<script lang="ts">
  import { Users, Baby, Accessibility } from 'lucide-svelte';
  import Card from './ui/Card.svelte';
  import Badge from './ui/Badge.svelte';
  import Tooltip from './ui/Tooltip.svelte';
  import { seatConfigStore, generateCustomerColors, customerConfigStore } from '../stores/config';
  import { simulationStore, getFrameAtTime } from '../stores/simulation';
  import { playbackStore } from '../stores/playback';
  import { selectionStore, selectSeat, selectFamily, setHoveredSeat, clearHover } from '../stores/selection';
  import type { Seat, SeatConfig } from '../types';

  // Get current frame based on playback time
  $: currentFrame = $simulationStore.frames.length > 0
    ? getFrameAtTime(Math.floor($playbackStore.currentTime))
    : null;

  $: seats = (currentFrame?.seats || $seatConfigStore.map(config => ({
    id: config.id,
    type: config.type,
    occupiedBy: null,
    isBabyChairAttached: false,
    isWheelchairAccessible: config.isWheelchairAccessible
  }))) as Seat[];

  $: waitingQueue = currentFrame?.waitingQueue || [];
  $: familyColors = generateCustomerColors($customerConfigStore);

  function getSeatColor(seat: Seat): string {
    if (seat.occupiedBy !== null) {
      return familyColors.get(seat.occupiedBy) || '#FF7E67';
    }
    return 'transparent';
  }

  function getSeatClasses(seat: Seat): string {
    const isSelected = $selectionStore.selectedSeats.includes(seat.id);
    const isHovered = $selectionStore.hoveredSeat === seat.id;

    let classes = 'transition-all duration-200 cursor-pointer border rounded-lg flex flex-col items-center justify-center ';

    if (seat.occupiedBy !== null) {
      classes += 'seat-occupied text-white shadow-md ';
    } else {
      classes += 'seat-base hover:border-accent ';
    }

    if (isSelected) {
      classes += 'seat-selected ';
    }

    if (isHovered) {
      classes += 'scale-105 ';
    }

    return classes;
  }

  function getSeatSize(type: string): string {
    switch (type) {
      case 'SINGLE': return 'w-12 h-12';
      case '4P': return 'w-20 h-20';
      case '6P': return 'w-24 h-20';
      default: return 'w-12 h-12';
    }
  }

  function handleSeatClick(seatId: string, e: MouseEvent) {
    selectSeat(seatId, e.ctrlKey || e.metaKey);
  }

  function handleFamilyClick(familyId: number, e: MouseEvent) {
    e.stopPropagation();
    selectFamily(familyId, e.ctrlKey || e.metaKey);
  }
</script>

<Card variant="elevated" padding="md" class="h-full bg-bg-panel/80 backdrop-blur-sm">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-text-main flex items-center gap-2">
      <span class="text-xl">🍣</span> Restaurant Floor
    </h2>
    <div class="flex gap-2">
      <Badge variant="dining" size="sm">
        {seats.filter(s => s.occupiedBy !== null).length} Occupied
      </Badge>
      <Badge variant="waiting" size="sm">
        {waitingQueue.length} Waiting
      </Badge>
    </div>
  </div>

  <div class="pattern-asanoha rounded-lg p-4 min-h-[300px] border border-border shadow-inner">
    <!-- Sushi Bar Counter (Single Seats) -->
    <div class="mb-6">
      <div class="text-xs text-text-muted mb-2 uppercase tracking-wider font-bold">Bar Counter</div>
      <div class="flex flex-wrap gap-2 p-3 bg-wood rounded-lg border-b-4 border-border shadow-sm">
        {#each seats.filter(s => s.type === 'SINGLE') as seat}
          <Tooltip text="{seat.id} {seat.occupiedBy ? `(Family ${seat.occupiedBy})` : '(Vacant)'}">
            <div class="relative">
              <button
                onclick={(e) => handleSeatClick(seat.id, e)}
                onmouseenter={() => setHoveredSeat(seat.id)}
                onmouseleave={() => clearHover()}
                class="{getSeatClasses(seat)} {getSeatSize(seat.type)}"
                style="background-color: {getSeatColor(seat)}"
                aria-label="Seat {seat.id}"
              >
                <span class="text-xs font-mono opacity-80 mix-blend-difference">{seat.id}</span>
                {#if seat.isWheelchairAccessible}
                  <Accessibility class="w-3 h-3 text-white drop-shadow-md" />
                {/if}
              </button>
              {#if seat.occupiedBy !== null}
                <button
                  class="absolute -top-1 -right-1 bg-white/80 rounded-full p-0.5 shadow-sm hover:bg-white hover:scale-110 transition-all z-10"
                  onclick={(e) => handleFamilyClick(seat.occupiedBy!, e)}
                  title="Select Family {seat.occupiedBy}"
                >
                  <Users class="w-3 h-3 text-text-main" />
                </button>
              {/if}
            </div>
          </Tooltip>
        {/each}
      </div>
    </div>

    <!-- Tables Area -->
    <div class="grid grid-cols-2 gap-6">
      <!-- 4-Person Tables -->
      <div>
        <div class="text-xs text-text-muted mb-2 uppercase tracking-wider font-bold">4-Person Tables</div>
        <div class="flex flex-wrap gap-3">
          {#each seats.filter(s => s.type === '4P') as seat}
            <Tooltip text="{seat.id} {seat.occupiedBy ? `(Family ${seat.occupiedBy})` : '(Vacant)'}">
              <div class="relative">
                <button
                  onclick={(e) => handleSeatClick(seat.id, e)}
                  onmouseenter={() => setHoveredSeat(seat.id)}
                  onmouseleave={() => clearHover()}
                  class="{getSeatClasses(seat)} {getSeatSize(seat.type)}"
                  style="background-color: {getSeatColor(seat)}"
                  aria-label="Table {seat.id}"
                >
                  <span class="text-xs font-mono opacity-80 mix-blend-difference">{seat.id}</span>
                  <div class="flex gap-1 mt-1">
                    {#if seat.isBabyChairAttached}
                      <Baby class="w-3 h-3 text-white drop-shadow-md" />
                    {/if}
                    {#if seat.isWheelchairAccessible}
                      <Accessibility class="w-3 h-3 text-white drop-shadow-md" />
                    {/if}
                  </div>
                </button>
                {#if seat.occupiedBy !== null}
                  <button
                    class="absolute -top-1 -right-1 bg-white/80 rounded-full p-0.5 shadow-sm hover:bg-white hover:scale-110 transition-all z-10"
                    onclick={(e) => handleFamilyClick(seat.occupiedBy!, e)}
                    title="Select Family {seat.occupiedBy}"
                  >
                    <Users class="w-3 h-3 text-text-main" />
                  </button>
                {/if}
              </div>
            </Tooltip>
          {/each}
        </div>
      </div>

      <!-- 6-Person Tables -->
      <div>
        <div class="text-xs text-text-muted mb-2 uppercase tracking-wider font-bold">6-Person Tables</div>
        <div class="flex flex-wrap gap-3">
          {#each seats.filter(s => s.type === '6P') as seat}
            <Tooltip text="{seat.id} {seat.occupiedBy ? `(Family ${seat.occupiedBy})` : '(Vacant)'}">
              <div class="relative">
                <button
                  onclick={(e) => handleSeatClick(seat.id, e)}
                  onmouseenter={() => setHoveredSeat(seat.id)}
                  onmouseleave={() => clearHover()}
                  class="{getSeatClasses(seat)} {getSeatSize(seat.type)}"
                  style="background-color: {getSeatColor(seat)}"
                  aria-label="Table {seat.id}"
                >
                  <span class="text-xs font-mono opacity-80 mix-blend-difference">{seat.id}</span>
                  <div class="flex gap-1 mt-1">
                    {#if seat.isBabyChairAttached}
                      <Baby class="w-3 h-3 text-white drop-shadow-md" />
                    {/if}
                    {#if seat.isWheelchairAccessible}
                      <Accessibility class="w-3 h-3 text-white drop-shadow-md" />
                    {/if}
                  </div>
                </button>
                {#if seat.occupiedBy !== null}
                  <button
                    class="absolute -top-1 -right-1 bg-white/80 rounded-full p-0.5 shadow-sm hover:bg-white hover:scale-110 transition-all z-10"
                    onclick={(e) => handleFamilyClick(seat.occupiedBy!, e)}
                    title="Select Family {seat.occupiedBy}"
                  >
                    <Users class="w-3 h-3 text-text-main" />
                  </button>
                {/if}
              </div>
            </Tooltip>
          {/each}
        </div>
      </div>
    </div>

    <!-- Waiting Area -->
    {#if waitingQueue.length > 0}
      <div class="mt-6 pt-4 border-t border-border">
        <div class="text-xs text-text-muted mb-2 uppercase tracking-wider font-bold">Waiting Area (Tatami)</div>
        <div class="flex flex-wrap gap-2 p-4 bg-matcha/10 rounded-lg border border-matcha/20">
          {#each waitingQueue as customer}
            <button
              onclick={(e) => handleFamilyClick(customer.familyId, e)}
              class="px-3 py-2 rounded-lg border-2 border-dashed flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer bg-white/50"
              style="border-color: {customer.color};"
            >
              <Users class="w-4 h-4" style="color: {customer.color}" />
              <span class="text-sm font-medium text-text-main">F{customer.familyId} ({customer.partySize})</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Legend -->
  <div class="mt-4 flex flex-wrap gap-4 text-xs text-text-muted">
    <div class="flex items-center gap-1">
      <div class="w-4 h-4 rounded border border-border bg-gofun"></div>
      <span>Vacant</span>
    </div>
    <div class="flex items-center gap-1">
      <div class="w-4 h-4 rounded bg-accent border border-accent"></div>
      <span>Occupied</span>
    </div>
    <div class="flex items-center gap-1">
      <Accessibility class="w-4 h-4 text-primary" />
      <span>Wheelchair</span>
    </div>
    <div class="flex items-center gap-1">
      <Baby class="w-4 h-4 text-success" />
      <span>Baby Chair</span>
    </div>
  </div>
</Card>
