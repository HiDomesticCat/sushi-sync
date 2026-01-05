<script lang="ts">
  import { simulationStore } from '../stores/simulation';
  import { selectionStore } from '../stores/selection';
  import { playbackStore, formatTime, setTime } from '../stores/playback';
  import { customerConfigStore, generateCustomerColors } from '../stores/config';
  import { fade } from 'svelte/transition';

  $: familyColors = generateCustomerColors($customerConfigStore);
  $: frames = $simulationStore.frames;
  $: totalDuration = frames.length > 0 ? frames[frames.length - 1].timestamp : 0;
  $: currentTime = $playbackStore.currentTime;

  // --- Data Processing ---
  $: seatIntervals = calculateSeatIntervals($selectionStore.selectedSeatIds);
  $: familyIntervals = calculateFamilyIntervals($selectionStore.selectedFamilyIds);

  // Group intervals by lane
  $: lanes = [
    ...$selectionStore.selectedSeatIds.map(id => ({
      id,
      type: 'Seat',
      intervals: seatIntervals.filter(i => i.seatId === id)
    })),
    ...$selectionStore.selectedFamilyIds.map(id => ({
      id: `F${id}`,
      type: 'Family',
      intervals: familyIntervals.filter(i => i.familyId === id)
    }))
  ];

  function calculateSeatIntervals(seatIds: string[]) {
    if (seatIds.length === 0 || frames.length === 0) return [];
    const intervals: Array<{ seatId: string; familyId: number; startTime: number; endTime: number; color: string; type?: string }> = [];
    const currentOccupants = new Map<string, { familyId: number; startTime: number }>();

    frames.forEach(frame => {
      frame.events.forEach((event: any) => {
        if (event.type === 'SEATED' && event.seatId && event.seatId.split(',').some((id: string) => seatIds.includes(id.trim()))) {
          // Handle multi-seat allocation (e.g., "S01,S02")
          event.seatId.split(',').forEach((id: string) => {
            const trimmedId = id.trim();
            if (seatIds.includes(trimmedId)) {
              currentOccupants.set(trimmedId, { familyId: event.familyId, startTime: event.timestamp });
            }
          });
        } else if (event.type === 'LEFT' && event.seatId && event.seatId.split(',').some((id: string) => seatIds.includes(id.trim()))) {
          event.seatId.split(',').forEach((id: string) => {
            const trimmedId = id.trim();
            if (seatIds.includes(trimmedId)) {
              const occupant = currentOccupants.get(trimmedId);
              if (occupant && occupant.familyId === event.familyId) {
                intervals.push({
                  seatId: trimmedId,
                  familyId: occupant.familyId,
                  startTime: occupant.startTime,
                  endTime: event.timestamp,
                  color: familyColors.get(occupant.familyId) || '#888',
                  type: `Family ${occupant.familyId}`
                });
                currentOccupants.delete(trimmedId);
              }
            }
          });
        }
      });
    });
    return intervals;
  }

  function calculateFamilyIntervals(familyIds: number[]) {
    if (familyIds.length === 0 || frames.length === 0) return [];
    const intervals: Array<{ familyId: number; type: string; startTime: number; endTime: number; color: string }> = [];
    const familyStates = new Map<number, { waitStart?: number; dineStart?: number }>();

    frames.forEach(frame => {
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
              color: '#fde047' // Yellow-300
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

  // Calculate percentage position
  const getPos = (t: number) => (t / Math.max(1, totalDuration)) * 100;

  function handleSeek(e: Event) {
    const target = e.target as HTMLInputElement;
    const time = parseFloat(target.value);
    setTime(time);
  }
</script>

<div class="bg-white border-t border-border shadow-2xl">
  <div class="max-w-[1600px] mx-auto px-6 py-3">
    
    <!-- Header with Time Display -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-4">
        <h3 class="text-xs font-bold text-sumi/60 uppercase tracking-widest">
          Selection Timeline
        </h3>
        {#if lanes.length > 0}
          <div class="flex gap-2">
            <span class="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20">
              {lanes.length} Selected
            </span>
          </div>
        {/if}
      </div>
      
      <div class="flex items-center gap-3 bg-bg-panel px-3 py-1 rounded-full border border-border shadow-inner">
        <span class="font-mono text-sm text-primary font-bold">{formatTime($playbackStore.currentTime)}</span>
        <span class="text-border">|</span>
        <span class="font-mono text-sm text-text-muted">{formatTime($playbackStore.maxTime)}</span>
      </div>
    </div>

    <!-- Main Timeline Container -->
    <div class="relative">
      
      <!-- Global Scrubber (Range Input) -->
      <div class="relative h-8 w-full z-30 mb-1">
        <input
          type="range"
          min="0"
          max={$playbackStore.maxTime > 0 ? $playbackStore.maxTime : 0}
          value={$playbackStore.currentTime}
          oninput={handleSeek}
          class="absolute top-0 bottom-0 left-0 right-0 h-full opacity-0 cursor-pointer z-40 m-0 w-full"
          disabled={$playbackStore.maxTime === 0}
        />
        <!-- Visual Track Wrapper -->
        <div class="absolute inset-0 pointer-events-none flex items-center">
          <!-- Track -->
          <div class="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
             <!-- Progress Fill -->
            <div 
              class="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-100"
              style="width: {($playbackStore.currentTime / Math.max(1, $playbackStore.maxTime)) * 100}%"
            ></div>
          </div>
          <!-- Thumb Indicator -->
          <div 
            class="absolute w-4 h-4 bg-white rounded-full shadow-lg border-2 border-primary z-50 flex items-center justify-center transition-all duration-100"
            style="left: {($playbackStore.currentTime / Math.max(1, $playbackStore.maxTime)) * 100}%; transform: translateX(-50%);"
          >
            <div class="w-1 h-1 bg-primary rounded-full"></div>
          </div>
        </div>
      </div>

      <!-- Lanes Container -->
      <div class="bg-slate-50/50 rounded-lg border border-slate-200/60 overflow-hidden">
        {#if lanes.length > 0}
          <div class="max-h-[25vh] overflow-y-auto custom-scrollbar">
            {#each lanes as lane}
              <div class="relative h-8 border-b border-slate-200/40 flex items-center hover:bg-white transition-colors group">
                <!-- Lane Label -->
                <div class="w-20 px-2 text-[10px] text-slate-500 font-bold font-mono border-r border-slate-200/40 shrink-0 truncate group-hover:text-primary transition-colors" title="{lane.type} {lane.id}">
                  {lane.id}
                </div>
                
                <!-- Lane Track -->
                <div class="relative flex-1 h-full px-1">
                  {#each lane.intervals as interval}
                    {@const left = (interval.startTime / Math.max(1, totalDuration)) * 100}
                    {@const width = ((interval.endTime - interval.startTime) / Math.max(1, totalDuration)) * 100}
                    <div class="absolute top-1.5 bottom-1.5" style="left: {left}%; width: {Math.max(width, 0.5)}%;">
                      <div
                        class="w-full h-full rounded-sm opacity-90 shadow-sm border border-white/20 hover:scale-y-110 transition-transform cursor-help"
                        style="background-color: {interval.color};"
                        title="{lane.type} {lane.id}: {interval.type || 'Occupied'} ({formatTime(interval.startTime)} - {formatTime(interval.endTime)})"
                      ></div>
                    </div>
                  {/each}
                  
                  <!-- Current Time Line in Lane -->
                  <div
                    class="absolute top-0 bottom-0 w-px bg-red-500/40 pointer-events-none z-10"
                    style="left: {getPos(currentTime)}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="p-6 text-center">
            <p class="text-slate-400 text-[10px] font-medium italic">
              Select seats or families on the map to compare their activity timelines
            </p>
          </div>
        {/if}
      </div>
      
    </div>
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.02);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2);
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 30px;
    cursor: pointer;
  }
</style>
