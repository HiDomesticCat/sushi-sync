<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    class?: string;
  }

  let { 
    isOpen = false, 
    title, 
    onClose,
    class: className = ''
  }: Props = $props();

  let dialog: HTMLDialogElement;

  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });

  $effect(() => {
    if (dialog) {
      if (isOpen) {
        dialog.showModal();
      } else {
        dialog.close();
      }
    }
  });

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialog) {
      onClose();
    }
  }
</script>

<dialog 
  bind:this={dialog}
  onclick={handleBackdropClick}
  class="backdrop:bg-black backdrop:bg-opacity-50 backdrop:backdrop-blur-sm bg-transparent p-0 max-w-2xl w-full max-h-[90vh] rounded-lg shadow-2xl {className}"
>
  <div class="bg-panel border-2 border-hinoki rounded-lg overflow-hidden">
    <!-- Scroll Header -->
    <div class="bg-wood px-6 py-4 border-b border-hinoki relative">
      <h2 class="text-xl font-bold text-sumi pr-8">{title}</h2>
      <button
        onclick={onClose}
        class="absolute top-4 right-4 w-8 h-8 rounded-full bg-sumi text-hinoki hover:bg-salmon hover:text-primary transition-colors duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-salmon"
        aria-label="Close modal"
      >
        ✕
      </button>
    </div>

    <!-- Modal Body -->
    <div class="p-6 max-h-[60vh] overflow-y-auto">
      <slot />
    </div>

    <!-- Modal Footer -->
    {#if $$slots.footer}
      <div class="bg-panel border-t border-hinoki px-6 py-4">
        <slot name="footer" />
      </div>
    {/if}
  </div>
</dialog>

<style>
  dialog {
    animation: fadeIn 0.2s ease-out;
  }

  dialog[open] {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  dialog::backdrop {
    animation: backdropFadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Custom scrollbar for modal content */
  .max-h-\[60vh\]::-webkit-scrollbar {
    width: 6px;
  }

  .max-h-\[60vh\]::-webkit-scrollbar-track {
    background: var(--color-panel);
  }

  .max-h-\[60vh\]::-webkit-scrollbar-thumb {
    background: var(--color-hinoki);
    border-radius: 3px;
  }

  .max-h-\[60vh\]::-webkit-scrollbar-thumb:hover {
    background: var(--color-salmon);
  }
</style>