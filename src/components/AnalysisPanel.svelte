<script lang="ts">
  import { BarChart3, Clock, Users, AlertTriangle, TrendingUp, Activity } from 'lucide-svelte';
  import Card from './ui/Card.svelte';
  import Badge from './ui/Badge.svelte';
  import { simulationStats, simulationStore, isSimulationComplete } from '../stores/simulation';
  import { selectionStore } from '../stores/selection';
  import { customerConfigStore, seatConfigStore, totalCapacity } from '../stores/config';
  import { formatTime } from '../stores/playback';

  $: stats = $simulationStats;
  $: hasSelection = $selectionStore.selectedSeats.length > 0 || $selectionStore.selectedFamilies.length > 0;

  // Calculate seat utilization by type
  $: seatUtilByType = calculateSeatUtilization();

  function calculateSeatUtilization() {
    if ($simulationStore.frames.length === 0) return { single: 0, fourP: 0, sixP: 0 };

    let singleTotal = 0, singleOccupied = 0;
    let fourPTotal = 0, fourPOccupied = 0;
    let sixPTotal = 0, sixPOccupied = 0;

    $simulationStore.frames.forEach(frame => {
      frame.seats.forEach(seat => {
        if (seat.type === 'SINGLE') {
          singleTotal++;
          if (seat.occupiedBy) singleOccupied++;
        } else if (seat.type === '4P') {
          fourPTotal++;
          if (seat.occupiedBy) fourPOccupied++;
        } else if (seat.type === '6P') {
          sixPTotal++;
          if (seat.occupiedBy) sixPOccupied++;
        }
      });
    });

    return {
      single: singleTotal > 0 ? Math.round((singleOccupied / singleTotal) * 100) : 0,
      fourP: fourPTotal > 0 ? Math.round((fourPOccupied / fourPTotal) * 100) : 0,
      sixP: sixPTotal > 0 ? Math.round((sixPOccupied / sixPTotal) * 100) : 0
    };
  }

  // Get selected family details
  $: selectedFamilyDetails = getSelectedFamilyDetails();

  function getSelectedFamilyDetails() {
    if ($selectionStore.selectedFamilies.length === 0) return null;

    const familyId = $selectionStore.selectedFamilies[0];
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
    if ($selectionStore.selectedSeats.length === 0) return null;

    const seatId = $selectionStore.selectedSeats[0];
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
    <!-- Statistics Grid -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="bg-sumi rounded-lg p-3">
        <div class="flex items-center gap-2 text-muted mb-1">
          <Clock class="w-4 h-4" />
          <span class="text-xs">Duration</span>
        </div>
        <div class="text-xl font-bold text-primary">{formatTime(stats.duration)}</div>
      </div>

      <div class="bg-sumi rounded-lg p-3">
        <div class="flex items-center gap-2 text-muted mb-1">
          <Users class="w-4 h-4" />
          <span class="text-xs">Peak Waiting</span>
        </div>
        <div class="text-xl font-bold text-ocean">{stats.maxWaitingCustomers}</div>
      </div>

      <div class="bg-sumi rounded-lg p-3">
        <div class="flex items-center gap-2 text-muted mb-1">
          <TrendingUp class="w-4 h-4" />
          <span class="text-xs">Avg Wait</span>
        </div>
        <div class="text-xl font-bold text-matcha">{formatTime(stats.averageWaitTime)}</div>
      </div>

      <div class="bg-sumi rounded-lg p-3">
        <div class="flex items-center gap-2 text-muted mb-1">
          <AlertTriangle class="w-4 h-4" />
          <span class="text-xs">Conflicts</span>
        </div>
        <div class="text-xl font-bold text-salmon">{stats.totalConflicts}</div>
      </div>
    </div>

    <!-- Seat Utilization -->
    <div class="mb-6">
      <h3 class="text-sm font-medium text-muted mb-3">Seat Utilization</h3>
      <div class="space-y-2">
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-muted">Single Seats</span>
            <span class="text-primary">{seatUtilByType.single}%</span>
          </div>
          <div class="h-2 bg-sumi rounded-full overflow-hidden">
            <div class="h-full bg-salmon transition-all" style="width: {seatUtilByType.single}%"></div>
          </div>
        </div>
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-muted">4-Person Tables</span>
            <span class="text-primary">{seatUtilByType.fourP}%</span>
          </div>
          <div class="h-2 bg-sumi rounded-full overflow-hidden">
            <div class="h-full bg-ocean transition-all" style="width: {seatUtilByType.fourP}%"></div>
          </div>
        </div>
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-muted">6-Person Tables</span>
            <span class="text-primary">{seatUtilByType.sixP}%</span>
          </div>
          <div class="h-2 bg-sumi rounded-full overflow-hidden">
            <div class="h-full bg-matcha transition-all" style="width: {seatUtilByType.sixP}%"></div>
          </div>
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
          <p><span class="text-muted">Baby Chair:</span> {selectedSeatDetails.config?.canAttachBabyChair ? 'Yes' : 'No'}</p>
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
