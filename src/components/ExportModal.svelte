<script lang="ts">
  import { Download, FileText, FileSpreadsheet, Copy, Check } from 'lucide-svelte';
  import Modal from './ui/Modal.svelte';
  import Card from './ui/Card.svelte';
  import Button from './ui/Button.svelte';
  import Badge from './ui/Badge.svelte';
  import { uiStore, closeExportModal } from '../stores/ui';
  import { simulationStore, simulationStats, allEvents } from '../stores/simulation';
  import { seatConfigStore, customerConfigStore } from '../stores/config';
  import { formatTime } from '../stores/playback';
  import { derived } from 'svelte/store';

  let copied = false;
  $: stats = $simulationStats;

  function generateExportData() {
    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        totalCustomers: $customerConfigStore.length,
        totalSeats: $seatConfigStore.length,
        simulationDuration: stats.duration
      },
      seatConfig: $seatConfigStore,
      customerConfig: $customerConfigStore,
      events: $allEvents,
      statistics: stats
    };
  }

  function exportJSON() {
    const data = generateExportData();
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, 'sushi-sync-export.json', 'application/json');
  }

  function exportTXT() {
    let output = '═══════════════════════════════════════════\n';
    output += '          SUSHI SYNC SIMULATION REPORT        \n';
    output += '═══════════════════════════════════════════\n\n';

    output += `Export Date: ${new Date().toLocaleString()}\n`;
    output += `Simulation Duration: ${formatTime(stats.duration)}\n\n`;

    output += '── CONFIGURATION ──────────────────────────\n';
    output += `Total Seats: ${$seatConfigStore.length}\n`;
    output += `  • Single: ${$seatConfigStore.filter(s => s.type === 'SINGLE').length}\n`;
    output += `  • 4-Person: ${$seatConfigStore.filter(s => s.type === '4P').length}\n`;
    output += `  • 6-Person: ${$seatConfigStore.filter(s => s.type === '6P').length}\n`;
    output += `Total Customers: ${$customerConfigStore.length}\n\n`;

    output += '── STATISTICS ─────────────────────────────\n';
    output += `Total Events: ${stats.totalEvents}\n`;
    output += `Max Waiting: ${stats.maxWaitingCustomers}\n`;
    output += `Average Wait Time: ${formatTime(stats.averageWaitTime)}\n`;
    output += `Seat Utilization: ${stats.seatUtilization.toFixed(1)}%\n`;
    output += `Conflicts: ${stats.totalConflicts}\n\n`;

    output += '── EVENT LOG ──────────────────────────────\n';
    $allEvents.forEach(event => {
      output += `[${formatTime(event.timestamp)}] ${event.type.padEnd(10)} | ${event.message}\n`;
    });

    output += '\n═══════════════════════════════════════════\n';
    output += '               END OF REPORT                 \n';
    output += '═══════════════════════════════════════════\n';

    downloadFile(output, 'sushi-sync-report.txt', 'text/plain');
  }

  function exportCSV() {
    let csv = 'timestamp,type,familyId,customerId,seatId,message\n';

    $allEvents.forEach(event => {
      csv += `${event.timestamp},${event.type},${event.familyId},${event.customerId},${event.seatId || ''},\"${event.message}\"\n`;
    });

    downloadFile(csv, 'sushi-sync-events.csv', 'text/csv');
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard() {
    const data = generateExportData();
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
</script>

<Modal
  isOpen={$uiStore.isExportModalOpen}
  title="📤 Export Data"
  onClose={closeExportModal}
>
  <div class="space-y-6">

    <!-- Summary -->
    <Card variant="bordered" padding="md">
      <h3 class="text-sm font-medium text-muted mb-3">Export Summary</h3>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-muted">Duration:</span>
          <span class="text-primary ml-2">{formatTime(stats.duration)}</span>
        </div>
        <div>
          <span class="text-muted">Events:</span>
          <span class="text-primary ml-2">{stats.totalEvents}</span>
        </div>
        <div>
          <span class="text-muted">Seats:</span>
          <span class="text-primary ml-2">{$seatConfigStore.length}</span>
        </div>
        <div>
          <span class="text-muted">Customers:</span>
          <span class="text-primary ml-2">{$customerConfigStore.length}</span>
        </div>
      </div>
    </Card>

    <!-- Export Options -->
    <div class="space-y-3">
      <h3 class="text-sm font-medium text-muted">Export Format</h3>

      <button
        onclick={exportJSON}
        class="w-full flex items-center gap-4 p-4 bg-sumi rounded-lg border border-hinoki hover:border-ocean transition-colors text-left"
      >
        <div class="w-12 h-12 bg-ocean/20 rounded-lg flex items-center justify-center">
          <FileText class="w-6 h-6 text-ocean" />
        </div>
        <div class="flex-1">
          <div class="font-medium text-primary">JSON Export</div>
          <div class="text-xs text-muted">Complete data with all configurations and events</div>
        </div>
        <Badge variant="info" size="sm">Recommended</Badge>
      </button>

      <button
        onclick={exportTXT}
        class="w-full flex items-center gap-4 p-4 bg-sumi rounded-lg border border-hinoki hover:border-matcha transition-colors text-left"
      >
        <div class="w-12 h-12 bg-matcha/20 rounded-lg flex items-center justify-center">
          <FileText class="w-6 h-6 text-matcha" />
        </div>
        <div class="flex-1">
          <div class="font-medium text-primary">Text Report</div>
          <div class="text-xs text-muted">Human-readable formatted report</div>
        </div>
      </button>

      <button
        onclick={exportCSV}
        class="w-full flex items-center gap-4 p-4 bg-sumi rounded-lg border border-hinoki hover:border-salmon transition-colors text-left"
      >
        <div class="w-12 h-12 bg-salmon/20 rounded-lg flex items-center justify-center">
          <FileSpreadsheet class="w-6 h-6 text-salmon" />
        </div>
        <div class="flex-1">
          <div class="font-medium text-primary">CSV Events</div>
          <div class="text-xs text-muted">Event log for spreadsheet analysis</div>
        </div>
      </button>
    </div>

    <!-- Copy to Clipboard -->
    <div class="pt-4 border-t border-hinoki/30">
      <Button variant="secondary" onclick={copyToClipboard} class="w-full">
        {#if copied}
          <Check class="w-4 h-4 mr-2 text-matcha" />
          Copied!
        {:else}
          <Copy class="w-4 h-4 mr-2" />
          Copy JSON to Clipboard
        {/if}
      </Button>
    </div>
  </div>

  {#snippet footer()}
    <Button variant="primary" onclick={closeExportModal}>Close</Button>
  {/snippet}
</Modal>
