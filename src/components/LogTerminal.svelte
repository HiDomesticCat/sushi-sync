<script lang="ts">
  import { ScrollText, Download, Filter, Trash2 } from 'lucide-svelte';
  import Card from './ui/Card.svelte';
  import Button from './ui/Button.svelte';
  import Badge from './ui/Badge.svelte';
  import { simulationStore } from '../stores/simulation';
  import { playbackStore, formatTime } from '../stores/playback';
  import type { SimulationEventType } from '../types';

  // Filter state
  let filterType = $state<SimulationEventType | 'ALL'>('ALL');
  let autoScroll = $state(true);

  let logContainer: HTMLElement;

  // Get current frames from simulation store
  let currentFrames = $derived($simulationStore.frames);
  
  // Filter events directly from frames (no separate allEvents store)
  let filteredEvents = $derived(
    filterType === 'ALL'
      ? $currentFrames.flatMap(f => f.events)
      : $currentFrames.flatMap(f => f.events).filter(e => e.type === filterType)
  );

  // Events up to current time
  let currentEvents = $derived(
    filteredEvents.filter(e => e.timestamp <= $playbackStore.currentTime)
  );

  // Auto-scroll effect
  $effect(() => {
    if (autoScroll && logContainer && currentEvents.length > 0) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  });

  function getEventIcon(type: SimulationEventType): string {
    switch (type) {
      case 'ARRIVAL': return '🚶';
      case 'SEATED': return '🪑';
      case 'LEFT': return '👋';
      case 'CONFLICT': return '⚠️';
      case 'WAITING': return '⏳';
      default: return '📝';
    }
  }

  function getEventClass(type: SimulationEventType): string {
    switch (type) {
      case 'ARRIVAL': return 'log-entry arrival';
      case 'SEATED': return 'log-entry seated';
      case 'LEFT': return 'log-entry left';
      case 'CONFLICT': return 'log-entry conflict';
      default: return 'log-entry';
    }
  }

  function exportLogs() {
    let output = '=== SUSHI SYNC SIMULATION LOG ===\n';
    output += `Generated: ${new Date().toISOString()}\n`;
    output += `Total Events: ${currentEvents.length}\n`;
    output += '================================\n\n';

    currentEvents.forEach((event) => {
      const time = formatTime(event.timestamp);
      output += `[${time}] ${event.type.padEnd(10)} | Family ${event.familyId} | ${event.message}\n`;
    });

    output += '\n================================\n';
    output += '=== END OF LOG ===\n';

    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sushi-sync-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<Card variant="elevated" padding="none" class="h-full flex flex-col">
  <!-- Header -->
  <div class="bg-wood px-4 py-3 border-b border-hinoki flex items-center justify-between">
    <div class="flex items-center gap-2">
      <ScrollText class="w-5 h-5 text-sumi" />
      <h2 class="text-lg font-semibold text-sumi">Event Log</h2>
      <Badge variant="default" size="sm">{currentEvents.length}</Badge>
    </div>

    <div class="flex items-center gap-2">
      <!-- Filter -->
      <select
        bind:value={filterType}
        class="px-2 py-1 text-xs bg-sumi text-primary border border-hinoki rounded"
      >
        <option value="ALL">All Events</option>
        <option value="ARRIVAL">Arrivals</option>
        <option value="SEATED">Seated</option>
        <option value="LEFT">Left</option>
        <option value="CONFLICT">Conflicts</option>
      </select>

      <!-- Auto-scroll toggle -->
      <label class="flex items-center gap-1 text-xs text-sumi cursor-pointer">
        <input type="checkbox" bind:checked={autoScroll} class="accent-salmon" />
        Auto-scroll
      </label>

      <!-- Export -->
      <Button variant="ghost" size="sm" onclick={exportLogs}>
        <Download class="w-4 h-4" />
      </Button>
    </div>
  </div>

  <!-- Log Content - Receipt Paper Style -->
  <div
    bind:this={logContainer}
    class="flex-1 overflow-y-auto bg-receipt p-4 font-mono text-xs"
  >
    {#if currentEvents.length === 0}
      <div class="text-center py-8 text-gray-500">
        <p>No events yet...</p>
        <p class="text-xs mt-1">Run simulation to see logs</p>
      </div>
    {:else}
      <!-- Receipt Header -->
      <div class="text-center mb-4 text-gray-700">
        <div class="text-lg font-bold">🍣 SUSHI SYNC</div>
        <div class="text-xs">Restaurant Simulation Log</div>
        <div class="text-xs text-gray-500 mt-1">
          {new Date().toLocaleDateString()} | {formatTime($playbackStore.currentTime)}
        </div>
        <div class="border-b-2 border-dashed border-gray-300 mt-2"></div>
      </div>

      <!-- Log Entries -->
      <div class="space-y-1">
        {#each currentEvents as event, i}
          <div class="{getEventClass(event.type)} py-1 text-gray-800">
            <div class="flex items-start gap-2">
              <span class="text-gray-500 w-16 flex-shrink-0">
                {formatTime(event.timestamp)}
              </span>
              <span class="w-4">{getEventIcon(event.type)}</span>
              <span class="flex-1">{event.message}</span>
            </div>
          </div>
        {/each}
      </div>

      <!-- Receipt Footer -->
      <div class="mt-4 pt-2 border-t-2 border-dashed border-gray-300 text-center text-gray-500">
        <div>--- End of Current Log ---</div>
        <div class="text-xs mt-1">Total: {currentEvents.length} events</div>
      </div>
    {/if}
  </div>

  <!-- Status Bar -->
  <div class="bg-panel px-4 py-2 border-t border-hinoki flex justify-between text-xs text-muted">
    <span>
      {#if $simulationStore.frames.length > 0 && $simulationStore.frames.length - 1 === $simulationStore.currentFrameIndex}
        ✓ Simulation complete
      {:else if $simulationStore.isPlaying}
        ▶ Playing...
      {:else}
        ○ Ready
      {/if}
    </span>
    <span>
      Filter: {filterType} | {currentEvents.length} events
    </span>
  </div>
</Card>

<style>
  /* Receipt paper texture */
  .bg-receipt {
    background:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 20px,
        rgba(0,0,0,0.02) 20px,
        rgba(0,0,0,0.02) 21px
      ),
      linear-gradient(to bottom, #FAFAFA 0%, #F5F5F0 100%);
  }

  /* Torn edge effect at bottom */
  .bg-receipt::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 8px;
    background:
      linear-gradient(135deg, #F5F5F0 25%, transparent 25%),
      linear-gradient(-135deg, #F5F5F0 25%, transparent 25%);
    background-size: 8px 8px;
  }
</style>
