<script lang="ts">
  interface Props {
    type?: string;
    placeholder?: string;
    value?: string;
    label?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    class?: string;
    id?: string;
  }

  let { 
    type = 'text',
    placeholder = '',
    value = $bindable(''),
    label = '',
    error = '',
    disabled = false,
    required = false,
    class: className = '',
    id = '',
    ...props
  }: Props = $props();

  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = 'w-full px-4 py-2 bg-sumi border-2 rounded-lg text-primary placeholder-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel disabled:opacity-50 disabled:cursor-not-allowed';
  
  const stateClasses = error 
    ? 'border-salmon focus:border-salmon focus:ring-salmon' 
    : 'border-hinoki focus:border-ocean focus:ring-ocean hover:border-ocean/50';

  const classes = `${baseClasses} ${stateClasses} ${className}`;
</script>

<div class="space-y-2">
  {#if label}
    <label for={inputId} class="block text-sm font-medium text-primary">
      {label}
      {#if required}
        <span class="text-salmon ml-1">*</span>
      {/if}
    </label>
  {/if}
  
  <div class="relative">
    <input
      {id}
      {type}
      {placeholder}
      {disabled}
      {required}
      bind:value
      class={classes}
      {...props}
    />
    
    <!-- Focus ring effect -->
    <div class="absolute inset-0 rounded-lg pointer-events-none transition-all duration-200 {error ? 'ring-2 ring-salmon/20' : 'ring-0'} focus-within:ring-2 focus-within:ring-ocean/20"></div>
  </div>
  
  {#if error}
    <p class="text-sm text-salmon flex items-center gap-1">
      <span class="text-xs">⚠</span>
      {error}
    </p>
  {/if}
</div>

<style>
  input {
    position: relative;
  }
  
  /* Custom placeholder styling */
  input::placeholder {
    color: var(--color-muted);
    opacity: 0.7;
  }
  
  /* Subtle inner shadow for depth */
  input:not(:focus) {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  /* Smooth focus transition */
  input:focus {
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.1),
      0 0 0 3px rgba(130, 170, 255, 0.1);
  }
  
  /* Error state styling */
  input:global(.border-salmon):focus {
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.1),
      0 0 0 3px rgba(255, 126, 103, 0.1);
  }
  
  /* Disabled state */
  input:disabled {
    background-color: rgba(37, 37, 37, 0.5);
    color: var(--color-muted);
  }
</style>