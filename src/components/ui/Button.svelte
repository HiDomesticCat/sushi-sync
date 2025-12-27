<script lang="ts">
  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    onclick,
    type = 'button',
    class: className = '',
    ...props
  } = $props();

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sumi disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-wood text-sumi border-2 border-hinoki hover:bg-hinoki focus:ring-hinoki shadow-md',
    secondary: 'bg-panel text-primary border-2 border-hinoki hover:bg-hinoki hover:text-sumi focus:ring-hinoki',
    danger: 'bg-salmon text-primary border-2 border-salmon hover:brightness-110 focus:ring-salmon',
    success: 'bg-matcha text-sumi border-2 border-matcha hover:brightness-110 focus:ring-matcha',
    ghost: 'bg-transparent text-primary hover:bg-panel focus:ring-hinoki'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  let classes = $derived(`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`);
</script>

<button
  type={type}
  {disabled}
  {onclick}
  class={classes}
  {...props}
>
  <slot />
</button>
