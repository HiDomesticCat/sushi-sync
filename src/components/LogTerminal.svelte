<script lang="ts">
  import { currentFrame } from '../stores/simulation';
  import { afterUpdate } from 'svelte';

  let terminalElement: HTMLDivElement;
  
  // Auto-scroll logic
  afterUpdate(() => {
    if (terminalElement) {
      terminalElement.scrollTop = terminalElement.scrollHeight;
    }
  });
</script>

<div 
  bind:this={terminalElement}
  class="h-full w-full overflow-y-auto bg-panel p-2 font-mono text-xs text-text-muted space-y-1"
>
  {#if $currentFrame && $currentFrame.events}
    {#each $currentFrame.events as event}
      <div class="border-l-2 border-border-hinoki/30 pl-2 hover:bg-sumi/50 transition-colors">
        <span class="text-accent-ocean">[{new Date().toLocaleTimeString()}]</span>
        <span class="ml-2 text-text-offwhite">{event.message}</span>
      </div>
    {/each}
  {:else}
    <div class="text-center italic opacity-50 mt-10">
      System Ready. Waiting for simulation...
    </div>
  {/if}
</div>
