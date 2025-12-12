/**
 * File Upload Error Component
 * Displays file upload errors (size, type, etc.)
 */

'use client';

import React from 'react';
import { FileX, FileWarning, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface FileUploadErrorProps {
  type: 'too_large' | 'invalid_type' | 'upload_failed';
  maxSize?: string;
  acceptedTypes?: string[];
  onRetry?: () => void;
  onSelectNew?: () => void;
}

export function FileUploadError({
  type,
  maxSize = '5MB',
  acceptedTypes = ['PDF', 'DOCX'],
  onRetry,
  onSelectNew,
}: FileUploadErrorProps) {
  const getMessage = () => {
    switch (type) {
      case 'too_large':
        return 'File Too Large';
      case 'invalid_type':
        return 'Invalid File Type';
      case 'upload_failed':
        return 'Upload Failed';
      default:
        return 'Upload Error';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'too_large':
        return `Your file exceeds the maximum allowed size of ${maxSize}. Please compress your file or select a smaller one.`;
      case 'invalid_type':
        return `This file type is not supported. Please upload a file in one of these formats: ${acceptedTypes.join(', ')}.`;
      case 'upload_failed':
        return 'The upload failed due to a network or server error. Please try again.';
      default:
        return 'There was a problem uploading your file.';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'too_large':
        return <FileWarning className="h-4 w-4" />;
      case 'invalid_type':
        return <FileX className="h-4 w-4" />;
      default:
        return <FileWarning className="h-4 w-4" />;
    }
  };

  const getSuggestions = () => {
    switch (type) {
      case 'too_large':
        return [
          'Compress your file using an online tool',
          'Remove high-resolution images',
          'Save in a more compressed format',
        ];
      case 'invalid_type':
        return [
          `Convert your file to ${acceptedTypes[0]}`,
          'Export from your editor in the correct format',
        ];
      default:
        return ['Check your internet connection', 'Try again in a moment'];
    }
  };

  return (
    <div className="p-4">
      <Alert variant="destructive" data-testid="file-error">
        {getIcon()}
        <AlertTitle>{getMessage()}</AlertTitle>
        <AlertDescription>
          <p className="mb-4">{getDescription()}</p>

          {/* File Constraints */}
          {(type === 'too_large' || type === 'invalid_type') && (
            <div className="bg-red-950/20 rounded-lg p-3 mb-4 text-sm">
              {type === 'too_large' && (
                <p>
                  <strong>Maximum file size:</strong> {maxSize}
                </p>
              )}
              {type === 'invalid_type' && (
                <p>
                  <strong>Accepted file types:</strong> {acceptedTypes.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Suggestions */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              What you can do:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {getSuggestions().map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {onSelectNew && (
              <Button onClick={onSelectNew} size="sm" variant="outline">
                Select Different File
              </Button>
            )}
            {onRetry && type === 'upload_failed' && (
              <Button onClick={onRetry} size="sm">
                Try Again
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
