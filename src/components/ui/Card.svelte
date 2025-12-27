<script lang="ts">
  interface Props {
    variant?: 'default' | 'elevated';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    class?: string;
  }

  let { 
    variant = 'default', 
    padding = 'md',
    class: className = ''
  }: Props = $props();

  const baseClasses = 'bg-panel border border-hinoki rounded-lg';
  
  const variantClasses = {
    default: '',
    elevated: 'shadow-lg shadow-black/20'
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;
</script>

<div class={classes}>
  <slot />
</div>

<style>
  div {
    position: relative;
    overflow: hidden;
  }
  
  /* Subtle wood grain texture overlay */
  div::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(90deg, transparent 0%, rgba(224, 210, 194, 0.02) 50%, transparent 100%),
      linear-gradient(0deg, transparent 0%, rgba(224, 210, 194, 0.01) 50%, transparent 100%);
    background-size: 20px 20px, 40px 40px;
    pointer-events: none;
    z-index: 0;
  }
  
  /* Ensure content is above the texture */
  div > :global(*) {
    position: relative;
    z-index: 1;
  }
  
  /* Hover effect for elevated cards */
  div:global(.shadow-lg):hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  div:global(.shadow-lg) {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
</style>