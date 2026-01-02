'use client';

/**
 * Keyboard Shortcuts Customization Panel (Issue #155)
 *
 * Allows users to customize keyboard shortcuts:
 * - Edit shortcut keys
 * - Enable/disable shortcuts
 * - Reset to defaults
 * - Conflict detection
 * - Import/export
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Download, Upload, RotateCcw, Edit2, Check, X } from 'lucide-react';
import {
  useShortcuts,
  useShortcutCustomization,
  useShortcutImportExport,
} from '@/hooks/use-keyboard-shortcuts-registry';
import { ShortcutDefinition, ShortcutSequence } from '@/lib/keyboard-shortcuts-registry';
import { getKeyboardShortcutsRegistry } from '@/lib/keyboard-shortcuts-registry';

interface ShortcutCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsCustomization({ isOpen, onClose }: ShortcutCustomizationProps) {
  const shortcuts = useShortcuts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { exportShortcuts, importShortcuts } = useShortcutImportExport();

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutDefinition[]>);

  const handleExport = () => {
    try {
      exportShortcuts();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importShortcuts(file);
    } catch (error) {
      console.error('Import failed:', error);
    }

    // Reset file input
    event.target.value = '';
  };

  const handleResetAll = () => {
    const registry = getKeyboardShortcutsRegistry();
    registry.resetAllToDefaults();
    setShowResetConfirm(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
          data-testid="shortcut-customization"
        >
          <DialogHeader>
            <DialogTitle>Customize Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Personalize your keyboard shortcuts. Click on a shortcut to edit it.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold mb-3">{category}</h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut) => (
                      <ShortcutItem
                        key={shortcut.id}
                        shortcut={shortcut}
                        isEditing={editingId === shortcut.id}
                        onEdit={() => setEditingId(shortcut.id)}
                        onCancelEdit={() => setEditingId(null)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('import-shortcuts')?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <input
                id="import-shortcuts"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Default
              </Button>
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>Reset All Shortcuts?</DialogTitle>
            <DialogDescription>
              This will restore all keyboard shortcuts to their default values. Custom shortcuts will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetAll}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ShortcutItemProps {
  shortcut: ShortcutDefinition;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
}

function ShortcutItem({ shortcut, isEditing, onEdit, onCancelEdit }: ShortcutItemProps) {
  const {
    keys,
    enabled,
    customize,
    resetToDefault,
    toggleEnabled,
    checkConflict,
  } = useShortcutCustomization(shortcut.id);

  const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
  const [conflict, setConflict] = useState<ShortcutDefinition | null>(null);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const key = event.key.toLowerCase();

      // Ignore modifier-only keys
      if (['control', 'meta', 'alt', 'shift'].includes(key)) {
        return;
      }

      const newKeys = [...recordingKeys, key];
      setRecordingKeys(newKeys);

      // Check for conflicts
      const conflictingShortcut = checkConflict(newKeys);
      setConflict(conflictingShortcut);
    },
    [recordingKeys, checkConflict]
  );

  const handleSave = () => {
    if (conflict) {
      setShowOverrideConfirm(true);
      return;
    }

    try {
      customize(recordingKeys, enabled);
      setRecordingKeys([]);
      onCancelEdit();
    } catch (error) {
      console.error('Failed to save shortcut:', error);
    }
  };

  const handleOverride = () => {
    try {
      // Disable conflicting shortcut
      const registry = getKeyboardShortcutsRegistry();
      if (conflict) {
        registry.setEnabled(conflict.id, false);
      }

      customize(recordingKeys, enabled);
      setRecordingKeys([]);
      setConflict(null);
      setShowOverrideConfirm(false);
      onCancelEdit();
    } catch (error) {
      console.error('Failed to override shortcut:', error);
    }
  };

  const handleCancel = () => {
    setRecordingKeys([]);
    setConflict(null);
    onCancelEdit();
  };

  const handleReset = () => {
    resetToDefault();
    setRecordingKeys([]);
    setConflict(null);
    onCancelEdit();
  };

  const displayKeys = isEditing && recordingKeys.length > 0 ? recordingKeys : keys;

  return (
    <>
      <div
        className={`flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 ${
          !enabled ? 'opacity-50' : ''
        }`}
        data-shortcut-action={shortcut.id}
      >
        <div className="flex items-center gap-3 flex-1">
          <Switch
            checked={enabled}
            onCheckedChange={toggleEnabled}
            aria-label={`Toggle ${shortcut.description}`}
          />
          <span className="text-sm text-muted-foreground flex-1">
            {shortcut.description}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Input
                className="w-40 h-8 text-xs font-mono"
                placeholder="Press keys..."
                value={displayKeys.join(' + ')}
                onKeyDown={handleKeyDown}
                readOnly
                autoFocus
              />
              {conflict && (
                <div className="text-xs text-destructive flex items-center gap-1" data-testid="shortcut-conflict-warning">
                  <AlertCircle className="h-3 w-3" />
                  <span>already in use</span>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={recordingKeys.length === 0 || (!!conflict && !showOverrideConfirm)}
                className="h-8 px-2"
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="h-8 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                {displayKeys.map((key, index) => (
                  <span key={index} className="flex items-center gap-1">
                    {index > 0 && <span className="text-xs text-muted-foreground">then</span>}
                    <kbd className="rounded border border-border bg-background px-2 py-1 text-xs font-mono shadow-sm">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                className="h-8 px-2"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Override Confirmation Dialog */}
      <Dialog open={showOverrideConfirm} onOpenChange={setShowOverrideConfirm}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>Override Existing Shortcut?</DialogTitle>
            <DialogDescription>
              This will remove the shortcut from "{conflict?.description}". Do you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleOverride}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
