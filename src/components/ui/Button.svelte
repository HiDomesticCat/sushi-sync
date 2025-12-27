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
    primary: 'bg-sumi text-text-offwhite border-2 border-border-hinoki hover:bg-border-hinoki hover:text-bg-sumi',
    secondary: 'bg-panel text-text-muted border border-border-hinoki/20 hover:border-border-hinoki hover:text-text-offwhite',
    danger: 'bg-accent-salmon/10 text-accent-salmon border border-accent-salmon/50 hover:bg-accent-salmon hover:text-bg-sumi',
    success: 'bg-accent-matcha/10 text-accent-matcha border border-accent-matcha/50 hover:bg-accent-matcha hover:text-bg-sumi',
    ghost: 'bg-transparent text-text-muted hover:text-text-offwhite'
  };

  const SIZES: Record<Size, string> = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  // Using $derived to generate classes reactively
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
