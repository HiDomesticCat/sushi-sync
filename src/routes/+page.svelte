<script lang="ts">
  import Header from '../components/Header.svelte';
  import SelectionTimeline from '../components/SelectionTimeline.svelte';
  import RestaurantMap from '../components/RestaurantMap.svelte';
  import LogTerminal from '../components/LogTerminal.svelte';
  import ExportModal from '../components/ExportModal.svelte';
  import SeatConfigModal from '../components/SeatConfigModal.svelte';
  import CustomerConfigModal from '../components/CustomerConfigModal.svelte';
  import { Download } from 'lucide-svelte';
  import Button from '../components/ui/Button.svelte';
  import { openExportModal } from '../stores/ui';
  import { selectionStore } from '../stores/selection';
</script>

<div class="h-screen w-full bg-bg-main text-text-main flex flex-col overflow-hidden font-sans">
  
  <header class="border-b border-border z-10 bg-bg-panel shadow-sm shrink-0">
    <Header />
  </header>

  <div class="bg-bg-panel border-b border-border p-4 z-0 shrink-0">
    <SelectionTimeline />
  </div>

  <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3">
    
    <div class="lg:col-span-2 p-6 overflow-auto bg-bg-main relative">
      <div class="absolute inset-0 pattern-seigaiha opacity-10 pointer-events-none"></div>
      <RestaurantMap />
    </div>

    <div class="border-l border-border bg-bg-panel flex flex-col h-full min-h-0">
      <div class="p-2 bg-wood text-sumi font-bold text-sm text-center shadow-sm flex justify-between items-center px-4 shrink-0">
        <span>SYSTEM LOGS</span>
        <Button variant="ghost" size="sm" onclick={openExportModal} class="text-sumi hover:bg-white/20">
          <Download class="w-4 h-4 mr-1" />
          Export
        </Button>
      </div>
      <div class="flex-1 overflow-hidden p-2 bg-receipt">
        <LogTerminal />
      </div>
    </div>
  </div>

  <ExportModal />
  <SeatConfigModal />
  <CustomerConfigModal />
</div>
