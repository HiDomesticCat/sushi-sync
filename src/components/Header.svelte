<script lang="ts">
  import { Play, Pause, Settings, Users, FileText, RotateCcw } from 'lucide-svelte';
  import Button from './ui/Button.svelte';
  import Tooltip from './ui/Tooltip.svelte';
  import { playbackStore, formattedCurrentTime, toggle, reset } from '../stores/playback';
  import { simulationStore, runSimulation, loadSimulationFrames, resetSimulation, isSimulationComplete, isSimulationRunning } from '../stores/simulation';
  import { customerConfigStore, seatConfigStore } from '../stores/config';
  import { setMaxTime } from '../stores/playback';
  import {
    openSeatConfigModal,
    openCustomerConfigModal,
    openExportModal
  } from '../stores/ui';

  // Reactive state
  $: isPlaying = $playbackStore.isPlaying;
  $: currentTime = $formattedCurrentTime;
  $: hasCustomers = $customerConfigStore.length > 0;
  $: canPlay = hasCustomers;
  $: isComplete = $isSimulationComplete;
  $: isRunning = $isSimulationRunning;

  async function handlePlayPause() {
    if (!$isSimulationComplete && hasCustomers) {
      console.log("Header: Starting simulation...");
      // Run simulation first
      const frames = await runSimulation($seatConfigStore, $customerConfigStore);
      
      if (frames && frames.length > 0) {
        console.log("Header: Simulation successful, frames received:", frames.length);
        // Set max time based on simulation
        const maxTime = frames[frames.length - 1].timestamp;
        setMaxTime(maxTime);
        toggle();
      } else {
        console.error("Header: Simulation failed or returned no frames");
        // The alert is now handled inside runSimulation with more detail
      }
    } else {
      toggle();
    }
  }

  function handleReset() {
    reset();
    resetSimulation();
  }
</script>

<header class="w-full z-50 bg-bg-panel border-b-2 border-border shadow-lg">
  <!-- Noren curtain decorative top -->
  <div class="h-2 bg-wood relative overflow-hidden">
    <div class="absolute inset-0 flex">
      {#each Array(16) as _, i}
        <div class="flex-1 h-full border-r border-border/20 relative">
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-sumi/50 rounded-full"></div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Main header content -->
  <div class="h-14 px-4 flex items-center justify-between">

    <!-- Left Section - Config Buttons -->
    <div class="flex items-center gap-2">
      <Tooltip text="Configure seating layout" position="bottom">
        <Button variant="secondary" size="sm" onclick={openSeatConfigModal}>
          <Settings class="w-4 h-4 mr-1.5" />
          Seats
        </Button>
      </Tooltip>

      <Tooltip text="Manage customers" position="bottom">
        <Button variant="secondary" size="sm" onclick={openCustomerConfigModal}>
          <Users class="w-4 h-4 mr-1.5" />
          Customers
        </Button>
      </Tooltip>
    </div>

    <!-- Center Section - Playback Controls -->
    <div class="flex items-center gap-3">
      <Tooltip text="Reset simulation" position="bottom">
        <button
          onclick={handleReset}
          class="w-10 h-10 rounded-full bg-bg-panel border-2 border-border text-text-muted hover:bg-border hover:text-text-main transition-all flex items-center justify-center"
          aria-label="Reset"
        >
          <RotateCcw class="w-5 h-5" />
        </button>
      </Tooltip>

      <Tooltip text={isPlaying ? 'Pause' : canPlay ? 'Start simulation' : 'Add customers first'} position="bottom">
        <button
          onclick={handlePlayPause}
          disabled={!canPlay && !isPlaying}
          class="w-14 h-14 rounded-full bg-accent border-4 border-accent/30 shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          class:animate-pulse-slow={canPlay && !isPlaying && !isComplete}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
          {#if isPlaying}
            <Pause class="w-7 h-7 text-white" />
          {:else}
            <Play class="w-7 h-7 text-white ml-0.5" />
          {/if}
        </button>
      </Tooltip>

      <!-- Digital Clock -->
      <div class="bg-sumi border border-border rounded-lg px-3 py-1.5 font-mono text-base text-matcha shadow-inner min-w-[100px] text-center">
        {currentTime}
      </div>
    </div>

    <!-- Right Section - Export (Duplicate, but useful) -->
    <div class="flex items-center gap-2">
      <Tooltip text="Export simulation data" position="bottom">
        <Button
          variant="secondary"
          size="sm"
          onclick={openExportModal}
          disabled={!isComplete}
        >
          <FileText class="w-4 h-4 mr-1.5" />
          Export
        </Button>
      </Tooltip>
    </div>
  </div>
</header>
