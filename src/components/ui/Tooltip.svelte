<script lang="ts">
  interface Props {
    text: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    class?: string;
  }

  let { 
    text, 
    position = 'top',
    class: className = ''
  }: Props = $props();

  let isVisible = $state(false);
  let timeoutId: number;

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

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-panel',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-panel',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-panel',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-panel'
  };
</script>

<div
  class="relative inline-block {className}"
  onmouseenter={showTooltip}
  onmouseleave={hideTooltip}
  onfocus={showTooltip}
  onblur={hideTooltip}
  role="button"
  tabindex="0"
>
  <slot />
  
  {#if isVisible}
    <div 
      class="absolute z-50 px-3 py-2 text-sm text-primary bg-panel border border-hinoki rounded-lg shadow-lg whitespace-nowrap pointer-events-none {positionClasses[position]}"
      role="tooltip"
    >
      {text}
      <!-- Arrow -->
      <div class="absolute w-0 h-0 border-4 {arrowClasses[position]}"></div>
    </div>
  {/if}
</div>

<style>
  /* Tooltip animation */
  div[role="tooltip"] {
    animation: tooltipFadeIn 0.2s ease-out;
  }

  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  /* Position-specific animations */
  .bottom-full {
    animation: tooltipFadeInTop 0.2s ease-out;
  }

  .top-full {
    animation: tooltipFadeInBottom 0.2s ease-out;
  }

  .right-full {
    animation: tooltipFadeInLeft 0.2s ease-out;
  }

  .left-full {
    animation: tooltipFadeInRight 0.2s ease-out;
  }

  @keyframes tooltipFadeInTop {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes tooltipFadeInBottom {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes tooltipFadeInLeft {
    from {
      opacity: 0;
      transform: translateY(-50%) translateX(4px);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
  }

  @keyframes tooltipFadeInRight {
    from {
      opacity: 0;
      transform: translateY(-50%) translateX(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
  }
</style>