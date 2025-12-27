<script lang="ts">
  import { SkipBack, SkipForward, Rewind, FastForward } from 'lucide-svelte';
  import Card from './ui/Card.svelte';
  import Button from './ui/Button.svelte';
  import Badge from './ui/Badge.svelte';
  import Tooltip from './ui/Tooltip.svelte';
  import {
    playbackStore,
    progressPercentage,
    setTime,
    stepForward,
    stepBackward,
    jumpToStart,
    jumpToEnd,
    setSpeed,
    SPEED_PRESETS,
    formatTime
  } from '../stores/playback';
  import { simulationStore } from '../stores/simulation';
  import { customerConfigStore, generateCustomerColors } from '../stores/config';
  import { selectionStore, selectFamily, setHoveredFamily, clearHover } from '../stores/selection';

  $: familyColors = generateCustomerColors($customerConfigStore);

  // Get timeline intervals for each family
  $: familyIntervals = $simulationStore.frames.length > 0
    ? calculateFamilyIntervals()
    : [];

  function calculateFamilyIntervals() {
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

  function handleTimelineClick(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * $playbackStore.maxTime;
    setTime(newTime);
  }

  function handleIntervalClick(familyId: number, e: MouseEvent) {
    e.stopPropagation();
    selectFamily(familyId, e.ctrlKey || e.metaKey);
  }
</script>

<Card variant="elevated" padding="md">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-hinoki">📊 Master Timeline</h2>
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted">Speed:</span>
      {#each SPEED_PRESETS as speed}
        <button
          onclick={() => setSpeed(speed)}
          class="px-2 py-1 text-xs rounded transition-all {$playbackStore.speed === speed ? 'bg-ocean text-primary' : 'bg-panel text-muted hover:bg-hinoki hover:text-sumi'}"
        >
          {speed}x
        </button>
      {/each}
    </div>
  </div>

  <!-- Timeline Controls -->
  <div class="flex items-center gap-2 mb-4">
    <Tooltip text="Jump to start">
      <Button variant="ghost" size="sm" onclick={jumpToStart}>
        <SkipBack class="w-4 h-4" />
      </Button>
    </Tooltip>
    <Tooltip text="Step backward">
      <Button variant="ghost" size="sm" onclick={stepBackward}>
        <Rewind class="w-4 h-4" />
      </Button>
    </Tooltip>

    <div class="flex-1 mx-4 text-center">
      <span class="font-mono text-lg text-primary">
        {formatTime($playbackStore.currentTime)}
      </span>
      <span class="text-muted mx-2">/</span>
      <span class="font-mono text-muted">
        {formatTime($playbackStore.maxTime)}
      </span>
    </div>

    <Tooltip text="Step forward">
      <Button variant="ghost" size="sm" onclick={stepForward}>
        <FastForward class="w-4 h-4" />
      </Button>
    </Tooltip>
    <Tooltip text="Jump to end">
      <Button variant="ghost" size="sm" onclick={jumpToEnd}>
        <SkipForward class="w-4 h-4" />
      </Button>
    </Tooltip>
  </div>

  <!-- Main Timeline Track -->
  <div
    class="relative h-8 bg-sumi rounded-lg cursor-pointer overflow-hidden border border-hinoki/30"
    onclick={handleTimelineClick}
    onkeydown={(e) => e.key === 'Enter' && handleTimelineClick(e)}
    role="slider"
    tabindex="0"
    aria-label="Timeline"
    aria-valuenow={$playbackStore.currentTime}
    aria-valuemin={0}
    aria-valuemax={$playbackStore.maxTime}
  >
    <!-- Progress fill -->
    <div
      class="absolute inset-y-0 left-0 bg-ocean/30 transition-all duration-100"
      style="width: {$progressPercentage}%"
    ></div>

    <!-- Current time marker -->
    <div
      class="absolute top-0 bottom-0 w-0.5 bg-salmon shadow-lg shadow-salmon/50 z-20"
      style="left: {$progressPercentage}%"
    >
      <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-salmon rounded-full"></div>
    </div>

    <!-- Time markers -->
    {#each Array(11) as _, i}
      <div
        class="absolute top-0 h-2 w-px bg-hinoki/30"
        style="left: {i * 10}%"
      ></div>
    {/each}
  </div>

  <!-- Time labels -->
  <div class="flex justify-between mt-1 text-xs text-muted">
    {#each [0, 25, 50, 75, 100] as pct}
      <span>{formatTime($playbackStore.maxTime * pct / 100)}</span>
    {/each}
  </div>

  <!-- Family Timeline Lanes -->
  {#if familyIntervals.length > 0}
    <div class="mt-6">
      <h3 class="text-sm font-medium text-muted mb-2">Family Activity</h3>
      <div class="space-y-2 max-h-40 overflow-y-auto">
        {#each [...new Set(familyIntervals.map(i => i.familyId))] as familyId}
          {@const intervals = familyIntervals.filter(i => i.familyId === familyId)}
          {@const color = familyColors.get(familyId) || '#888'}
          {@const isSelected = $selectionStore.selectedFamilies.includes(familyId)}

          <div class="flex items-center gap-2">
            <span class="text-xs text-muted w-8">F{familyId}</span>
            <div
              class="relative flex-1 h-6 bg-sumi/50 rounded cursor-pointer {isSelected ? 'ring-2 ring-ocean' : ''}"
              onclick={handleTimelineClick}
              onkeydown={(e) => e.key === 'Enter' && handleTimelineClick(e)}
              role="button"
              tabindex="0"
            >
              {#each intervals as interval}
                {@const left = (interval.startTime / $playbackStore.maxTime) * 100}
                {@const width = ((interval.endTime - interval.startTime) / $playbackStore.maxTime) * 100}
                <Tooltip text="{interval.type} ({formatTime(interval.startTime)} - {formatTime(interval.endTime)})">
                  <button
                    onclick={(e) => handleIntervalClick(interval.familyId, e)}
                    onmouseenter={() => setHoveredFamily(interval.familyId)}
                    onmouseleave={() => clearHover()}
                    class="absolute top-0.5 bottom-0.5 rounded transition-all hover:brightness-110"
                    style="left: {left}%; width: {Math.max(width, 1)}%; background-color: {color}; opacity: {interval.type === 'WAITING' ? 0.5 : 1}"
                  ></button>
                </Tooltip>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Legend -->
  <div class="mt-4 flex gap-4 text-xs text-muted">
    <div class="flex items-center gap-1">
      <div class="w-4 h-3 rounded bg-ocean/50"></div>
      <span>Waiting</span>
    </div>
    <div class="flex items-center gap-1">
      <div class="w-4 h-3 rounded bg-salmon"></div>
      <span>Dining</span>
    </div>
  </div>
</Card>
