<script lang="ts">
  import { Download, FileText, FileSpreadsheet, Copy, Check } from 'lucide-svelte';
  import Modal from './ui/Modal.svelte';
  import Card from './ui/Card.svelte';
  import Button from './ui/Button.svelte';
  import Badge from './ui/Badge.svelte';
  import { uiStore, closeExportModal } from '../stores/ui';
  import { simulationStore, simulationStats, allEvents, actions as simActions } from '../stores/simulation';
  import { seatConfigStore, customerConfigStore } from '../stores/config';
  import { formatTime } from '../stores/playback';

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

  async function exportJSON() {
    simActions.setLoading(true);
    setTimeout(() => {
      const data = generateExportData();
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, 'sushi-sync-export.json', 'application/json');
      simActions.setLoading(false);
    }, 500);
  }

  async function exportTXT() {
    simActions.setLoading(true);
    setTimeout(() => {
      let output = "[Thread ID] [Time] [Event Type] ID: {id} | Requirements: {Resource Requirements} | Result | Remaining Resources: S={Single}, 4P={4P Sofa}, 6P={6P Sofa}, B={Baby Chair}, W={Wheelchair}\n\n";
      
      // Initial resources
      let s = 10, p4 = 4, p6 = 2, b = 4, w = 2;

      $allEvents.forEach(event => {
        const customer = $customerConfigStore.find(c => c.familyId === event.familyId);
        if (!customer) return;

        const threadId = Math.floor(Math.random() * 900000) + 100000;
        const type = event.type;
        const id = event.familyId;
        
        let actionResult = "";
        let requirements = `${customer.partySize} seats`;
        if (customer.babyChairCount > 0) requirements += `, ${customer.babyChairCount} baby_chair`;
        if (customer.wheelchairCount > 0) requirements += `, ${customer.wheelchairCount} wheelchair`;

        if (type === 'ARRIVAL') {
          actionResult = "arrived";
        } else if (type === 'SEATED') {
          actionResult = `seated, id:[${event.seatId || '?'}]`;
          if (event.seatId?.startsWith('S')) s--;
          else if (event.seatId?.startsWith('4P')) p4--;
          else if (event.seatId?.startsWith('6P')) p6--;
          b -= customer.babyChairCount;
          w -= customer.wheelchairCount;
        } else if (type === 'LEFT') {
          actionResult = `release, id:[${event.seatId || '?'}]`;
          if (event.seatId?.startsWith('S')) s++;
          else if (event.seatId?.startsWith('4P')) p4++;
          else if (event.seatId?.startsWith('6P')) p6++;
          b += customer.babyChairCount;
          w += customer.wheelchairCount;
        }

        output += `[${threadId}] [${event.timestamp}] [${customer.type}] ID: ${id} | Requirements: ${requirements} | ${actionResult} | Remaining: S=${s}, 4P=${p4}, 6P=${p6}, B=${b}, W=${w}\n`;
      });

      downloadFile(output, 'sushi-sync-report.txt', 'text/plain');
      simActions.setLoading(false);
    }, 800);
  }

  async function exportCSV() {
    simActions.setLoading(true);
    setTimeout(() => {
      let csv = 'id,arrival_time,type,party_size,baby_chair,wheel_chair,est_dining_time\n';

      $customerConfigStore.forEach(c => {
        csv += `${c.id},${c.arrivalTime},${c.type},${c.partySize},${c.babyChairCount},${c.wheelchairCount},${c.estDiningTime}\n`;
      });

      downloadFile(csv, 'customers.csv', 'text/csv');
      simActions.setLoading(false);
    }, 500);
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
  size="lg"
>
  <div class="space-y-6">

    <!-- Summary -->
    <Card variant="bordered" padding="md">
      <h3 class="text-sm font-medium text-nezumi mb-3">Export Summary</h3>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="flex items-center justify-between bg-washi p-2 rounded border border-hinoki/20">
          <span class="text-nezumi">Duration:</span>
          <span class="text-ai font-mono font-bold">{formatTime(stats.duration)}</span>
        </div>
        <div class="flex items-center justify-between bg-washi p-2 rounded border border-hinoki/20">
          <span class="text-nezumi">Events:</span>
          <span class="text-ai font-mono font-bold">{$allEvents.length}</span>
        </div>
        <div class="flex items-center justify-between bg-washi p-2 rounded border border-hinoki/20">
          <span class="text-nezumi">Seats:</span>
          <span class="text-ai font-mono font-bold">{$seatConfigStore.length}</span>
        </div>
        <div class="flex items-center justify-between bg-washi p-2 rounded border border-hinoki/20">
          <span class="text-nezumi">Customers:</span>
          <span class="text-ai font-mono font-bold">{$customerConfigStore.length}</span>
        </div>
      </div>
    </Card>

    <!-- Export Options -->
    <div class="space-y-3">
      <h3 class="text-sm font-medium text-muted">Export Format</h3>

      <button
        onclick={exportJSON}
        class="w-full flex items-center gap-4 p-4 bg-white rounded-lg border border-hinoki hover:border-ocean transition-all hover:shadow-md group"
      >
        <div class="w-12 h-12 bg-ocean/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <FileText class="w-6 h-6 text-ocean" />
        </div>
        <div class="flex-1">
          <div class="font-medium text-sumi">JSON Export</div>
          <div class="text-xs text-nezumi">Complete data with all configurations and events</div>
        </div>
        <Badge variant="info" size="sm">Recommended</Badge>
      </button>

      <button
        onclick={exportTXT}
        class="w-full flex items-center gap-4 p-4 bg-white rounded-lg border border-hinoki hover:border-matcha transition-all hover:shadow-md group"
      >
        <div class="w-12 h-12 bg-matcha/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <FileText class="w-6 h-6 text-matcha" />
        </div>
        <div class="flex-1">
          <div class="font-medium text-sumi">Text Report (Rule Format)</div>
          <div class="text-xs text-nezumi">Formatted according to Version2/output_rule.txt</div>
        </div>
      </button>

      <button
        onclick={exportCSV}
        class="w-full flex items-center gap-4 p-4 bg-white rounded-lg border border-hinoki hover:border-salmon transition-all hover:shadow-md group"
      >
        <div class="w-12 h-12 bg-salmon/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <FileSpreadsheet class="w-6 h-6 text-salmon" />
        </div>
        <div class="flex-1">
          <div class="font-medium text-sumi">CSV Customers</div>
          <div class="text-xs text-nezumi">Customer list in Version2/base.csv format</div>
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
    <div class="flex justify-end w-full">
      <Button variant="primary" onclick={closeExportModal}>Close</Button>
    </div>
  {/snippet}
</Modal>
