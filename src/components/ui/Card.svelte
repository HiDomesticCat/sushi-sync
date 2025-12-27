<script lang="ts">
  interface Props {
    variant?: 'default' | 'elevated' | 'bordered';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    class?: string;
  }

  let {
    variant = 'default',
    padding = 'md',
    class: className = ''
  }: Props = $props();

  const baseClasses = 'bg-panel rounded-lg';

  const variantClasses = {
    default: 'border border-hinoki/30',
    elevated: 'border border-hinoki shadow-lg shadow-black/20',
    bordered: 'border-2 border-hinoki'
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;
</script>

<div class={classes}>
  <slot />
</div>
