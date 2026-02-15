'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseConfirmDialogOptions {
  onConfirm: (itemId: string) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

interface UseConfirmDialogReturn {
  isOpen: boolean;
  isConfirming: boolean;
  itemId: string | null;
  open: (itemId: string) => void;
  close: () => void;
  confirm: () => Promise<void>;
}

export function useConfirmDialog(options: UseConfirmDialogOptions): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);

  // Use ref for options to avoid stale closures in confirm callback
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const open = useCallback((id: string) => {
    setItemId(id);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsConfirming(false);
    setItemId(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!itemId) return;
    const opts = optionsRef.current;

    try {
      setIsConfirming(true);
      await opts.onConfirm(itemId);

      if (opts.successMessage) {
        toast.success(opts.successMessage);
      }
      opts.onSuccess?.();
      setIsOpen(false);
      setItemId(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      if (opts.onError) {
        opts.onError(error);
      } else if (opts.errorMessage) {
        toast.error(opts.errorMessage);
      }
    } finally {
      setIsConfirming(false);
    }
  }, [itemId]);

  return { isOpen, isConfirming, itemId, open, close, confirm };
}
