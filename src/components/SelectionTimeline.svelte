<script lang="ts">
  import { fade } from 'svelte/transition';
  import Card from './ui/Card.svelte';
  import Tooltip from './ui/Tooltip.svelte';
  import { simulationStore } from '../stores/simulation';
  import { selectionStore, selectFamily, setHoveredFamily, clearHover } from '../stores/selection';
  import { playbackStore, formatTime, setTime } from '../stores/playback';
  import { customerConfigStore, generateCustomerColors } from '../stores/config';

  $: familyColors = generateCustomerColors($customerConfigStore);

  // --- Data Processing ---

  // 1. Get intervals for selected seats
  $: seatIntervals = calculateSeatIntervals($selectionStore.selectedSeats);

  // 2. Get intervals for selected families
  $: familyIntervals = calculateFamilyIntervals($selectionStore.selectedFamilies);

  // 3. Calculate "Fusion" intervals (overlaps)
  $: fusionIntervals = calculateFusionIntervals(familyIntervals);

  function calculateSeatIntervals(seatIds: string[]) {
    if (seatIds.length === 0 || $simulationStore.frames.length === 0) return [];

    const intervals: Array<{
      seatId: string;
      familyId: number;
      startTime: number;
      endTime: number;
      color: string;
    }> = [];

    // Map to track current occupant of each seat
    const currentOccupants = new Map<string, { familyId: number; startTime: number }>();

    $simulationStore.frames.forEach(frame => {
      frame.events.forEach(event => {
        if (event.type === 'SEATED' && event.seatId && seatIds.includes(event.seatId)) {
          currentOccupants.set(event.seatId, { 
            familyId: event.familyId, 
            startTime: event.timestamp 
          });
        } else if (event.type === 'LEFT' && event.seatId && seatIds.includes(event.seatId)) {
          const occupant = currentOccupants.get(event.seatId);
          if (occupant && occupant.familyId === event.familyId) {
            intervals.push({
              seatId: event.seatId,
              familyId: occupant.familyId,
              startTime: occupant.startTime,
              endTime: event.timestamp,
              color: familyColors.get(occupant.familyId) || '#888'
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

    const intervals: Array<{
      familyId: number;
      type: 'WAITING' | 'DINING';
      startTime: number;
      endTime: number;
      seatId?: string;
      color: string;
    }> = [];

    const familyStates = new Map<number, { waitStart?: number; dineStart?: number; seatId?: string }>();

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
          familyStates.set(event.familyId, { dineStart: event.timestamp, seatId: event.seatId });
        } else if (event.type === 'LEFT') {
          const state = familyStates.get(event.familyId);
          if (state?.dineStart !== undefined) {
            intervals.push({
              familyId: event.familyId,
              type: 'DINING',
              startTime: state.dineStart,
              endTime: event.timestamp,
              seatId: state.seatId,
              color: familyColors.get(event.familyId) || '#888'
            });
          }
          familyStates.delete(event.familyId);
        }
      });
    });

    return intervals;
  }

  function calculateFusionIntervals(intervals: typeof familyIntervals) {
    if (intervals.length === 0) return [];
    
    // We only care about overlaps if multiple families are selected
    const uniqueFamilies = new Set(intervals.map(i => i.familyId));
    if (uniqueFamilies.size < 2) return [];

    // Simple time-step approach to find overlaps
    // Or just return the raw intervals and let CSS handle the visual overlap?
    // The requirement says: "fusion color... wireframe" for overlapping times.
    
    // Let's find time ranges where >1 family is active
    // This is complex to calculate perfectly for N families.
    // A simpler visual approach: Render all tracks on top of each other with opacity?
    // But the user wants a specific "wireframe" style for the overlap.
    
    // Let's compute "Overlap Segments"
    const timePoints = new Set<number>();
    intervals.forEach(i => {
      timePoints.add(i.startTime);
      timePoints.add(i.endTime);
    });
    const sortedPoints = Array.from(timePoints).sort((a, b) => a - b);
    
    const overlaps: Array<{ startTime: number; endTime: number; families: number[] }> = [];
    
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i+1];
      const mid = (start + end) / 2;
      
      const activeFamilies = intervals
        .filter(inv => inv.startTime <= mid && inv.endTime >= mid)
        .map(inv => inv.familyId);
        
      const uniqueActive = [...new Set(activeFamilies)];
      
      if (uniqueActive.length > 1) {
        overlaps.push({
          startTime: start,
          endTime: end,
          families: uniqueActive
        });
      }
    }
    
    return overlaps;
  }

  function handleTimelineClick(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * $playbackStore.maxTime;
    setTime(newTime);
  }
</script>

<div class="mt-0">
  <Card variant="elevated" padding="md" class="flex flex-col justify-center">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold text-text-main flex items-center gap-2">
        Selected Details
        {#if $selectionStore.selectedSeats.length > 0}
          <span class="text-text-muted font-normal ml-2 text-xs bg-bg-main px-2 py-0.5 rounded-full border border-border">Seats: {$selectionStore.selectedSeats.join(', ')}</span>
        {/if}
        {#if $selectionStore.selectedFamilies.length > 0}
          <span class="text-text-muted font-normal ml-2 text-xs bg-bg-main px-2 py-0.5 rounded-full border border-border">Families: {$selectionStore.selectedFamilies.join(', ')}</span>
        {/if}
      </h3>
    </div>

    <div 
      class="relative h-16 bg-bg-panel rounded border border-border overflow-hidden cursor-pointer"
      onclick={handleTimelineClick}
      onkeydown={(e) => e.key === 'Enter' && handleTimelineClick(e as unknown as MouseEvent)}
      role="button"
      tabindex="0"
      aria-label="Timeline interaction"
    >
      <!-- Background Grid -->
      {#each Array(11) as _, i}
        <div class="absolute top-0 bottom-0 w-px bg-border/30 pointer-events-none" style="left: {i * 10}%"></div>
      {/each}

      <!-- Placeholder Text -->
      {#if $selectionStore.selectedSeats.length === 0 && $selectionStore.selectedFamilies.length === 0}
        <div class="absolute inset-0 flex items-center justify-center text-text-muted text-sm italic pointer-events-none z-10">
          Select a seat or family to view details
        </div>
      {/if}

      <!-- Progress Fill -->
      <div
        class="absolute inset-y-0 left-0 bg-primary/5 pointer-events-none transition-all duration-100"
        style="width: {($playbackStore.currentTime / $playbackStore.maxTime) * 100}%"
      ></div>

      <!-- Seat Intervals -->
      {#each seatIntervals as interval}
        {@const left = (interval.startTime / $playbackStore.maxTime) * 100}
        {@const width = ((interval.endTime - interval.startTime) / $playbackStore.maxTime) * 100}
        <div class="absolute top-1 h-6" style="left: {left}%; width: {Math.max(width, 0.5)}%;">
          <Tooltip text="Seat {interval.seatId}: Family {interval.familyId} ({formatTime(interval.startTime)} - {formatTime(interval.endTime)})" class="w-full h-full block">
            <div
              class="w-full h-full rounded-sm opacity-80"
              style="background-color: {interval.color};"
            >
              <span class="text-[10px] text-white px-1 truncate block">{interval.familyId}</span>
            </div>
          </Tooltip>
        </div>
      {/each}

      <!-- Family Intervals -->
      {#each familyIntervals as interval}
        {@const left = (interval.startTime / $playbackStore.maxTime) * 100}
        {@const width = ((interval.endTime - interval.startTime) / $playbackStore.maxTime) * 100}
        <div class="absolute bottom-1 h-6" style="left: {left}%; width: {Math.max(width, 0.5)}%;">
          <Tooltip text="Family {interval.familyId}: {interval.type} ({formatTime(interval.startTime)} - {formatTime(interval.endTime)})" class="w-full h-full block">
            <div
              class="w-full h-full rounded-sm transition-opacity"
              style="background-color: {interval.color}; opacity: {interval.type === 'WAITING' ? 0.4 : 0.8}"
            >
              <span class="text-[10px] text-white px-1 truncate block">F{interval.familyId}</span>
            </div>
          </Tooltip>
        </div>
      {/each}

      <!-- Fusion/Overlap Intervals -->
      {#each fusionIntervals as overlap}
        {@const left = (overlap.startTime / $playbackStore.maxTime) * 100}
        {@const width = ((overlap.endTime - overlap.startTime) / $playbackStore.maxTime) * 100}
        <div class="absolute top-0 bottom-0 z-20 pointer-events-none" style="left: {left}%; width: {Math.max(width, 0.5)}%;">
           <Tooltip text="Overlap: Families {overlap.families.join(', ')}" class="w-full h-full block pointer-events-auto">
              <div class="w-full h-full conflict-stripe"></div>
           </Tooltip>
        </div>
      {/each}

      <!-- Current Time Indicator -->
      <div
        class="absolute top-0 bottom-0 w-0.5 bg-accent z-30 pointer-events-none"
        style="left: {($playbackStore.currentTime / $playbackStore.maxTime) * 100}%"
      ></div>
    </div>

    <!-- Time Labels -->
    <div class="flex justify-between mt-1 text-xs text-text-muted px-1 select-none">
      {#each [0, 25, 50, 75, 100] as pct}
        <span>{formatTime($playbackStore.maxTime * pct / 100)}</span>
      {/each}
    </div>
  </Card>
</div>
