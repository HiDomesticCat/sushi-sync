<script lang="ts">
  import { simulationStore } from '../../stores/simulation';
  import { onDestroy } from 'svelte';

  let dialog: HTMLDialogElement;

  // Subscribe to loading state changes
  // When loading = true, force showModal() to enter the "Top Layer"
  // When loading = false, force close()
  // This ensures it stacks above all other Modals (which also use <dialog>)
  const unsubscribe = simulationStore.subscribe((state) => {
    if (!dialog) return;
    
    if (state.loading && !dialog.open) {
      dialog.showModal();
    } else if (!state.loading && dialog.open) {
      dialog.close();
    }
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

<dialog
  bind:this={dialog}
  class="bg-transparent border-none p-0 m-auto backdrop:bg-black/50 backdrop:backdrop-blur-sm outline-none shadow-none text-white text-center open:flex open:flex-col open:items-center open:justify-center open:fixed open:inset-0 open:z-[2147483647]"
  oncancel={(e) => e.preventDefault()} 
>
  <div class="flex flex-col items-center gap-4">
    <div class="relative w-16 h-16">
      <div class="absolute inset-0 border-4 border-white/30 rounded-full"></div>
      <div class="absolute inset-0 border-4 border-t-white rounded-full animate-spin"></div>
    </div>
    <div class="text-xl font-medium tracking-wide animate-pulse">Processing...</div>
    
    <!-- Decorative Noren-style dots -->
    <div class="flex gap-2 mt-2">
      <div class="w-1.5 h-1.5 bg-momo rounded-full animate-bounce" style="animation-delay: 0s"></div>
      <div class="w-1.5 h-1.5 bg-matcha rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
      <div class="w-1.5 h-1.5 bg-ai rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
    </div>
  </div>
</dialog>

<style>
  /* Remove default styles and force centering */
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
  }
</style>
