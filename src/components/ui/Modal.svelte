<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    class?: string;
  }

  let {
    isOpen = false,
    title,
    onClose,
    size = 'md',
    class: className = ''
  }: Props = $props();

  let dialog: HTMLDialogElement;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

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
  class="backdrop:bg-black backdrop:bg-opacity-60 backdrop:backdrop-blur-sm bg-transparent p-0 {sizeClasses[size]} w-full max-h-[90vh] rounded-lg shadow-2xl {className}"
>
  <div class="bg-panel border-2 border-hinoki rounded-lg overflow-hidden animate-fade-in">
    <!-- Header -->
    <div class="bg-wood px-6 py-4 border-b border-hinoki relative">
      <h2 class="text-xl font-bold text-sumi pr-8">{title}</h2>
      <button
        onclick={onClose}
        class="absolute top-4 right-4 w-8 h-8 rounded-full bg-sumi text-hinoki hover:bg-salmon hover:text-primary transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-salmon"
        aria-label="Close modal"
      >
        ✕
      </button>
    </div>

    <!-- Body -->
    <div class="p-6 max-h-[60vh] overflow-y-auto">
      <slot />
    </div>

    <!-- Footer -->
    {#if $$slots.footer}
      <div class="bg-panel border-t border-hinoki px-6 py-4">
        <slot name="footer" />
      </div>
    {/if}
  </div>
</dialog>
