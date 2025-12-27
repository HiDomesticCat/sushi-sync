<script lang="ts">
  import { Play, Pause, Settings, Users, FileText } from 'lucide-svelte';
  import Button from './ui/Button.svelte';
  import Tooltip from './ui/Tooltip.svelte';
  import { playbackStore, formattedCurrentTime, toggle } from '../stores/playback';
  import { simulationStore } from '../stores/simulation';
  import { customerConfigStore } from '../stores/config';
  import { 
    openSeatConfigModal, 
    openCustomerConfigModal, 
    openExportModal 
  } from '../stores/ui';

  // Reactive state
  $: isPlaying = $playbackStore.isPlaying;
  $: currentTime = $formattedCurrentTime;
  $: hasCustomers = $customerConfigStore.length > 0;
  $: canPlay = hasCustomers && !$simulationStore.isRunning;
  $: isSimulationComplete = $simulationStore.isComplete;

  function handlePlayPause() {
    if (canPlay || isPlaying) {
      toggle();
    }
  }

  function handleSeatConfig() {
    openSeatConfigModal();
  }

  function handleCustomerConfig() {
    openCustomerConfigModal();
  }

  function handleExport() {
    openExportModal();
  }
</script>

<header class="fixed top-0 left-0 right-0 z-50 bg-panel border-b-2 border-hinoki shadow-lg">
  <!-- Noren curtain decorative top edge -->
  <div class="h-2 bg-wood relative overflow-hidden">
    <!-- Curtain tabs -->
    <div class="absolute inset-0 flex">
      {#each Array(12) as _, i}
        <div class="flex-1 h-full bg-wood border-r border-hinoki/30 relative">
          <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-sumi rounded-full"></div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Main header content -->
  <div class="h-16 px-6 flex items-center justify-between">
    
    <!-- Left Section - Control Buttons -->
    <div class="flex items-center gap-3">
      <Tooltip text="Configure restaurant seating layout" position="bottom">
        <Button 
          variant="secondary" 
          size="md" 
          onclick={handleSeatConfig}
          aria-label="Seat Configuration"
        >
          <Settings class="w-4 h-4 mr-2" />
          Seat Config
        </Button>
      </Tooltip>

      <Tooltip text="Manage customer arrivals and preferences" position="bottom">
        <Button 
          variant="secondary" 
          size="md" 
          onclick={handleCustomerConfig}
          aria-label="Customer Configuration"
        >
          <Users class="w-4 h-4 mr-2" />
          Customer Config
        </Button>
      </Tooltip>
    </div>

    <!-- Center Section - Main Action (Call Bell) -->
    <div class="flex items-center">
      <Tooltip 
        text={canPlay ? "Start simulation" : isPlaying ? "Pause simulation" : "Configure customers first"} 
        position="bottom"
      >
        <button
          onclick={handlePlayPause}
          disabled={!canPlay && !isPlaying}
          class="w-16 h-16 rounded-full bg-salmon border-4 border-salmon/30 shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group relative overflow-hidden"
          class:animate-pulse={canPlay && !isPlaying}
          aria-label={isPlaying ? "Pause simulation" : "Start simulation"}
        >
          <!-- Call bell shine effect -->
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
          
          <!-- Play/Pause icon -->
          {#if isPlaying}
            <Pause class="w-8 h-8 text-primary drop-shadow-sm" />
          {:else}
            <Play class="w-8 h-8 text-primary drop-shadow-sm ml-1" />
          {/if}
          
          <!-- Ripple effect on hover -->
          <div class="absolute inset-0 rounded-full bg-white/10 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
        </button>
      </Tooltip>
    </div>

    <!-- Right Section - Utilities -->
    <div class="flex items-center gap-4">
      <!-- Digital Clock Display -->
      <div class="bg-sumi border border-hinoki rounded-lg px-4 py-2 font-mono text-lg text-matcha shadow-inner">
        <span class="tracking-wider">{currentTime}</span>
      </div>

      <!-- Export Button -->
      <Tooltip text="Export simulation data and logs" position="bottom">
        <Button 
          variant="secondary" 
          size="md" 
          onclick={handleExport}
          disabled={!isSimulationComplete}
          aria-label="Export Data"
        >
          <FileText class="w-4 h-4 mr-2" />
          Export
        </Button>
      </Tooltip>
    </div>
  </div>

  <!-- Status indicator bar -->
  <div class="h-1 bg-sumi relative overflow-hidden">
    {#if $simulationStore.isRunning}
      <!-- Running indicator -->
      <div class="absolute inset-0 bg-gradient-to-r from-matcha via-ocean to-matcha animate-pulse"></div>
    {:else if isSimulationComplete}
      <!-- Complete indicator -->
      <div class="absolute inset-0 bg-matcha"></div>
    {:else if hasCustomers}
      <!-- Ready indicator -->
      <div class="absolute inset-0 bg-ocean/50"></div>
    {:else}
      <!-- Not ready indicator -->
      <div class="absolute inset-0 bg-salmon/30"></div>
    {/if}
  </div>
</header>

<style>
  /* Call bell glow effect */
  button:not(:disabled):hover {
    box-shadow: 
      0 0 20px rgba(255, 126, 103, 0.4),
      0 4px 15px rgba(0, 0, 0, 0.3);
  }
  
  /* Pulse animation for ready state */
  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(255, 126, 103, 0.7);
    }
    50% {
      box-shadow: 0 0 0 10px rgba(255, 126, 103, 0);
    }
  }
  
  .animate-pulse {
    animation: pulse 2s infinite;
  }
  
  /* Noren curtain tab hover effect */
  .bg-wood:hover {
    background: linear-gradient(135deg, #E8D6C6 0%, #D4C4B0 50%, #E8D6C6 100%);
  }
  
  /* Digital clock glow */
  .text-matcha {
    text-shadow: 0 0 8px rgba(184, 208, 134, 0.5);
  }
  
  /* Status bar animations */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .bg-gradient-to-r {
    background-size: 200% 100%;
    animation: shimmer 2s ease-in-out infinite;
  }
  
  /* Accessibility focus styles */
  button:focus-visible {
    outline: 2px solid var(--color-ocean);
    outline-offset: 2px;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .h-16 {
      height: 3.5rem;
    }
    
    .w-16.h-16 {
      width: 3rem;
      height: 3rem;
    }
    
    .w-8.h-8 {
      width: 1.5rem;
      height: 1.5rem;
    }
    
    .px-6 {
      padding-left: 1rem;
      padding-right: 1rem;
    }
    
    .gap-4 {
      gap: 0.75rem;
    }
    
    .gap-3 {
      gap: 0.5rem;
    }
  }
  
  @media (max-width: 640px) {
    /* Hide button text on small screens, show only icons */
    .hidden-text {
      display: none;
    }
  }
</style>