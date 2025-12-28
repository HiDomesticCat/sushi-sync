<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  interface Props {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    class?: string;
    children?: Snippet;
    footer?: Snippet;
  }

  let {
    isOpen = false,
    title,
    onClose,
    size = 'md',
    class: className = '',
    children,
    footer
  }: Props = $props();

  let dialog: HTMLDialogElement;
  let position = $state({ x: 0, y: 0 });
  let isDragging = $state(false);
  let dragStart = { x: 0, y: 0 };
  let initialPosition = { x: 0, y: 0 };

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
        position = { x: 0, y: 0 }; // Reset position on open
        // Ensure loading overlay is moved after modal opens
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) document.body.appendChild(overlay);
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

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // Only left click
    // Prevent dragging if clicking close button
    if ((e.target as HTMLElement).closest('button')) return;
    
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    initialPosition = { ...position };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    position = {
      x: initialPosition.x + dx,
      y: initialPosition.y + dy
    };
  }

  function handleMouseUp() {
    isDragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }
</script>

<dialog
  bind:this={dialog}
  onclick={handleBackdropClick}
  class="backdrop:bg-black/40 bg-transparent p-0 {sizeClasses[size]} w-full max-h-[90vh] rounded-lg shadow-2xl {className}"
  style="transform: translate({position.x}px, {position.y}px);"
>
  <div class="bg-bg-panel border-2 border-border rounded-lg overflow-hidden animate-fade-in shadow-2xl flex flex-col max-h-[90vh]">
    <!-- Header -->
    <div 
      class="bg-wood px-6 py-4 border-b border-border relative shrink-0 cursor-move select-none"
      onmousedown={handleMouseDown}
      role="button"
      tabindex="-1"
    >
      <h2 class="text-xl font-bold text-text-main pr-8 pointer-events-none">{title}</h2>
      <button
        onclick={onClose}
        class="absolute top-4 right-4 w-8 h-8 rounded-full bg-bg-main text-text-muted hover:bg-accent hover:text-white transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent pointer-events-auto"
        aria-label="Close modal"
      >
        ✕
      </button>
    </div>

    <!-- Body -->
    <div class="p-6 overflow-y-auto min-h-0 flex-1">
      {@render children?.()}
    </div>

    <!-- Footer -->
    {#if footer}
      <div class="bg-bg-panel border-t border-border px-6 py-4 shrink-0">
        {@render footer()}
      </div>
    {/if}
  </div>
</dialog>
