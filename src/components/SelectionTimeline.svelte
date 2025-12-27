<script lang="ts">
  import Card from './ui/Card.svelte';
  import Tooltip from './ui/Tooltip.svelte';
  import { simulationStore } from '../stores/simulation';
  import { selectionStore } from '../stores/selection';
  import { playbackStore, formatTime, setTime } from '../stores/playback';
  import { customerConfigStore, generateCustomerColors } from '../stores/config';

  $: familyColors = generateCustomerColors($customerConfigStore);

  // --- Data Processing ---
  $: seatIntervals = calculateSeatIntervals($selectionStore.selectedSeats);
  $: familyIntervals = calculateFamilyIntervals($selectionStore.selectedFamilies);

  // Group intervals by lane
  $: lanes = [
    ...$selectionStore.selectedSeats.map(id => ({
      id,
      type: 'Seat',
      intervals: seatIntervals.filter(i => i.seatId === id)
    })),
    ...$selectionStore.selectedFamilies.map(id => ({
      id: `F${id}`,
      type: 'Family',
      intervals: familyIntervals.filter(i => i.familyId === id)
    }))
  ];

  function calculateSeatIntervals(seatIds: string[]) {
    if (seatIds.length === 0 || $simulationStore.frames.length === 0) return [];
    const intervals: Array<{ seatId: string; familyId: number; startTime: number; endTime: number; color: string; type?: string }> = [];
    const currentOccupants = new Map<string, { familyId: number; startTime: number }>();

    $simulationStore.frames.forEach(frame => {
      frame.events.forEach(event => {
        if (event.type === 'SEATED' && event.seatId && seatIds.includes(event.seatId)) {
          currentOccupants.set(event.seatId, { familyId: event.familyId, startTime: event.timestamp });
        } else if (event.type === 'LEFT' && event.seatId && seatIds.includes(event.seatId)) {
          const occupant = currentOccupants.get(event.seatId);
          if (occupant && occupant.familyId === event.familyId) {
            intervals.push({
              seatId: event.seatId,
              familyId: occupant.familyId,
              startTime: occupant.startTime,
              endTime: event.timestamp,
              color: familyColors.get(occupant.familyId) || '#888',
              type: `Family ${occupant.familyId}`
            });
            currentOccupants.delete(event.seatId);
          }
        }
      });
    });
    return intervals;
  }

  function calculateFamilyIntervals(familyIds: number[]) {
    if (familyIds.length === 0 || $simulationStore.frames.length === 0) return [];
    const intervals: Array<{ familyId: number; type: string; startTime: number; endTime: number; color: string }> = [];
    const familyStates = new Map<number, { waitStart?: number; dineStart?: number }>();

    $simulationStore.frames.forEach(frame => {
      frame.events.forEach(event => {
        if (!familyIds.includes(event.familyId)) return;
        if (event.type === 'ARRIVAL') {
          familyStates.set(event.familyId, { waitStart: event.timestamp });
        } else if (event.type === 'SEATED') {
          const state = familyStates.get(event.familyId);
          if (state?.waitStart !== undefined) {
            intervals.push({
              familyId: event.familyId,
              type: 'WAITING',
              startTime: state.waitStart,
              endTime: event.timestamp,
              color: familyColors.get(event.familyId) || '#888'
            });
          }
          familyStates.set(event.familyId, { dineStart: event.timestamp });
        } else if (event.type === 'LEFT') {
          const state = familyStates.get(event.familyId);
          if (state?.dineStart !== undefined) {
            intervals.push({
              familyId: event.familyId,
              type: 'DINING',
              startTime: state.dineStart,
              endTime: event.timestamp,
              color: familyColors.get(event.familyId) || '#888'
            });
          }
          familyStates.delete(event.familyId);
        }
      });
    });
    return intervals;
  }

  function handleSeek(e: Event) {
    const target = e.target as HTMLInputElement;
    const time = parseFloat(target.value);
    setTime(time);
  }
</script>

<div class="mt-0">
  <Card variant="elevated" padding="md" class="flex flex-col justify-center">
    <!-- Header with Time Display -->
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold text-text-main flex items-center gap-2">
        Timeline
      </h3>
      <div class="text-xs text-text-muted">
        <span class="font-mono text-primary font-bold">{formatTime($playbackStore.currentTime)}</span>
        <span> / {formatTime($playbackStore.maxTime)}</span>
      </div>
    </div>

    <!-- Main Timeline Container -->
    <div class="relative bg-bg-panel rounded border border-border">
      
      <!-- Global Scrubber (Range Input) -->
      <div class="relative h-8 w-full z-30 bg-bg-main/30">
        <input
          type="range"
          min="0"
          max={$playbackStore.maxTime > 0 ? $playbackStore.maxTime : 0}
          value={$playbackStore.currentTime}
          oninput={handleSeek}
          class="absolute top-0 bottom-0 left-3 right-3 h-full opacity-0 cursor-pointer z-40 m-0 w-[calc(100%-1.5rem)]"
          disabled={$playbackStore.maxTime === 0}
        />
        <!-- Visual Track Wrapper -->
        <div class="absolute inset-x-3 top-0 bottom-0 pointer-events-none">
          <!-- Track -->
          <div class="absolute top-1/2 left-0 right-0 h-1 bg-border -translate-y-1/2 rounded-full"></div>
          <!-- Progress Fill -->
          <div 
            class="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full"
            style="width: {($playbackStore.currentTime / $playbackStore.maxTime) * 100}%"
          ></div>
          <!-- Thumb Indicator -->
          <div 
            class="absolute top-1/2 w-4 h-4 bg-primary rounded-full -translate-y-1/2 -translate-x-1/2 shadow border-2 border-white"
            style="left: {($playbackStore.currentTime / $playbackStore.maxTime) * 100}%"
          ></div>
        </div>
      </div>

      <!-- Lanes Container -->
      {#if lanes.length > 0}
        <div class="border-t border-border bg-bg-main/50 max-h-48 overflow-y-auto">
          {#each lanes as lane}
            <div class="relative h-8 border-b border-border/50 flex items-center">
              <!-- Lane Label -->
              <div class="w-16 px-2 text-xs text-text-muted font-mono border-r border-border/50 shrink-0 truncate" title="{lane.type} {lane.id}">
                {lane.id}
              </div>
              
              <!-- Lane Track -->
              <div class="relative flex-1 h-full mx-2">
                {#each lane.intervals as interval}
                  {@const left = (interval.startTime / $playbackStore.maxTime) * 100}
                  {@const width = ((interval.endTime - interval.startTime) / $playbackStore.maxTime) * 100}
                  <div class="absolute top-2 bottom-2" style="left: {left}%; width: {Math.max(width, 0.5)}%;">
                    <Tooltip text="{lane.type} {lane.id}: {interval.type || 'Occupied'} ({formatTime(interval.startTime)} - {formatTime(interval.endTime)})" class="w-full h-full block">
                      <div
                        class="w-full h-full rounded-sm opacity-80"
                        style="background-color: {interval.color};"
                      ></div>
                    </Tooltip>
                  </div>
                {/each}
                
                <!-- Current Time Line in Lane -->
                <div
                  class="absolute top-0 bottom-0 w-px bg-accent/50 pointer-events-none"
                  style="left: {($playbackStore.currentTime / $playbackStore.maxTime) * 100}%"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="p-4 text-center text-text-muted text-xs italic border-t border-border">
          Select seats or families to compare timeline details
        </div>
      {/if}
      
    </div>
  </Card>
</div>
