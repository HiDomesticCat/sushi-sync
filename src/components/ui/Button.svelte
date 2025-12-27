<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    onclick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    'aria-label'?: string;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    onclick,
    type = 'button',
    class: className = '',
    'aria-label': ariaLabel,
    ...props
  }: Props = $props();

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sumi disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95';
  
  const variantClasses = {
    primary: 'bg-wood text-sumi border-2 border-hinoki hover:bg-hinoki focus:ring-hinoki shadow-lg',
    secondary: 'bg-panel text-primary border-2 border-hinoki hover:bg-hinoki hover:text-sumi focus:ring-hinoki',
    danger: 'bg-salmon text-primary border-2 border-salmon hover:bg-red-600 focus:ring-salmon',
    success: 'bg-matcha text-sumi border-2 border-matcha hover:bg-green-500 focus:ring-matcha'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
</script>

<button
  {type}
  {disabled}
  {onclick}
  class={classes}
  aria-label={ariaLabel}
  {...props}
>
  <slot />
</button>

<style>
  button {
    position: relative;
    overflow: hidden;
  }
  
  button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  button:hover::before {
    transform: translateX(100%);
  }
  
  button:disabled::before {
    display: none;
  }
</style>