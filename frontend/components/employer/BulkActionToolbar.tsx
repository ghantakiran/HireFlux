/**
 * Bulk Action Toolbar Component - Issue #58
 *
 * Toolbar displayed when multiple applications are selected.
 * Provides bulk operations:
 * - Bulk status change (move to stage)
 * - Bulk reject with reason
 * - Deselect all
 *
 * Following BDD scenarios from:
 * tests/features/application-status-change.feature
 */

'use client';

import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronDown } from 'lucide-react';
import { ApplicationStatus, STATUS_LABELS } from './StatusChangeModal';

interface BulkActionToolbarProps {
  selectedCount: number;
  onDeselectAll: () => void;
  onBulkReject: () => void;
  onBulkMoveToStage: (stage: ApplicationStatus) => void;
}

export default function BulkActionToolbar({
  selectedCount,
  onDeselectAll,
  onBulkReject,
  onBulkMoveToStage,
}: BulkActionToolbarProps) {
  const [showBulkActions, setShowBulkActions] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div
      className="sticky top-0 z-10 border-b bg-muted/50 backdrop-blur-sm"
      data-testid="bulk-action-toolbar"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Selection Count */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" data-testid="selection-count">
              {selectedCount} application{selectedCount !== 1 ? 's' : ''} selected
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Bulk Actions Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkActions(!showBulkActions)}
                data-testid="bulk-actions-button"
              >
                Bulk Actions
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>

              {showBulkActions && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-md border bg-popover shadow-lg"
                  data-testid="bulk-actions-menu"
                >
                  <div className="p-2">
                    {/* Bulk Reject */}
                    <button
                      onClick={() => {
                        onBulkReject();
                        setShowBulkActions(false);
                      }}
                      className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                      data-testid="bulk-reject-button"
                    >
                      Reject Selected
                    </button>

                    <div className="my-1 h-px bg-border" />

                    {/* Move to Stage Options */}
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                      Move to Stage
                    </div>
                    {Object.values(ApplicationStatus)
                      .filter((status) => status !== ApplicationStatus.REJECTED)
                      .map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            onBulkMoveToStage(status);
                            setShowBulkActions(false);
                          }}
                          className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                          data-testid={`bulk-move-to-${status}`}
                        >
                          {STATUS_LABELS[status]}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Deselect All */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              data-testid="deselect-all-button"
            >
              <X className="mr-2 h-4 w-4" />
              Deselect All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
