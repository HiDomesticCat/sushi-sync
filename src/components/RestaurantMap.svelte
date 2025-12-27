<script lang="ts">
  import { Users, Baby, Accessibility, User } from 'lucide-svelte';
  import Card from './ui/Card.svelte';
  import Badge from './ui/Badge.svelte';
  import Tooltip from './ui/Tooltip.svelte';
  import { seatConfigStore, generateCustomerColors, customerConfigStore } from '../stores/config';
  import { simulationStore, getFrameAtTime } from '../stores/simulation';
  import { playbackStore } from '../stores/playback';
  import { selectionStore, selectSeat, selectFamily, setHoveredSeat, clearHover } from '../stores/selection';
  import type { Seat } from '../types';

  // Get current frame
  $: currentFrame = $simulationStore.frames.length > 0
    ? getFrameAtTime(Math.floor($playbackStore.currentTime))
    : null;

  // Merge static config with dynamic state
  $: seats = ($seatConfigStore.map(config => {
    // Find corresponding dynamic data from Frame
    const dynamicSeat = currentFrame?.seats.find(s => s.id === config.id);
    return {
      ...config,
      occupiedBy: dynamicSeat?.occupiedBy || null,
      isBabyChairAttached: dynamicSeat?.isBabyChairAttached || false
    };
  })) as Seat[];

  $: waitingQueue = currentFrame?.waitingQueue || [];
  $: familyColors = generateCustomerColors($customerConfigStore);

  // --- Helper Functions ---

  function getCustomerInfo(familyId: number | null) {
    if (!familyId) return null;
    return $customerConfigStore.find(c => c.familyId === familyId);
  }

  function getSeatColor(seat: Seat): string {
    if (seat.occupiedBy !== null) {
      return familyColors.get(seat.occupiedBy) || '#FF7E67';
    }
    return 'white'; // Empty seats use white background to show internal slots
  }

  // Calculate how many sub-slots to display inside a sofa
  function getSubSlots(seatType: string) {
    if (seatType === '4P') return 4;
    if (seatType === '6P') return 6;
    return 1; // Single
  }

  // Determine if a sub-slot should be filled
  function isSubSlotFilled(seat: Seat, index: number): boolean {
    if (!seat.occupiedBy) return false;
    const customer = getCustomerInfo(seat.occupiedBy);
    // If occupied, fill slots based on partySize
    // e.g., if 3 people sit at a 4P table, light up 3 slots
    return customer ? index < customer.partySize : true;
  }

</script>

<Card variant="elevated" padding="md" class="min-h-full bg-slate-50/90 backdrop-blur-sm border-slate-200">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-bold text-slate-700 flex items-center gap-2">
      <span class="text-2xl">🍣</span> Floor Plan
    </h2>
    <div class="flex gap-2">
      <Badge variant="dining" size="sm" class="shadow-sm">
        {seats.filter(s => s.occupiedBy !== null).length} Active
      </Badge>
      <Badge variant="waiting" size="sm" class="shadow-sm">
        {waitingQueue.length} Queue
      </Badge>
    </div>
  </div>

  <div class="rounded-xl p-6 min-h-[400px] border border-slate-200 shadow-inner bg-slate-100/50">
    
    {#each ['SINGLE', '4P', '6P'] as seatType}
      <div class="mb-8">
        <div class="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2">
          {#if seatType === 'SINGLE'} 🥃 Bar Counter 
          {:else if seatType === '4P'} 🛋️ Sofa Booths (4)
          {:else} 🏰 Banquet Tables (6) {/if}
        </div>

        <div class="flex flex-wrap gap-4">
          {#each seats.filter(s => s.type === seatType) as seat}
            {@const customer = getCustomerInfo(seat.occupiedBy)}
            {@const subSlots = getSubSlots(seat.type)}
            
            <div class="relative group">
              
              <button
                onclick={(e) => {
                  // Clicking a seat always selects it
                  selectSeat(seat.id, e.ctrlKey);
                }}
                onmouseenter={() => setHoveredSeat(seat.id)}
                onmouseleave={() => clearHover()}
                class="relative overflow-hidden transition-all duration-300 border-2 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1"
                class:border-slate-300={!seat.occupiedBy}
                class:border-transparent={seat.occupiedBy}
                class:ring-2={$selectionStore.selectedSeats.includes(seat.id) ? 'ring-blue-500' : ''}
                style="background-color: {getSeatColor(seat)}; width: {seatType === 'SINGLE' ? '3.5rem' : seatType === '4P' ? '6rem' : '8rem'}; height: {seatType === 'SINGLE' ? '3.5rem' : '6rem'};"
              >
                
                {#if seatType !== 'SINGLE'}
                  <div class="absolute inset-0 p-1.5 grid gap-1 w-full h-full"
                       class:grid-cols-2={seatType === '4P'}
                       class:grid-cols-3={seatType === '6P'}>
                    
                    {#each Array(subSlots) as _, idx}
                      <div class="rounded-md transition-all duration-500 border border-black/5"
                           style="background-color: {isSubSlotFilled(seat, idx) ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.03)'}">
                      </div>
                    {/each}
                  </div>
                {/if}

                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {#if seat.occupiedBy && customer}
                      {#if customer.wheelchairCount > 0}
                         <Accessibility class="w-8 h-8 text-white drop-shadow-md animate-pulse" />
                      {:else}
                         {#if customer.partySize > 1}
                           <Users class="w-8 h-8 text-white drop-shadow-md" />
                         {:else}
                           <User class="w-6 h-6 text-white drop-shadow-md" />
                         {/if}
                      {/if}
                  {:else}
                      <span class="text-xs font-mono font-bold text-slate-300">{seat.id}</span>
                  {/if}
                </div>

                <!-- Show family ID bubble when occupied -->
                {#if seat.occupiedBy && customer}
                  <div class="absolute bottom-0 right-0 z-10">
                    <div class="bg-blue-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:bg-blue-600 transition-colors"
                           role="button"
                           tabindex="0"
                           onclick={(e) => {
                             e.stopPropagation();
                             selectFamily(seat.occupiedBy!, false);
                           }}
                           onkeydown={(e) => {
                             if (e.key === 'Enter' || e.key === ' ') {
                               e.preventDefault();
                               e.stopPropagation();
                               selectFamily(seat.occupiedBy!, false);
                             }
                           }}
                           title={`Family ${customer.familyId} (${customer.partySize} ppl)${customer.wheelchairCount > 0 ? ' - Wheelchair: ' + customer.wheelchairCount : ''}${customer.babyChairCount > 0 ? ' - Baby Chair: ' + customer.babyChairCount : ''}`}>
                      {customer.familyId}
                    </div>
                  </div>
                {/if}

              </button>

              {#if customer && customer.babyChairCount > 0}
                <div class="absolute -top-2 -right-2 z-10 animate-bounce-slow">
                  <div class="bg-pink-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <Baby class="w-3 h-3 mr-0.5" />
                    {customer.babyChairCount}
                  </div>
                </div>
              {/if}

            </div>
          {/each}
        </div>
      </div>
    {/each}

    {#if waitingQueue.length > 0}
      <div class="mt-8 pt-6 border-t border-slate-200">
        <div class="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">Waiting Area</div>
        <div class="flex flex-wrap gap-2">
          {#each waitingQueue as customer}
            <div class="px-3 py-1.5 bg-white border-2 border-dashed border-slate-300 rounded-lg text-xs font-mono text-slate-500 flex items-center gap-2">
               <div class="w-2 h-2 rounded-full" style="background-color: {customer.color}"></div>
               F{customer.familyId}
            </div>
          {/each}
        </div>
      </div>
    {/if}

  </div>
</Card>

<style>
  /* Define simple animations */
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  .animate-bounce-slow {
    animation: bounce-slow 2s infinite;
  }
</style>
