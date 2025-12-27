<script lang="ts">
  import Header from '../components/Header.svelte';
  import RestaurantMap from '../components/RestaurantMap.svelte';
  import SelectionTimeline from '../components/SelectionTimeline.svelte';
  import LogTerminal from '../components/LogTerminal.svelte';
  import AnalysisPanel from '../components/AnalysisPanel.svelte';
  import ExportModal from '../components/ExportModal.svelte';
  import SeatConfigModal from '../components/SeatConfigModal.svelte';
  import CustomerConfigModal from '../components/CustomerConfigModal.svelte';
  import { selectionStore } from '../stores/selection';
</script>

<div class="flex flex-col h-screen w-full bg-gray-50 overflow-hidden">
  
  <div class="flex-none z-50">
    <Header />
  </div>

  <div class="flex-1 flex relative overflow-hidden">
    
    <div class="flex-1 flex flex-col relative min-w-0">
      
      <div class="flex-1 relative bg-gray-100">
        <RestaurantMap />
        
        <div class="absolute bottom-4 left-4 z-40 w-96 max-h-48 opacity-90">
             <LogTerminal />
        </div>
      </div>

      <div class="flex-none flex flex-col z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div class="border-t border-gray-200 bg-white">
          <SelectionTimeline />
        </div>
      </div>
      
    </div>

    <div class="w-80 flex-none border-l border-gray-200 bg-white z-40 shadow-xl overflow-y-auto">
      <AnalysisPanel />
    </div>

  </div>
  
  <ExportModal />
  <SeatConfigModal />
  <CustomerConfigModal />
</div>
