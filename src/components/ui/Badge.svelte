<script lang="ts">
  type Props = {
    variant?: 'default' | 'waiting' | 'dining' | 'conflict' | 'info';
    size?: 'sm' | 'md';
    class?: string;
    children?: import('svelte').Snippet;
  };

  let { variant = 'default', size = 'md', class: className = '', children }: Props = $props();

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full border-2';

  const variantClasses = {
    default: 'bg-panel text-muted border-muted',
    waiting: 'bg-ocean/20 text-ocean border-ocean',
    dining: 'bg-matcha/20 text-matcha border-matcha',
    conflict: 'bg-salmon/20 text-salmon border-salmon',
    info: 'bg-hinoki/20 text-hinoki border-hinoki'
  } satisfies Record<string, string>;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  } satisfies Record<string, string>;

  let classes = $derived(`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`);
</script>

<span class={classes}>
  {@render children?.()}
</span>
