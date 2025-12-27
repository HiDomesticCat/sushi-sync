<script lang="ts">
  import Modal from './ui/Modal.svelte';
  import Card from './ui/Card.svelte';
  import Button from './ui/Button.svelte';
  import Select from './ui/Select.svelte';
  import Badge from './ui/Badge.svelte';
  import { Plus, Trash2, Upload, Download } from 'lucide-svelte';
  import { customerConfigStore, addCustomer, removeCustomer, clearCustomers, importCustomersFromCSV, exportCustomersToCSV } from '../stores/config';
  import { uiStore, closeCustomerConfigModal } from '../stores/ui';
  import type { CustomerConfig, CustomerType } from '../types';

  // Form state
  let arrivalTime = $state(0);
  let partySize = $state(1);
  let customerType = $state<CustomerType>('INDIVIDUAL');
  let needsBabyChair = $state(false);
  let needsWheelchair = $state(false);
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
      needsBabyChair: needsBabyChair || customerType === 'WITH_BABY',
      needsWheelchair: needsWheelchair || customerType === 'WHEELCHAIR',
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
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          importCustomersFromCSV(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  function handleExport() {
    const csv = exportCustomersToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function addSampleData() {
    const samples: CustomerConfig[] = [
      { id: 1, familyId: 1, arrivalTime: 0, type: 'INDIVIDUAL', partySize: 1, needsBabyChair: false, needsWheelchair: false, estimatedDiningTime: 20 },
      { id: 2, familyId: 2, arrivalTime: 5, type: 'FAMILY', partySize: 4, needsBabyChair: false, needsWheelchair: false, estimatedDiningTime: 45 },
      { id: 3, familyId: 3, arrivalTime: 10, type: 'WITH_BABY', partySize: 3, needsBabyChair: true, needsWheelchair: false, estimatedDiningTime: 40 },
      { id: 4, familyId: 4, arrivalTime: 15, type: 'INDIVIDUAL', partySize: 2, needsBabyChair: false, needsWheelchair: false, estimatedDiningTime: 25 },
      { id: 5, familyId: 5, arrivalTime: 20, type: 'WHEELCHAIR', partySize: 2, needsBabyChair: false, needsWheelchair: true, estimatedDiningTime: 35 },
      { id: 6, familyId: 6, arrivalTime: 25, type: 'FAMILY', partySize: 6, needsBabyChair: true, needsWheelchair: false, estimatedDiningTime: 50 },
      { id: 7, familyId: 7, arrivalTime: 30, type: 'INDIVIDUAL', partySize: 1, needsBabyChair: false, needsWheelchair: false, estimatedDiningTime: 15 },
      { id: 8, familyId: 8, arrivalTime: 35, type: 'FAMILY', partySize: 3, needsBabyChair: false, needsWheelchair: false, estimatedDiningTime: 40 },
    ];
    customerConfigStore.set(samples);
  }

  function getTypeIcon(type: CustomerType): string {
    switch (type) {
      case 'INDIVIDUAL': return '👤';
      case 'FAMILY': return '👨‍👩‍👧';
      case 'WITH_BABY': return '👶';
      case 'WHEELCHAIR': return '♿';
      default: return '👤';
    }
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
          <label class="block text-sm font-medium text-text-main mb-1">Arrival (sec)</label>
          <input
            type="number"
            bind:value={arrivalTime}
            min="0"
            class="w-full px-3 py-2 bg-bg-panel border-2 border-border rounded-lg text-text-main"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-text-main mb-1">Party Size</label>
          <input
            type="number"
            bind:value={partySize}
            min="1"
            max="10"
            class="w-full px-3 py-2 bg-bg-panel border-2 border-border rounded-lg text-text-main"
          />
        </div>

        <div>
          <Select label="Type" options={typeOptions} bind:value={customerType} />
        </div>

        <div>
          <label class="block text-sm font-medium text-text-main mb-1">Duration (min)</label>
          <input
            type="number"
            bind:value={diningTime}
            min="10"
            max="120"
            class="w-full px-3 py-2 bg-bg-panel border-2 border-border rounded-lg text-text-main"
          />
        </div>

        <div class="flex flex-col justify-end gap-1">
          <label class="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" bind:checked={needsBabyChair} class="accent-success" />
            <span class="text-text-main">Baby Chair</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" bind:checked={needsWheelchair} class="accent-primary" />
            <span class="text-text-main">Wheelchair</span>
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
                <th class="py-2 px-2">Arrival</th>
                <th class="py-2 px-2">Party</th>
                <th class="py-2 px-2">Duration</th>
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
                  <td class="py-2 px-2">{customer.estimatedDiningTime}m</td>
                  <td class="py-2 px-2">
                    {#if customer.needsBabyChair}<Badge variant="info" size="sm">👶</Badge>{/if}
                    {#if customer.needsWheelchair}<Badge variant="waiting" size="sm">♿</Badge>{/if}
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
