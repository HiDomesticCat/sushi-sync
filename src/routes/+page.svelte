<script lang="ts">
  import Header from '../components/Header.svelte';
  import SeatConfigModal from '../components/SeatConfigModal.svelte';
  import Card from '../components/ui/Card.svelte';
  import Badge from '../components/ui/Badge.svelte';
  import { customerConfigStore, seatConfigStore } from '../stores/config';
  import { simulationStore } from '../stores/simulation';
  import { playbackStore } from '../stores/playback';

  // Reactive state for dashboard
  $: customerCount = $customerConfigStore.length;
  $: seatCount = $seatConfigStore.length;
  $: isSimulationRunning = $simulationStore.isRunning;
  $: isSimulationComplete = $simulationStore.isComplete;
  $: currentTime = $playbackStore.currentTime;
</script>

<div class="min-h-screen bg-sumi">
  <Header />
  
  <!-- Main content with top padding to account for fixed header -->
  <main class="pt-20 px-6 pb-6">
    <div class="max-w-7xl mx-auto">
      
      <!-- Welcome Section -->
      <div class="text-center mb-12">
        <h1 class="text-5xl font-bold mb-4 text-hinoki">
          🍣 Sushi Sync
        </h1>
        <p class="text-xl text-muted mb-6">
          Restaurant Simulator for Operating Systems Course
        </p>
        <div class="flex justify-center gap-3">
          <Badge variant="dining">Stage 3 Complete</Badge>
          <Badge variant="waiting">Stores & Header</Badge>
        </div>
      </div>

      <!-- Status Dashboard -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <!-- Seat Status -->
        <Card variant="elevated" padding="lg">
          <div class="text-center">
            <div class="text-3xl font-bold text-hinoki mb-2">{seatCount}</div>
            <div class="text-sm text-muted">Seats Configured</div>
            {#if seatCount === 0}
              <div class="mt-2">
                <Badge variant="conflict" size="sm">Configure Required</Badge>
              </div>
            {:else}
              <div class="mt-2">
                <Badge variant="dining" size="sm">Ready</Badge>
              </div>
            {/if}
          </div>
        </Card>

        <!-- Customer Status -->
        <Card variant="elevated" padding="lg">
          <div class="text-center">
            <div class="text-3xl font-bold text-ocean mb-2">{customerCount}</div>
            <div class="text-sm text-muted">Customers Configured</div>
            {#if customerCount === 0}
              <div class="mt-2">
                <Badge variant="conflict" size="sm">Configure Required</Badge>
              </div>
            {:else}
              <div class="mt-2">
                <Badge variant="dining" size="sm">Ready</Badge>
              </div>
            {/if}
          </div>
        </Card>

        <!-- Simulation Status -->
        <Card variant="elevated" padding="lg">
          <div class="text-center">
            <div class="text-3xl font-bold text-matcha mb-2">
              {#if isSimulationRunning}
                ▶
              {:else if isSimulationComplete}
                ✓
              {:else}
                ⏸
              {/if}
            </div>
            <div class="text-sm text-muted">Simulation Status</div>
            <div class="mt-2">
              {#if isSimulationRunning}
                <Badge variant="waiting" size="sm">Running</Badge>
              {:else if isSimulationComplete}
                <Badge variant="dining" size="sm">Complete</Badge>
              {:else}
                <Badge variant="default" size="sm">Ready</Badge>
              {/if}
            </div>
          </div>
        </Card>

        <!-- Current Time -->
        <Card variant="elevated" padding="lg">
          <div class="text-center">
            <div class="text-3xl font-bold text-salmon mb-2 font-mono">
              {Math.floor(currentTime)}s
            </div>
            <div class="text-sm text-muted">Current Time</div>
            <div class="mt-2">
              <Badge variant="waiting" size="sm">Timeline</Badge>
            </div>
          </div>
        </Card>

        <!-- Frame Count -->
        <Card variant="elevated" padding="lg">
          <div class="text-center">
            <div class="text-3xl font-bold text-hinoki mb-2">{$simulationStore.frames.length}</div>
            <div class="text-sm text-muted">Simulation Frames</div>
            <div class="mt-2">
              <Badge variant="default" size="sm">Data Points</Badge>
            </div>
          </div>
        </Card>
      </div>

      <!-- Instructions Section -->
      <Card variant="elevated" padding="lg" class="mb-8">
        <h2 class="text-2xl font-semibold mb-6 text-hinoki">Getting Started</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <!-- Step 1 -->
          <div class="text-center">
            <div class="w-12 h-12 bg-ocean rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-xl font-bold text-primary">1</span>
            </div>
            <h3 class="text-lg font-medium mb-2 text-primary">Configure Seats</h3>
            <p class="text-sm text-muted mb-4">
              Set up your restaurant layout with single seats, 4-person tables, and 6-person tables. 
              Configure wheelchair accessibility and baby chair options.
            </p>
            <Badge variant="default" size="sm">🪑 Seat Config</Badge>
          </div>

          <!-- Step 2 -->
          <div class="text-center">
            <div class="w-12 h-12 bg-matcha rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-xl font-bold text-sumi">2</span>
            </div>
            <h3 class="text-lg font-medium mb-2 text-primary">Add Customers</h3>
            <p class="text-sm text-muted mb-4">
              Define customer arrivals, party sizes, and special requirements. 
              Import from CSV or create manually with arrival times and preferences.
            </p>
            <Badge variant="default" size="sm">👥 Customer Config</Badge>
          </div>

          <!-- Step 3 -->
          <div class="text-center">
            <div class="w-12 h-12 bg-salmon rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-xl font-bold text-primary">3</span>
            </div>
            <h3 class="text-lg font-medium mb-2 text-primary">Run Simulation</h3>
            <p class="text-sm text-muted mb-4">
              Press the red call bell to start the simulation. 
              Watch the timeline and analyze resource conflicts and scheduling efficiency.
            </p>
            <Badge variant="default" size="sm">▶ Start Simulation</Badge>
          </div>
        </div>
      </Card>

      <!-- Features Overview -->
      <Card variant="elevated" padding="lg">
        <h2 class="text-2xl font-semibold mb-6 text-hinoki">System Features</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <!-- Left Column -->
          <div>
            <h3 class="text-lg font-medium mb-4 text-primary">🏗️ Architecture & Design</h3>
            <ul class="space-y-2 text-sm text-muted">
              <li>• <strong>Modern Zen Theme:</strong> Japanese-inspired UI with wood textures and traditional patterns</li>
              <li>• <strong>SvelteKit 5:</strong> Latest reactive framework with TypeScript support</li>
              <li>• <strong>Tailwind CSS v4:</strong> Custom design system with semantic color variables</li>
              <li>• <strong>Component Library:</strong> Reusable UI components with accessibility features</li>
              <li>• <strong>State Management:</strong> Svelte stores for configuration, simulation, and UI state</li>
            </ul>
          </div>

          <!-- Right Column -->
          <div>
            <h3 class="text-lg font-medium mb-4 text-primary">⚙️ Simulation Engine</h3>
            <ul class="space-y-2 text-sm text-muted">
              <li>• <strong>Multi-threading Visualization:</strong> See resource contention in real-time</li>
              <li>• <strong>Timeline Playback:</strong> Step through simulation frames with speed controls</li>
              <li>• <strong>Conflict Detection:</strong> Identify scheduling conflicts and resource bottlenecks</li>
              <li>• <strong>Data Export:</strong> Export simulation logs and analysis for further study</li>
              <li>• <strong>Interactive Selection:</strong> Click and analyze specific customers or seats</li>
            </ul>
          </div>
        </div>
      </Card>

    </div>
  </main>

  <!-- Modals -->
  <SeatConfigModal />
</div>