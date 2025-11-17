/**
 * Company Logo Upload Component - Sprint 19-20 Week 39 Day 4 - Issue #21
 *
 * Handles company logo upload/delete with:
 * - Drag & drop or file select
 * - Image preview before upload
 * - Format validation (PNG, JPG, JPEG, SVG)
 * - Size validation (max 5MB)
 * - Delete confirmation
 * - Auto-resize notification (backend resizes to 400x400)
 *
 * BDD Scenarios:
 * - Upload logo success
 * - Preview before upload
 * - Delete existing logo
 * - Replace existing logo
 * - File size/format validation errors
 */

'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Trash2, X, AlertCircle, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface CompanyLogoUploadProps {
  currentLogoUrl?: string;
  onUpload: (logoUrl: string) => void;
  onDelete: () => void;
}

export function CompanyLogoUpload({
  currentLogoUrl,
  onUpload,
  onDelete,
}: CompanyLogoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be under 5MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`;
    }

    // Check format
    if (!ALLOWED_FORMATS.includes(file.type)) {
      return 'Only PNG, JPG, and SVG formats are allowed';
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setShowPreview(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/v1/employers/me/logo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload logo');
      }

      const result = await response.json();
      const logoUrl = result.success ? result.data.logo_url : result.logo_url;

      onUpload(logoUrl);
      setShowPreview(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/v1/employers/me/logo', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete logo');
      }

      onDelete();
      setShowDeleteConfirm(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete logo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Logo or Upload Zone */}
      <div className="flex items-start gap-6">
        {/* Logo Preview */}
        <div className="flex-shrink-0">
          {currentLogoUrl ? (
            <div className="relative w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
              <Image
                src={currentLogoUrl}
                alt="Company logo"
                fill
                className="object-contain p-2"
              />
            </div>
          ) : (
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              <ImageIcon className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Upload/Delete Actions */}
        <div className="flex-1 space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Drag and drop your logo here, or
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">
              PNG, JPG or SVG (max 5MB). Images will be resized to 400x400px
            </p>
          </div>

          {/* Delete Button (if logo exists) */}
          {currentLogoUrl && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Logo
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={handleCancelPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview Logo</DialogTitle>
            <DialogDescription>
              Review your logo before uploading. It will be automatically resized to 400x400px
              if larger.
            </DialogDescription>
          </DialogHeader>

          {previewUrl && (
            <div className="flex justify-center py-4">
              <div className="relative w-64 h-64 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <Image
                  src={previewUrl}
                  alt="Logo preview"
                  fill
                  className="object-contain p-4"
                />
              </div>
            </div>
          )}

          {selectedFile && (
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>File name:</strong> {selectedFile.name}
              </p>
              <p>
                <strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
              <p>
                <strong>Type:</strong> {selectedFile.type}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelPreview}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading} className="gap-2">
              <Upload className="h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Logo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the company logo? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
