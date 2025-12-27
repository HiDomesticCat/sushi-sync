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
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  } satisfies Record<string, string>;
</script>

<div
  class="relative inline-block {className}"
  onmouseenter={showTooltip}
  onmouseleave={hideTooltip}
  role="button"
  tabindex="0"
>
  {@render children?.()}

  {#if isVisible}
    <div
      class="absolute z-50 px-3 py-2 text-sm text-primary bg-panel border border-hinoki rounded-lg shadow-lg whitespace-nowrap pointer-events-none {positionClasses[position]} animate-fade-in"
      role="tooltip"
    >
      {text}
    </div>
  {/if}
</div>
