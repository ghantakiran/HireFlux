/**
 * Feedback Provider Component
 * Manages global feedback widget state
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { FeedbackWidgetTrigger } from './feedback-widget-trigger';
import { FeedbackWidget } from './feedback-widget';

interface FeedbackContextType {
  isOpen: boolean;
  open: (errorContext?: { errorId: string; message: string; url: string }) => void;
  close: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorContext, setErrorContext] = useState<{ errorId: string; message: string; url: string } | undefined>();

  const open = useCallback((ctx?: { errorId: string; message: string; url: string }) => {
    setErrorContext(ctx);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setErrorContext(undefined);
  }, []);

  return (
    <FeedbackContext.Provider value={{ isOpen, open, close }}>
      {children}
      <FeedbackWidgetTrigger onClick={() => open()} />
      <FeedbackWidget isOpen={isOpen} onClose={close} errorContext={errorContext} />
    </FeedbackContext.Provider>
  );
}
