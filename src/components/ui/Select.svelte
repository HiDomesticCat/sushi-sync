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
    id?: string;
  }

  let { 
    options,
    value = $bindable(''),
    label = '',
    placeholder = 'Select an option...',
    disabled = false,
    required = false,
    class: className = '',
    id = '',
    ...props
  }: Props = $props();

  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = 'w-full px-4 py-2 bg-sumi border-2 border-hinoki rounded-lg text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ocean focus:border-ocean focus:ring-offset-2 focus:ring-offset-panel disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer';
  
  const classes = `${baseClasses} ${className}`;
</script>

<div class="space-y-2">
  {#if label}
    <label for={selectId} class="block text-sm font-medium text-primary">
      {label}
      {#if required}
        <span class="text-salmon ml-1">*</span>
      {/if}
    </label>
  {/if}
  
  <div class="relative">
    <select
      id={selectId}
      {disabled}
      {required}
      bind:value
      class={classes}
      {...props}
    >
      {#if placeholder}
        <option value="" disabled selected={!value} class="text-muted">
          {placeholder}
        </option>
      {/if}
      
      {#each options as option}
        <option value={option.value} class="bg-panel text-primary">
          {option.label}
        </option>
      {/each}
    </select>
    
    <!-- Custom dropdown arrow -->
    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
      <svg class="w-5 h-5 text-hinoki transition-transform duration-200 {disabled ? 'opacity-50' : ''}" 
           fill="none" 
           stroke="currentColor" 
           viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
    
    <!-- Focus ring effect -->
    <div class="absolute inset-0 rounded-lg pointer-events-none transition-all duration-200 ring-0 focus-within:ring-2 focus-within:ring-ocean/20"></div>
  </div>
</div>

<style>
  select {
    position: relative;
    background-image: none;
  }
  
  /* Remove default arrow in different browsers */
  select::-ms-expand {
    display: none;
  }
  
  select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }
  
  /* Subtle inner shadow for depth */
  select:not(:focus) {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  /* Smooth focus transition */
  select:focus {
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.1),
      0 0 0 3px rgba(130, 170, 255, 0.1);
  }
  
  /* Hover effect */
  select:hover:not(:disabled) {
    border-color: var(--color-ocean);
  }
  
  /* Rotate arrow on focus */
  select:focus + div svg {
    transform: rotate(180deg);
  }
  
  /* Option styling */
  select option {
    background-color: var(--color-panel);
    color: var(--color-primary);
    padding: 8px 12px;
  }
  
  select option:hover {
    background-color: var(--color-ocean);
  }
  
  select option:disabled {
    color: var(--color-muted);
    background-color: rgba(37, 37, 37, 0.5);
  }
  
  /* Disabled state */
  select:disabled {
    background-color: rgba(37, 37, 37, 0.5);
    color: var(--color-muted);
    cursor: not-allowed;
  }
</style>