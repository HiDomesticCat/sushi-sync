<script lang="ts">
  import Header from '../components/Header.svelte';
  import MasterTimeline from '../components/MasterTimeline.svelte';
  import AnalysisPanel from '../components/AnalysisPanel.svelte'; // Keep hidden/optional for now
  import RestaurantMap from '../components/RestaurantMap.svelte';
  import LogTerminal from '../components/LogTerminal.svelte';
</script>

<div class="h-screen w-screen bg-sumi text-text-offwhite grid grid-rows-[auto_auto_1fr] overflow-hidden font-sans">
  
  <header class="border-b border-hinoki/20 z-10">
    <Header />
  </header>

  <div class="bg-panel border-b border-hinoki/10 p-4 z-0">
    <MasterTimeline />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 h-full min-h-0">
    
    <div class="lg:col-span-2 p-6 overflow-auto bg-sumi relative">
      <div class="absolute inset-0 pattern-seigaiha opacity-5 pointer-events-none"></div>
      <RestaurantMap />
    </div>

    <div class="border-l border-hinoki/20 bg-panel flex flex-col h-full min-h-0">
      <div class="p-2 bg-wood text-sumi font-bold text-sm text-center shadow-sm">
        SYSTEM LOGS
      </div>
      <div class="flex-1 overflow-hidden p-2">
        <LogTerminal />
      </div>
    </div>
  </div>
</div>
