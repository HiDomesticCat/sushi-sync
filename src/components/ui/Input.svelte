<script lang="ts">
  interface Props {
    type?: string;
    placeholder?: string;
    value?: string | number;
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
    : 'border-hinoki focus:border-ocean focus:ring-ocean';
</script>

<div class="space-y-1">
  {#if label}
    <label for={inputId} class="block text-sm font-medium text-primary">
      {label}
      {#if required}<span class="text-salmon ml-1">*</span>{/if}
    </label>
  {/if}

  <input
    {id}
    {type}
    {placeholder}
    {disabled}
    {required}
    bind:value
    class="{baseClasses} {stateClasses} {className}"
    {...props}
  />

  {#if error}
    <p class="text-sm text-salmon">{error}</p>
  {/if}
</div>
