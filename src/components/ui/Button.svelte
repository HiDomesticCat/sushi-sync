<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    children?: Snippet;
    variant?: Variant;
    size?: Size;
    class?: string;
    [key: string]: any;
  }

  let { 
    children, 
    variant = 'primary', 
    size = 'md', 
    class: className = '', 
    ...rest 
  }: Props = $props();

  const VARIANTS: Record<Variant, string> = {
    primary: 'bg-primary text-white border-2 border-primary hover:bg-primary/90 hover:border-primary/90 shadow-sm',
    secondary: 'bg-bg-panel text-text-main border border-border hover:bg-border/20 hover:border-border shadow-sm',
    danger: 'bg-error/10 text-error border border-error/20 hover:bg-error/20 hover:border-error/30',
    success: 'bg-success/10 text-success border border-success/20 hover:bg-success/20 hover:border-success/30',
    ghost: 'bg-transparent text-text-muted hover:text-text-main hover:bg-black/5'
  };

  const SIZES: Record<Size, string> = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  let classes = $derived(`
    inline-flex items-center justify-center font-mono transition-all duration-200 
    disabled:opacity-50 disabled:cursor-not-allowed
    ${VARIANTS[variant]} 
    ${SIZES[size]} 
    ${className}
  `);
</script>

<button class={classes} {...rest}>
  {@render children?.()}
</button>
