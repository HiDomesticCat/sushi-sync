<script lang="ts">
  type Props = {
    text: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    class?: string;
    children?: import('svelte').Snippet;
  };

  let { text, position = 'top', class: className = '', children }: Props = $props();

  let isVisible = $state(false);
  let timeoutId: ReturnType<typeof setTimeout>;
  let triggerEl = $state<HTMLDivElement>();
  let tooltipEl = $state<HTMLDivElement>();
  let coords = $state({ top: 0, left: 0 });

  function updatePosition() {
    if (!triggerEl || !tooltipEl) return;
    
    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    
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
    timeoutId = setTimeout(() => {
      isVisible = true;
    }, 300);
  }

  function hideTooltip() {
    clearTimeout(timeoutId);
    isVisible = false;
  }

  $effect(() => {
    if (isVisible && tooltipEl && triggerEl) {
      updatePosition();
      
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
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
>
  {@render children?.()}
</div>

{#if isVisible}
  <div
    bind:this={tooltipEl}
    class="fixed z-[9999] px-3 py-2 text-sm text-white bg-sumi/90 border border-hinoki rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-fade-in backdrop-blur-sm"
    style="top: {coords.top}px; left: {coords.left}px;"
    role="tooltip"
  >
    {text}
  </div>
{/if}
