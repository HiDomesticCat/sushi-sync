<script lang="ts">
  import Header from '../components/Header.svelte';
  import RestaurantMap from '../components/RestaurantMap.svelte';
  import MasterTimeline from '../components/MasterTimeline.svelte';
  import AnalysisPanel from '../components/AnalysisPanel.svelte';
  import LogTerminal from '../components/LogTerminal.svelte';
  import SeatConfigModal from '../components/SeatConfigModal.svelte';
  import CustomerConfigModal from '../components/CustomerConfigModal.svelte';
  import ExportModal from '../components/ExportModal.svelte';
  import { uiStore, toggleAnalysisPanel } from '../stores/ui';
  import { simulationStore } from '../stores/simulation';
  import { customerConfigStore, seatConfigStore } from '../stores/config';
  import { ChevronRight, ChevronLeft } from 'lucide-svelte';

  $: showAnalysis = $uiStore.showAnalysisPanel;
  $: hasData = $customerConfigStore.length > 0;
</script>

<svelte:head>
  <title>Sushi Sync 🍣</title>
</svelte:head>

<div class="min-h-screen bg-sumi flex flex-col">
  <!-- Header -->
  <Header />

  <!-- Main Content -->
  <main class="flex-1 pt-[72px] flex">
    <!-- Left Panel - Restaurant Map & Timeline -->
    <div class="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      <!-- Restaurant Map -->
      <div class="flex-1 min-h-0">
        <RestaurantMap />
      </div>

      <!-- Master Timeline -->
      <div class="h-auto">
        <MasterTimeline />
      </div>
    </div>

    <!-- Right Panel - Analysis & Log -->
    <div
      class="flex flex-col border-l border-hinoki/30 transition-all duration-300 {showAnalysis ? 'w-96' : 'w-0'}"
    >
      {#if showAnalysis}
        <div class="flex-1 flex flex-col p-4 gap-4 overflow-hidden animate-fade-in">
          <!-- Analysis Panel -->
          <div class="h-1/2 min-h-0">
            <AnalysisPanel />
          </div>

          <!-- Log Terminal -->
          <div class="h-1/2 min-h-0">
            <LogTerminal />
          </div>
        </div>
      {/if}
    </div>

    <!-- Panel Toggle Button -->
    <button
      onclick={toggleAnalysisPanel}
      class="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-panel border border-hinoki rounded-l-lg p-2 hover:bg-hinoki hover:text-sumi transition-colors"
      aria-label={showAnalysis ? 'Hide analysis panel' : 'Show analysis panel'}
    >
      {#if showAnalysis}
        <ChevronRight class="w-4 h-4" />
      {:else}
        <ChevronLeft class="w-4 h-4" />
      {/if}
    </button>
  </main>

  <!-- Welcome Overlay (when no data) -->
  {#if !hasData && !$simulationStore.isComplete}
    <div class="fixed inset-0 z-30 flex items-center justify-center bg-sumi/80 backdrop-blur-sm">
      <div class="bg-panel border-2 border-hinoki rounded-xl p-8 max-w-lg text-center animate-fade-in">
        <div class="text-6xl mb-4">🍣</div>
        <h1 class="text-3xl font-bold text-hinoki mb-2">Welcome to Sushi Sync</h1>
        <p class="text-muted mb-6">
          Restaurant Simulator for Operating Systems Course
        </p>

        <div class="space-y-4 text-left mb-6">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 bg-ocean/20 rounded-full flex items-center justify-center text-ocean font-bold">1</div>
            <div>
              <div class="font-medium text-primary">Configure Seats</div>
              <div class="text-xs text-muted">Set up your restaurant layout</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 bg-matcha/20 rounded-full flex items-center justify-center text-matcha font-bold">2</div>
            <div>
              <div class="font-medium text-primary">Add Customers</div>
              <div class="text-xs text-muted">Define arrivals and preferences</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 bg-salmon/20 rounded-full flex items-center justify-center text-salmon font-bold">3</div>
            <div>
              <div class="font-medium text-primary">Run Simulation</div>
              <div class="text-xs text-muted">Press the red button to start</div>
            </div>
          </div>
        </div>

        <p class="text-xs text-muted">
          Click <strong>Customers</strong> in the header to get started,<br />
          or load sample data for a quick demo.
        </p>
      </div>
    </div>
  {/if}

  <!-- Modals -->
  <SeatConfigModal />
  <CustomerConfigModal />
  <ExportModal />
</div>

<style>
  /* Ensure proper stacking */
  main {
    position: relative;
  }
</style>
