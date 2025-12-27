<script lang="ts">
  type Props = {
    text: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    class?: string;
    children?: import('svelte').Snippet;
  };

  let { text, position = 'top', class: className = '', children }: Props = $props();

  let isVisible = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let triggerEl = $state<HTMLDivElement>();
  let tooltipEl = $state<HTMLDivElement>();
  let coords = $state({ top: 0, left: 0 });

  function updatePosition() {
    if (!triggerEl || !tooltipEl) return;
    
    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    
    console.log("Tooltip: triggerRect", triggerRect);
    console.log("Tooltip: tooltipRect", tooltipRect);
    
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 8;
        break;
    }

    // Prevent going off-screen (basic)
    if (top < 0) top = 8;
    if (left < 0) left = 8;
    if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 8;
    if (top + tooltipRect.height > window.innerHeight) top = window.innerHeight - tooltipRect.height - 8;

    coords = { top, left };
  }

  function showTooltip() {
    clearTimeout(timeoutId);
    isVisible = true;
    console.log("Tooltip: showTooltip triggered for", text);
  }

  function hideTooltip() {
    clearTimeout(timeoutId);
    isVisible = false;
    console.log("Tooltip: hideTooltip triggered");
  }

  $effect(() => {
    if (isVisible && tooltipEl && triggerEl) {
      updatePosition();
      
      // Use a small interval to ensure position is correct as elements might move
      const interval = setInterval(updatePosition, 100);
      
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  });
</script>

<div
  bind:this={triggerEl}
  class="relative inline-block {className}"
  onmouseenter={showTooltip}
  onmouseleave={hideTooltip}
  role="button"
  tabindex="0"
  style="pointer-events: auto;"
>
  {@render children?.()}
</div>

{#if isVisible}
  <div
    bind:this={tooltipEl}
    class="fixed z-[10000] px-3 py-2 text-sm text-white bg-sumi border border-hinoki rounded-lg shadow-2xl whitespace-nowrap pointer-events-none animate-fade-in backdrop-blur-md"
    style="top: {coords.top}px; left: {coords.left}px; visibility: {coords.top === 0 && coords.left === 0 ? 'hidden' : 'visible'};"
    role="tooltip"
  >
    {text}
  </div>
{/if}
