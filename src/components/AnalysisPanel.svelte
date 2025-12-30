<script lang="ts">
  import { BarChart3, Clock, Users, AlertTriangle, TrendingUp, Activity } from 'lucide-svelte';
  import Card from './ui/Card.svelte';
  import Badge from './ui/Badge.svelte';
  import { simulationStats, simulationStore, isSimulationComplete } from '../stores/simulation';
  import { selectionStore } from '../stores/selection';
  import { customerConfigStore, seatConfigStore, totalCapacity } from '../stores/config';
  import { formatTime } from '../stores/playback';

  $: stats = $simulationStats;
  $: hasSelection = $selectionStore.selectedSeatIds.length > 0 || $selectionStore.selectedFamilyIds.length > 0;



  // Get selected family details
  $: selectedFamilyDetails = getSelectedFamilyDetails();

  function getSelectedFamilyDetails() {
    if ($selectionStore.selectedFamilyIds.length === 0) return null;

    const familyId = $selectionStore.selectedFamilyIds[0];
    const customer = $customerConfigStore.find(c => c.familyId === familyId);
    if (!customer) return null;

    const events = $simulationStore.frames
      .flatMap(f => f.events)
      .filter(e => e.familyId === familyId)
      .sort((a, b) => a.timestamp - b.timestamp);

    return { customer, events };
  }

  // Get selected seat details
  $: selectedSeatDetails = getSelectedSeatDetails();

  function getSelectedSeatDetails() {
    if ($selectionStore.selectedSeatIds.length === 0) return null;

    const seatId = $selectionStore.selectedSeatIds[0];
    const config = $seatConfigStore.find(s => s.id === seatId);

    const occupancyHistory = $simulationStore.frames
      .map(f => ({
        timestamp: f.timestamp,
        occupiedBy: f.seats.find(s => s.id === seatId)?.occupiedBy
      }))
      .filter(h => h.occupiedBy !== null);

    return { config, occupancyHistory };
  }
</script>

<Card variant="elevated" padding="md" class="h-full">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-hinoki">📈 Analysis Panel</h2>
    <Badge variant="info" size="sm">
      <Activity class="w-3 h-3 mr-1" />
      Live Stats
    </Badge>
  </div>

  {#if $isSimulationComplete}
    <!-- OS-Style Statistics Grid -->
    <div class="grid grid-cols-1 gap-4 mb-8">
      <!-- Throughput Card -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="p-2 bg-blue-50 rounded-lg">
              <Clock class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Throughput</div>
              <div class="text-[10px] text-slate-400">系統吞吐量 (每秒處理家庭數)</div>
            </div>
          </div>
          <div class="text-2xl font-black text-blue-700">{stats.throughput.toFixed(2)}</div>
        </div>
      </div>

      <!-- Turnaround Card -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="p-2 bg-indigo-50 rounded-lg">
              <Users class="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Turnaround</div>
              <div class="text-[10px] text-slate-400">平均周轉時間 (抵達到離開)</div>
            </div>
          </div>
          <div class="text-2xl font-black text-indigo-700">{formatTime(stats.averageTurnaroundTime)}</div>
        </div>
      </div>

      <!-- Wait Time Card -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp class="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Wait Time</div>
              <div class="text-[10px] text-slate-400">平均等待時間 (在隊列中時間)</div>
            </div>
          </div>
          <div class="text-2xl font-black text-emerald-700">{formatTime(stats.averageWaitTime)}</div>
        </div>
      </div>

      <!-- Contention Card -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="p-2 bg-rose-50 rounded-lg">
              <AlertTriangle class="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Resource Contention</div>
              <div class="text-[10px] text-slate-400">資源競爭次數 (發生等待次數)</div>
            </div>
          </div>
          <div class="text-2xl font-black text-rose-700">{stats.totalConflicts}</div>
        </div>
      </div>
    </div>



    <!-- Selection Details -->
    {#if selectedFamilyDetails}
      <div class="border-t border-hinoki/30 pt-4">
        <h3 class="text-sm font-medium text-muted mb-2">Family {selectedFamilyDetails.customer.familyId} Details</h3>
        <div class="text-sm space-y-1">
          <p><span class="text-muted">Type:</span> {selectedFamilyDetails.customer.type}</p>
          <p><span class="text-muted">Party Size:</span> {selectedFamilyDetails.customer.partySize}</p>
          <p><span class="text-muted">Arrival:</span> {formatTime(selectedFamilyDetails.customer.arrivalTime)}</p>
          <p><span class="text-muted">Events:</span> {selectedFamilyDetails.events.length}</p>
        </div>
      </div>
    {:else if selectedSeatDetails}
      <div class="border-t border-hinoki/30 pt-4">
        <h3 class="text-sm font-medium text-muted mb-2">Seat {selectedSeatDetails.config?.id} Details</h3>
        <div class="text-sm space-y-1">
          <p><span class="text-muted">Type:</span> {selectedSeatDetails.config?.type}</p>
          <p><span class="text-muted">Wheelchair:</span> {selectedSeatDetails.config?.isWheelchairAccessible ? 'Yes' : 'No'}</p>
          <p><span class="text-muted">Times Used:</span> {selectedSeatDetails.occupancyHistory.length}</p>
        </div>
      </div>
    {/if}

  {:else}
    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 class="w-12 h-12 text-muted mb-4" />
      <p class="text-muted">Run simulation to see analysis</p>
      <p class="text-xs text-muted mt-1">Configure customers and press play</p>
    </div>
  {/if}

  <!-- Summary Footer -->
  <div class="mt-auto pt-4 border-t border-hinoki/30 text-xs text-muted">
    <div class="flex justify-between">
      <span>Total Capacity: {$totalCapacity}</span>
      <span>Customers: {$customerConfigStore.length}</span>
    </div>
  </div>
</Card>
