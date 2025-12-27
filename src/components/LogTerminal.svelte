<script lang="ts">
  import { currentFrame } from '../stores/simulation';
  import { formatTime } from '../stores/playback';
  import { afterUpdate } from 'svelte';

  let terminalElement: HTMLDivElement;
  
  afterUpdate(() => {
    if (terminalElement) {
      terminalElement.scrollTop = terminalElement.scrollHeight;
    }
  });

  function getEventClass(type: string): string {
    switch (type) {
      case 'ARRIVAL': return 'arrival';
      case 'SEATED': return 'seated';
      case 'LEFT': return 'left';
      case 'CONFLICT': return 'conflict';
      default: return '';
    }
  }
</script>

<div 
  bind:this={terminalElement}
  class="h-full w-full overflow-y-auto p-2 font-mono text-xs text-text-main space-y-1 torn-edge-bottom"
>
  {#if $currentFrame && $currentFrame.events}
    {#each $currentFrame.events as event}
      <div class="log-entry {getEventClass(event.type)} hover:bg-black/5 transition-colors py-0.5">
        <span class="text-text-muted">[{formatTime(event.timestamp)}]</span>
        <span class="ml-2">{event.message}</span>
      </div>
    {/each}
  {:else}
    <div class="text-center italic opacity-50 mt-10 text-text-muted">
      System Ready. Waiting for simulation...
    </div>
  {/if}
</div>
