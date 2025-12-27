import { writable, derived } from 'svelte/store';

interface UIState {
  isSeatConfigModalOpen: boolean;
  isCustomerConfigModalOpen: boolean;
  isExportModalOpen: boolean;
  showAnalysisPanel: boolean;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  autoClose: boolean;
  duration?: number; // in milliseconds
}

export const uiStore = writable<UIState>({
  isSeatConfigModalOpen: false,
  isCustomerConfigModalOpen: false,
  isExportModalOpen: false,
  showAnalysisPanel: false,
  sidebarCollapsed: false,
  theme: 'dark',
  notifications: []
});

// Derived stores for convenience
export const hasOpenModal = derived(
  uiStore,
  $ui => 
    $ui.isSeatConfigModalOpen || 
    $ui.isCustomerConfigModalOpen || 
    $ui.isExportModalOpen
);

export const activeNotifications = derived(
  uiStore,
  $ui => $ui.notifications.filter(n => !n.autoClose || Date.now() - n.timestamp < (n.duration || 5000))
);

export const notificationCount = derived(
  activeNotifications,
  $notifications => $notifications.length
);

// Modal management functions
export function openSeatConfigModal() {
  uiStore.update(state => ({
    ...state,
    isSeatConfigModalOpen: true
  }));
}

export function closeSeatConfigModal() {
  uiStore.update(state => ({
    ...state,
    isSeatConfigModalOpen: false
  }));
}

export function openCustomerConfigModal() {
  uiStore.update(state => ({
    ...state,
    isCustomerConfigModalOpen: true
  }));
}

export function closeCustomerConfigModal() {
  uiStore.update(state => ({
    ...state,
    isCustomerConfigModalOpen: false
  }));
}

export function openExportModal() {
  uiStore.update(state => ({
    ...state,
    isExportModalOpen: true
  }));
}

export function closeExportModal() {
  uiStore.update(state => ({
    ...state,
    isExportModalOpen: false
  }));
}

export function closeAllModals() {
  uiStore.update(state => ({
    ...state,
    isSeatConfigModalOpen: false,
    isCustomerConfigModalOpen: false,
    isExportModalOpen: false
  }));
}

// Panel management functions
export function toggleAnalysisPanel() {
  uiStore.update(state => ({
    ...state,
    showAnalysisPanel: !state.showAnalysisPanel
  }));
}

export function showAnalysisPanel() {
  uiStore.update(state => ({
    ...state,
    showAnalysisPanel: true
  }));
}

export function hideAnalysisPanel() {
  uiStore.update(state => ({
    ...state,
    showAnalysisPanel: false
  }));
}

export function toggleSidebar() {
  uiStore.update(state => ({
    ...state,
    sidebarCollapsed: !state.sidebarCollapsed
  }));
}

export function collapseSidebar() {
  uiStore.update(state => ({
    ...state,
    sidebarCollapsed: true
  }));
}

export function expandSidebar() {
  uiStore.update(state => ({
    ...state,
    sidebarCollapsed: false
  }));
}

// Theme management functions
export function setTheme(theme: 'dark' | 'light') {
  uiStore.update(state => ({
    ...state,
    theme
  }));
}

export function toggleTheme() {
  uiStore.update(state => ({
    ...state,
    theme: state.theme === 'dark' ? 'light' : 'dark'
  }));
}

// Notification management functions
export function addNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
  const newNotification: Notification = {
    ...notification,
    id: generateNotificationId(),
    timestamp: Date.now()
  };

  uiStore.update(state => ({
    ...state,
    notifications: [...state.notifications, newNotification]
  }));

  // Auto-remove notification if autoClose is true
  if (newNotification.autoClose) {
    const duration = newNotification.duration || 5000;
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, duration);
  }

  return newNotification.id;
}

export function removeNotification(id: string) {
  uiStore.update(state => ({
    ...state,
    notifications: state.notifications.filter(n => n.id !== id)
  }));
}

export function clearAllNotifications() {
  uiStore.update(state => ({
    ...state,
    notifications: []
  }));
}

// Convenience notification functions
export function showSuccessNotification(title: string, message: string, autoClose: boolean = true) {
  return addNotification({
    type: 'success',
    title,
    message,
    autoClose,
    duration: 3000
  });
}

export function showErrorNotification(title: string, message: string, autoClose: boolean = false) {
  return addNotification({
    type: 'error',
    title,
    message,
    autoClose,
    duration: 8000
  });
}

export function showWarningNotification(title: string, message: string, autoClose: boolean = true) {
  return addNotification({
    type: 'warning',
    title,
    message,
    autoClose,
    duration: 5000
  });
}

export function showInfoNotification(title: string, message: string, autoClose: boolean = true) {
  return addNotification({
    type: 'info',
    title,
    message,
    autoClose,
    duration: 4000
  });
}

// Utility functions
function generateNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Keyboard shortcut handling
export function handleKeyboardShortcuts(event: KeyboardEvent) {
  // Escape key - close modals
  if (event.key === 'Escape') {
    uiStore.update(state => {
      if (hasOpenModal) {
        return {
          ...state,
          isSeatConfigModalOpen: false,
          isCustomerConfigModalOpen: false,
          isExportModalOpen: false
        };
      }
      return state;
    });
  }

  // Ctrl/Cmd + specific keys
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case '1':
        event.preventDefault();
        openSeatConfigModal();
        break;
      case '2':
        event.preventDefault();
        openCustomerConfigModal();
        break;
      case 'e':
        event.preventDefault();
        openExportModal();
        break;
      case 'a':
        event.preventDefault();
        toggleAnalysisPanel();
        break;
      case 'b':
        event.preventDefault();
        toggleSidebar();
        break;
    }
  }
}

// Local storage persistence
const UI_STORAGE_KEY = 'sushi-sync-ui-preferences';

export function saveUIPreferences() {
  uiStore.subscribe(state => {
    const preferences = {
      showAnalysisPanel: state.showAnalysisPanel,
      sidebarCollapsed: state.sidebarCollapsed,
      theme: state.theme
    };
    
    try {
      localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save UI preferences to localStorage:', error);
    }
  })();
}

export function loadUIPreferences() {
  try {
    const stored = localStorage.getItem(UI_STORAGE_KEY);
    if (stored) {
      const preferences = JSON.parse(stored);
      uiStore.update(state => ({
        ...state,
        showAnalysisPanel: preferences.showAnalysisPanel ?? state.showAnalysisPanel,
        sidebarCollapsed: preferences.sidebarCollapsed ?? state.sidebarCollapsed,
        theme: preferences.theme ?? state.theme
      }));
    }
  } catch (error) {
    console.warn('Failed to load UI preferences from localStorage:', error);
  }
}

// Initialize UI preferences on module load
if (typeof window !== 'undefined') {
  loadUIPreferences();
}

// Modal stack management (for nested modals)
const modalStack = writable<string[]>([]);

export function pushModal(modalId: string) {
  modalStack.update(stack => [...stack, modalId]);
}

export function popModal() {
  modalStack.update(stack => stack.slice(0, -1));
}

export function getTopModal() {
  return derived(modalStack, $stack => $stack[$stack.length - 1] || null);
}

export function clearModalStack() {
  modalStack.set([]);
}

// Focus management for accessibility
let lastFocusedElement: HTMLElement | null = null;

export function saveFocus() {
  lastFocusedElement = document.activeElement as HTMLElement;
}

export function restoreFocus() {
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

// Loading states
interface LoadingState {
  [key: string]: boolean;
}

export const loadingStore = writable<LoadingState>({});

export function setLoading(key: string, isLoading: boolean) {
  loadingStore.update(state => ({
    ...state,
    [key]: isLoading
  }));
}

export function isLoading(key: string) {
  return derived(loadingStore, $loading => $loading[key] || false);
}