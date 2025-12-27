<script lang="ts">
  let {
    variant = 'default',
    padding = 'md',
    class: className = ''
  } = $props();

  const baseClasses = 'bg-panel rounded-lg';

  const variantClasses = {
    default: 'border border-hinoki/30',
    elevated: 'border border-hinoki shadow-lg shadow-black/20',
    bordered: 'border-2 border-hinoki'
  } satisfies Record<string, string>;

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  } satisfies Record<string, string>;

  let classes = $derived(`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`);
</script>

<div class={classes}>
  {@render children?.()}
</div>
