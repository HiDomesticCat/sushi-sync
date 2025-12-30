<script lang="ts">
  import Modal from './ui/Modal.svelte';
  import Card from './ui/Card.svelte';
  import Button from './ui/Button.svelte';
  import Select from './ui/Select.svelte';
  import Badge from './ui/Badge.svelte';
  import { Plus, Trash2, Upload, Download, Wand2 } from 'lucide-svelte';
  import { customerConfigStore, addCustomer, removeCustomer, clearCustomers, importCustomersFromCSV, exportCustomersToCSV, generateCustomersInRust } from '../stores/config';
  import { uiStore, closeCustomerConfigModal } from '../stores/ui';
  import { actions as simActions } from '../stores/simulation';
  import type { CustomerConfig, CustomerType } from '../types';

  // Form state
  let arrivalTime = $state(0);
  let partySize = $state(1);
  let customerType = $state<CustomerType>('INDIVIDUAL');
  let babyChairCount = $state(0);
  let wheelchairCount = $state(0);
  let diningTime = $state(30);

  const typeOptions = [
    { value: 'INDIVIDUAL', label: '👤 Individual' },
    { value: 'FAMILY', label: '👨‍👩‍👧 Family' },
    { value: 'WITH_BABY', label: '👶 With Baby' },
    { value: 'WHEELCHAIR', label: '♿ Wheelchair' }
  ];

  function getNextId(): number {
    const customers = $customerConfigStore;
    return customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1;
  }

  function getNextFamilyId(): number {
    const customers = $customerConfigStore;
    return customers.length > 0 ? Math.max(...customers.map(c => c.familyId)) + 1 : 1;
  }

  function handleAddCustomer() {
    const newCustomer: CustomerConfig = {
      id: getNextId(),
      familyId: getNextFamilyId(),
      arrivalTime: arrivalTime,
      type: customerType,
      partySize: partySize,
      babyChairCount: babyChairCount,
      wheelchairCount: wheelchairCount,
      estDiningTime: diningTime,
      estimatedDiningTime: diningTime
    };
    addCustomer(newCustomer);
    arrivalTime = Math.max(arrivalTime + 5, arrivalTime);
  }

  function handleRemove(id: number) {
    removeCustomer(id);
  }

  function handleClearAll() {
    if (confirm('Clear all customers?')) {
      clearCustomers();
    }
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        simActions.setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target?.result as string;
          await importCustomersFromCSV(content);
          simActions.setLoading(false);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  async function handleExport() {
    simActions.setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const csv = exportCustomersToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
    simActions.setLoading(false);
  }

  async function handleGenerate() {
    const count = parseInt(prompt("How many customers?", "20") || "0");
    if (count <= 0) return;
    const maxTime = parseInt(prompt("Max arrival time (seconds)?", "3600") || "0");
    if (maxTime <= 0) return;
    
    simActions.setLoading(true);
    await generateCustomersInRust(count, maxTime);
    simActions.setLoading(false);
  }

  function addSampleData() {
    const samples: CustomerConfig[] = [
      { id: 1, familyId: 1, arrivalTime: 0, type: 'INDIVIDUAL', partySize: 1, babyChairCount: 0, wheelchairCount: 0, estDiningTime: 20, estimatedDiningTime: 20 },
      { id: 2, familyId: 2, arrivalTime: 5, type: 'FAMILY', partySize: 4, babyChairCount: 0, wheelchairCount: 0, estDiningTime: 45, estimatedDiningTime: 45 },
      { id: 3, familyId: 3, arrivalTime: 10, type: 'WITH_BABY', partySize: 3, babyChairCount: 1, wheelchairCount: 0, estDiningTime: 40, estimatedDiningTime: 40 },
      { id: 4, familyId: 4, arrivalTime: 15, type: 'INDIVIDUAL', partySize: 2, babyChairCount: 0, wheelchairCount: 0, estDiningTime: 25, estimatedDiningTime: 25 },
      { id: 5, familyId: 5, arrivalTime: 20, type: 'WHEELCHAIR', partySize: 1, babyChairCount: 0, wheelchairCount: 1, estDiningTime: 35, estimatedDiningTime: 35 },
      { id: 6, familyId: 6, arrivalTime: 25, type: 'FAMILY', partySize: 6, babyChairCount: 1, wheelchairCount: 0, estDiningTime: 50, estimatedDiningTime: 50 },
      { id: 7, familyId: 7, arrivalTime: 30, type: 'WITH_BABY', partySize: 1, babyChairCount: 2, wheelchairCount: 0, estDiningTime: 40, estimatedDiningTime: 40 },
      { id: 8, familyId: 8, arrivalTime: 35, type: 'FAMILY', partySize: 3, babyChairCount: 0, wheelchairCount: 0, estDiningTime: 40, estimatedDiningTime: 40 },
    ];
    customerConfigStore.set(samples);
  }

  function getTypeIcon(type: string): string {
    const upperType = type.toUpperCase();
    if (upperType.includes('INDIVIDUAL')) return '👤';
    if (upperType.includes('FAMILY')) return '👨‍👩‍👧';
    if (upperType.includes('BABY')) return '👶';
    if (upperType.includes('WHEELCHAIR')) return '♿';
    return '👤';
  }
</script>

<Modal
  isOpen={$uiStore.isCustomerConfigModalOpen}
  title="👥 Customer Configuration"
  onClose={closeCustomerConfigModal}
  size="xl"
>
  <div class="space-y-6">

    <!-- Add Customer Form -->
    <Card variant="bordered" padding="md">
      <h3 class="text-lg font-semibold text-hinoki mb-4">Add New Customer</h3>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-main mb-1">
            Arrival (sec)
            <input
              type="number"
              bind:value={arrivalTime}
              min="0"
              class="w-full px-3 py-2 bg-bg-panel border-2 border-border rounded-lg text-text-main"
            />
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-main mb-1">
            Party Size
            <input
              type="number"
              bind:value={partySize}
              min="1"
              max="10"
              class="w-full px-3 py-2 bg-bg-panel border-2 border-border rounded-lg text-text-main"
            />
          </label>
        </div>

        <div>
          <Select label="Type" options={typeOptions} bind:value={customerType} />
        </div>

        <div>
          <label class="block text-sm font-medium text-text-main mb-1">
            Duration (sec)
            <input
              type="number"
              bind:value={diningTime}
              min="10"
              max="3600"
              class="w-full px-3 py-2 bg-bg-panel border-2 border-border rounded-lg text-text-main"
            />
          </label>
        </div>

        <div class="flex flex-col justify-end gap-1">
          <label class="block text-sm font-medium text-text-main mb-1">
            Baby Chairs
            <input
              type="number"
              bind:value={babyChairCount}
              min="0"
              class="w-full px-3 py-2 bg-bg-panel border-2 border-border rounded-lg text-text-main"
            />
          </label>
          <label class="block text-sm font-medium text-text-main mb-1">
            Wheelchairs
            <input
              type="number"
              bind:value={wheelchairCount}
              min="0"
              class="w-full px-3 py-2 bg-bg-panel border-2 border-border rounded-lg text-text-main"
            />
          </label>
        </div>

        <div class="flex items-end">
          <Button variant="success" onclick={handleAddCustomer} class="w-full">
            <Plus class="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>
    </Card>

    <!-- Customer List -->
    <Card variant="bordered" padding="md">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-text-main">
          Customers ({$customerConfigStore.length})
        </h3>
        <div class="flex gap-2">
          <Button variant="secondary" size="sm" onclick={handleGenerate}>
            <Wand2 class="w-4 h-4 mr-1" /> Generate
          </Button>
          <Button variant="secondary" size="sm" onclick={addSampleData}>Sample</Button>
          <Button variant="secondary" size="sm" onclick={handleImport}>
            <Upload class="w-4 h-4 mr-1" /> Import
          </Button>
          <Button variant="secondary" size="sm" onclick={handleExport} disabled={$customerConfigStore.length === 0}>
            <Download class="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {#if $customerConfigStore.length === 0}
        <div class="text-center py-8 text-text-muted">
          <p>No customers yet. Add manually or load sample data.</p>
        </div>
      {:else}
        <div class="max-h-64 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-bg-panel">
              <tr class="text-left text-text-muted border-b border-border">
                <th class="py-2 px-2">ID</th>
                <th class="py-2 px-2">Type</th>
                <th class="py-2 px-2">Arrival (s)</th>
                <th class="py-2 px-2">Party</th>
                <th class="py-2 px-2">Duration (s)</th>
                <th class="py-2 px-2">Needs</th>
                <th class="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {#each $customerConfigStore as customer}
                <tr class="border-b border-border/30 hover:bg-black/5">
                  <td class="py-2 px-2 font-mono">{customer.familyId}</td>
                  <td class="py-2 px-2">
                    <span class="text-lg mr-1">{getTypeIcon(customer.type)}</span>
                  </td>
                  <td class="py-2 px-2">{customer.arrivalTime}s</td>
                  <td class="py-2 px-2">{customer.partySize}</td>
                  <td class="py-2 px-2">{customer.estDiningTime}s</td>
                  <td class="py-2 px-2">
                    {#if customer.babyChairCount > 0}<Badge variant="info" size="sm">👶 {customer.babyChairCount}</Badge>{/if}
                    {#if customer.wheelchairCount > 0}<Badge variant="waiting" size="sm">♿ {customer.wheelchairCount}</Badge>{/if}
                  </td>
                  <td class="py-2 px-2">
                    <button onclick={() => handleRemove(customer.id)} class="text-accent hover:text-red-400 p-2 rounded hover:bg-red-50 transition-colors">
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card>
  </div>

  {#snippet footer()}
    <div class="flex justify-between w-full">
      <Button variant="danger" onclick={handleClearAll} disabled={$customerConfigStore.length === 0}>Clear All</Button>
      <Button variant="primary" onclick={closeCustomerConfigModal}>Done</Button>
    </div>
  {/snippet}
</Modal>
