<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    options: Option[];
    value?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    class?: string;
  }

  let {
    options,
    value = $bindable(''),
    label = '',
    placeholder = 'Select...',
    disabled = false,
    required = false,
    class: className = ''
  }: Props = $props();

  const selectId = `select-${Math.random().toString(36).substr(2, 9)}`;

  const baseClasses = 'w-full px-4 py-2 bg-sumi border-2 border-hinoki rounded-lg text-primary appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ocean focus:border-ocean disabled:opacity-50 disabled:cursor-not-allowed';
</script>

<div class="space-y-1">
  {#if label}
    <label for={selectId} class="block text-sm font-medium text-primary">
      {label}
      {#if required}<span class="text-salmon ml-1">*</span>{/if}
    </label>
  {/if}

  <div class="relative">
    <select
      id={selectId}
      {disabled}
      {required}
      bind:value
      class="{baseClasses} {className}"
    >
      {#if placeholder}
        <option value="" disabled>{placeholder}</option>
      {/if}
      {#each options as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>

    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
      <svg class="w-5 h-5 text-hinoki" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
</div>
