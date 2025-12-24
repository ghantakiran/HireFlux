'use client';

/**
 * Modal Stack Manager
 * Manages a global stack of open modals for proper nested modal escape key handling
 * WCAG 2.1 AA Compliance - Issue #149
 *
 * This is a simple global stack that tracks modals in order of opening.
 * When Escape is pressed, only the topmost modal closes.
 */

interface ModalInstance {
  id: string;
  onClose: () => void;
}

// Global modal stack
let modalStack: ModalInstance[] = [];

export const ModalStackManager = {
  register(id: string, onClose: () => void) {
    modalStack.push({ id, onClose });
  },

  unregister(id: string) {
    modalStack = modalStack.filter((modal) => modal.id !== id);
  },

  isTopModal(id: string): boolean {
    return modalStack.length > 0 && modalStack[modalStack.length - 1].id === id;
  },

  closeTopModal() {
    if (modalStack.length > 0) {
      const topModal = modalStack[modalStack.length - 1];
      topModal.onClose();
    }
  },

  getStackSize(): number {
    return modalStack.length;
  },
};
