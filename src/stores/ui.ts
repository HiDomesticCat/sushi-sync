import { writable, derived } from 'svelte/store';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  autoClose: boolean;
  duration?: number;
}

interface UIState {
  isSeatConfigModalOpen: boolean;
  isCustomerConfigModalOpen: boolean;
  isExportModalOpen: boolean;
  showAnalysisPanel: boolean;
  sidebarCollapsed: boolean;
  notifications: Notification[];
}

export const uiStore = writable<UIState>({
  isSeatConfigModalOpen: false,
  isCustomerConfigModalOpen: false,
  isExportModalOpen: false,
  showAnalysisPanel: true,
  sidebarCollapsed: false,
  notifications: []
});

// ===== Derived Stores =====
export const hasOpenModal = derived(uiStore, ($ui) =>
  $ui.isSeatConfigModalOpen ||
  $ui.isCustomerConfigModalOpen ||
  $ui.isExportModalOpen
);

export const activeNotifications = derived(uiStore, ($ui) =>
  $ui.notifications.filter(n => !n.autoClose || Date.now() - n.timestamp < (n.duration || 5000))
);

// ===== Modal Functions =====
export function openSeatConfigModal() {
  uiStore.update(s => ({ ...s, isSeatConfigModalOpen: true }));
}

export function closeSeatConfigModal() {
  uiStore.update(s => ({ ...s, isSeatConfigModalOpen: false }));
}

export function openCustomerConfigModal() {
  uiStore.update(s => ({ ...s, isCustomerConfigModalOpen: true }));
}

export function closeCustomerConfigModal() {
  uiStore.update(s => ({ ...s, isCustomerConfigModalOpen: false }));
}

export function openExportModal() {
  uiStore.update(s => ({ ...s, isExportModalOpen: true }));
}

export function closeExportModal() {
  uiStore.update(s => ({ ...s, isExportModalOpen: false }));
}

export function closeAllModals() {
  uiStore.update(s => ({
    ...s,
    isSeatConfigModalOpen: false,
    isCustomerConfigModalOpen: false,
    isExportModalOpen: false
  }));
}

// ===== Panel Functions =====
export function toggleAnalysisPanel() {
  uiStore.update(s => ({ ...s, showAnalysisPanel: !s.showAnalysisPanel }));
}

export function toggleSidebar() {
  uiStore.update(s => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }));
}

// ===== Notification Functions =====
function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): string {
  const newNotification: Notification = {
    ...notification,
    id: generateId(),
    timestamp: Date.now()
  };

  uiStore.update(s => ({
    ...s,
    notifications: [...s.notifications, newNotification]
  }));

  if (newNotification.autoClose) {
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, newNotification.duration || 5000);
  }

  return newNotification.id;
}

export function removeNotification(id: string) {
  uiStore.update(s => ({
    ...s,
    notifications: s.notifications.filter(n => n.id !== id)
  }));
}

export function clearAllNotifications() {
  uiStore.update(s => ({ ...s, notifications: [] }));
}

// ===== Convenience Notification Functions =====
export function showSuccess(title: string, message: string) {
  return addNotification({ type: 'success', title, message, autoClose: true, duration: 3000 });
}

export function showError(title: string, message: string) {
  return addNotification({ type: 'error', title, message, autoClose: false });
}

export function showWarning(title: string, message: string) {
  return addNotification({ type: 'warning', title, message, autoClose: true, duration: 5000 });
}

export function showInfo(title: string, message: string) {
  return addNotification({ type: 'info', title, message, autoClose: true, duration: 4000 });
}
