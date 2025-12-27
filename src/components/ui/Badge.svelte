<script lang="ts">
  interface Props {
    variant?: 'default' | 'waiting' | 'dining' | 'conflict';
    size?: 'sm' | 'md';
    class?: string;
  }

  let { 
    variant = 'default', 
    size = 'md',
    class: className = ''
  }: Props = $props();

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full border-2 shadow-md';
  
  const variantClasses = {
    default: 'bg-panel text-muted border-muted',
    waiting: 'bg-ocean text-primary border-ocean shadow-ocean/20',
    dining: 'bg-matcha text-sumi border-matcha shadow-matcha/20',
    conflict: 'bg-salmon text-primary border-salmon shadow-salmon/20'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs min-w-[1.5rem] h-6',
    md: 'px-3 py-1.5 text-sm min-w-[2rem] h-8'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
</script>

<span class={classes}>
  <slot />
</span>

<style>
  span {
    position: relative;
    overflow: hidden;
  }
  
  /* Ink stamp effect */
  span::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.3s ease, height 0.3s ease;
  }
  
  span:hover::before {
    width: 100%;
    height: 100%;
  }
  
  /* Subtle pulse animation for conflict badges */
  span:global(.bg-salmon) {
    animation: conflictPulse 2s ease-in-out infinite;
  }
  
  @keyframes conflictPulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(255, 126, 103, 0.4);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(255, 126, 103, 0);
    }
  }
</style>