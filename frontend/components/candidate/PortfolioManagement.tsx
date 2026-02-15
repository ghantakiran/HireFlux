/**
 * Portfolio Management Component - Issue #57
 *
 * Allows candidates to add, edit, and remove portfolio items to showcase their work.
 *
 * Features:
 * - Add portfolio items (GitHub, Website, Article, Project)
 * - URL validation
 * - Thumbnail support
 * - Drag-and-drop reordering
 * - Max 10 items limit
 *
 * Following BDD scenarios from:
 * tests/features/candidate-profile-visibility.feature (lines 139-206)
 */

'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Github,
  Globe,
  FileText,
  Code,
  Plus,
  X,
  GripVertical,
  ExternalLink,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { portfolioItemSchema } from '@/lib/validations/candidate';

// Portfolio item types
export type PortfolioItemType = 'github' | 'website' | 'article' | 'project';

export interface PortfolioItem {
  id: string;
  type: PortfolioItemType;
  title: string;
  url: string;
  description?: string;
  thumbnailUrl?: string;
  order: number;
}

interface PortfolioManagementProps {
  items: PortfolioItem[];
  onChange: (items: PortfolioItem[]) => void;
  disabled?: boolean;
  maxItems?: number;
}

const PORTFOLIO_TYPES = [
  { value: 'github', label: 'GitHub Repository', icon: Github },
  { value: 'website', label: 'Personal Website', icon: Globe },
  { value: 'article', label: 'Article/Blog Post', icon: FileText },
  { value: 'project', label: 'Project/Demo', icon: Code },
] as const;

export default function PortfolioManagement({
  items,
  onChange,
  disabled = false,
  maxItems = 10,
}: PortfolioManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<PortfolioItem>>({
    type: 'github',
    title: '',
    url: '',
    description: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Check if max items reached
  const isMaxItemsReached = items.length >= maxItems;

  // Get icon for portfolio type
  const getIcon = (type: PortfolioItemType) => {
    const typeConfig = PORTFOLIO_TYPES.find((t) => t.value === type);
    return typeConfig?.icon || Globe;
  };

  // Validate portfolio item using Zod schema
  const validateItem = (): string | null => {
    const result = portfolioItemSchema.safeParse({
      type: newItem.type,
      title: newItem.title || '',
      url: newItem.url || '',
      description: newItem.description || '',
    });

    if (!result.success) {
      return result.error.issues[0].message;
    }
    return null;
  };

  // Add portfolio item
  const handleAdd = () => {
    const error = validateItem();
    if (error) {
      setValidationError(error);
      return;
    }

    const item: PortfolioItem = {
      id: Date.now().toString(),
      type: newItem.type as PortfolioItemType,
      title: newItem.title!,
      url: newItem.url!,
      description: newItem.description,
      thumbnailUrl: newItem.thumbnailUrl,
      order: items.length,
    };

    onChange([...items, item]);

    // Reset form
    setNewItem({
      type: 'github',
      title: '',
      url: '',
      description: '',
    });
    setValidationError(null);
    setShowAddForm(false);
  };

  // Remove portfolio item
  const handleRemove = (id: string) => {
    const updatedItems = items
      .filter((item) => item.id !== id)
      .map((item, index) => ({ ...item, order: index }));

    onChange(updatedItems);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const updatedItems = [...items];
    const [draggedItem] = updatedItems.splice(draggedIndex, 1);
    updatedItems.splice(dropIndex, 0, draggedItem);

    // Update order
    const reorderedItems = updatedItems.map((item, index) => ({
      ...item,
      order: index,
    }));

    onChange(reorderedItems);
    setDraggedIndex(null);
  };

  // Thumbnail upload (placeholder)
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Implement actual file upload to storage
    // For now, create a local preview URL
    const previewUrl = URL.createObjectURL(file);
    setNewItem({ ...newItem, thumbnailUrl: previewUrl });
  };

  const Icon = getIcon(newItem.type as PortfolioItemType);

  return (
    <div className="space-y-4" data-testid="portfolio-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Portfolio</h3>
          <p className="text-sm text-muted-foreground">
            Showcase your projects, code, and articles
          </p>
        </div>
        <Badge variant="secondary">
          {items.length} / {maxItems}
        </Badge>
      </div>

      {/* Portfolio Items List */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => {
            const ItemIcon = getIcon(item.type);
            return (
              <div
                key={item.id}
                draggable={!disabled}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                  draggedIndex === index
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'hover:bg-muted/50'
                } ${disabled ? 'opacity-50' : 'cursor-move'}`}
                data-testid={`portfolio-item-${index}`}
              >
                {/* Drag Handle */}
                {!disabled && (
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}

                {/* Thumbnail */}
                {item.thumbnailUrl && (
                  <div className="relative h-16 w-16">
                    <OptimizedImage
                      src={item.thumbnailUrl}
                      alt={item.title}
                      width={64}
                      height={64}
                      className="rounded"
                      objectFit="cover"
                    />
                  </div>
                )}

                {/* Icon if no thumbnail */}
                {!item.thumbnailUrl && (
                  <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
                    <ItemIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.title}</h4>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span className="truncate">{item.url}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Remove Button */}
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(item.id)}
                        data-testid={`remove-portfolio-item-${index}`}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Type Badge */}
                  <Badge variant="outline" className="mt-2">
                    {PORTFOLIO_TYPES.find((t) => t.value === item.type)?.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && !showAddForm && (
        <div className="rounded-lg border-2 border-dashed p-8 text-center">
          <Code className="mx-auto h-12 w-12 text-muted-foreground" />
          <h4 className="mt-4 text-lg font-medium">No portfolio items yet</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Add projects, code repositories, or articles to showcase your work
          </p>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-lg border bg-muted/50 p-4 space-y-4" data-testid="add-portfolio-form">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Add Portfolio Item</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setValidationError(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="portfolio-type">Type</Label>
            <Select
              value={newItem.type}
              onValueChange={(value) =>
                setNewItem({ ...newItem, type: value as PortfolioItemType })
              }
            >
              <SelectTrigger id="portfolio-type" data-testid="portfolio-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PORTFOLIO_TYPES.map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="portfolio-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="portfolio-title"
              data-testid="portfolio-title"
              placeholder="React Component Library"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              maxLength={100}
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="portfolio-url">
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="portfolio-url"
              data-testid="portfolio-url"
              type="url"
              placeholder="https://github.com/user/repo"
              value={newItem.url}
              onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="portfolio-description">Description (Optional)</Label>
            <Textarea
              id="portfolio-description"
              data-testid="portfolio-description"
              placeholder="Open source component library with 1K+ stars"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {newItem.description?.length || 0} / 500
            </p>
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label htmlFor="portfolio-thumbnail">Thumbnail (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="portfolio-thumbnail"
                data-testid="portfolio-thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="flex-1"
              />
              {newItem.thumbnailUrl && (
                <div className="relative h-10 w-10">
                  <OptimizedImage
                    src={newItem.thumbnailUrl}
                    alt="Preview"
                    width={40}
                    height={40}
                    className="rounded"
                    objectFit="cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button onClick={handleAdd} data-testid="add-portfolio-button">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setValidationError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add Button */}
      {!showAddForm && (
        <Button
          onClick={() => setShowAddForm(true)}
          disabled={disabled || isMaxItemsReached}
          data-testid="add-portfolio-item-button"
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Portfolio Item
        </Button>
      )}

      {/* Max Items Warning */}
      {isMaxItemsReached && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Maximum {maxItems} portfolio items allowed. Remove an item to add a new one.
          </AlertDescription>
        </Alert>
      )}

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        💡 Tip: Drag and drop items to reorder them. The first 3 items will be featured on your
        public profile.
      </p>
    </div>
  );
}
