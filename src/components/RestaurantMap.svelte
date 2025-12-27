<script lang="ts">
  import { Users, Baby, Accessibility } from 'lucide-svelte';
  import Card from './ui/Card.svelte';
  import Badge from './ui/Badge.svelte';
  import Tooltip from './ui/Tooltip.svelte';
  import { seatConfigStore, generateCustomerColors, customerConfigStore } from '../stores/config';
  import { simulationStore, getFrameAtTime } from '../stores/simulation';
  import { playbackStore } from '../stores/playback';
  import { selectionStore, selectSeat, selectFamily, setHoveredSeat, clearHover } from '../stores/selection';
  import type { Seat } from '../types';

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
    if (isSelected) classes += 'seat-selected ';
    if (isHovered) classes += 'scale-105 ';
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

  // Helper: 判斷該顧客是否為輪椅使用者
  function isWheelchairCustomer(familyId: number | null): boolean {
    if (!familyId) return false;
    const customer = $customerConfigStore.find(c => c.familyId === familyId);
    return customer?.type === 'WHEELCHAIR' || (customer?.wheelchairCount || 0) > 0;
  }

  // Helper: 取得該顧客的嬰兒數量 (如果一大人帶多嬰兒)
  function getBabyCount(familyId: number | null): number {
    if (!familyId) return 0;
    const customer = $customerConfigStore.find(c => c.familyId === familyId);
    return customer?.babyChairCount || 0;
  }

  function handleSeatClick(seatId: string, e: MouseEvent) {
    selectSeat(seatId, e.ctrlKey || e.metaKey);
  }

  function handleFamilyClick(familyId: number, e: MouseEvent) {
    e.stopPropagation();
    selectFamily(familyId, e.ctrlKey || e.metaKey);
  }

  function getCustomerDetails(familyId: number) {
    const customer = $customerConfigStore.find(c => c.familyId === familyId);
    if (!customer) return `Family ${familyId}`;
    return `Family ${familyId} • ${customer.type} • ${customer.partySize} ppl`;
  }
</script>

<Card variant="elevated" padding="md" class="min-h-full bg-bg-panel/80 backdrop-blur-sm">
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
    
    {#each ['SINGLE', '4P', '6P'] as seatType}
      <div class="mb-6">
        <div class="text-xs text-text-muted mb-2 uppercase tracking-wider font-bold">
          {seatType === 'SINGLE' ? 'Bar Counter' : `${seatType} Tables`}
        </div>
        <div class="flex flex-wrap gap-3">
          {#each seats.filter(s => s.type === seatType) as seat}
            <Tooltip text="{seat.id} {seat.occupiedBy ? getCustomerDetails(seat.occupiedBy) : '(Vacant)'}">
              <div class="relative">
                <button
                  onclick={(e) => handleSeatClick(seat.id, e)}
                  onmouseenter={() => setHoveredSeat(seat.id)}
                  onmouseleave={() => clearHover()}
                  class="{getSeatClasses(seat)} {getSeatSize(seat.type)}"
                  style="background-color: {getSeatColor(seat)}"
                >
                  <span class="text-xs font-mono opacity-80 mix-blend-difference">{seat.id}</span>
                  
                  <div class="flex gap-1 mt-1 justify-center items-center">
                    {#if seat.occupiedBy !== null && isWheelchairCustomer(seat.occupiedBy)}
                        <Accessibility class="w-5 h-5 text-white drop-shadow-md animate-pulse" />
                    {:else if seat.isBabyChairAttached}
                        {#if getBabyCount(seat.occupiedBy) > 1}
                           <div class="flex -space-x-1">
                             <Baby class="w-3 h-3 text-white" />
                             <Baby class="w-3 h-3 text-white" />
                           </div>
                        {:else}
                           <Baby class="w-4 h-4 text-white drop-shadow-md" />
                        {/if}
                    {/if}
                  </div>
                </button>

                {#if seat.occupiedBy !== null}
                  <button
                    class="absolute -top-1 -right-1 bg-white/80 rounded-full p-0.5 shadow-sm hover:bg-white hover:scale-110 transition-all z-10"
                    onclick={(e) => handleFamilyClick(seat.occupiedBy!, e)}
                  >
                    <Users class="w-3 h-3 text-text-main" />
                  </button>
                {/if}
              </div>
            </Tooltip>
          {/each}
        </div>
      </div>
    {/each}

    {#if waitingQueue.length > 0}
      {/if}
  </div>
</Card>
