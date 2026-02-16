/**
 * ResumePreview Component (Issue #94)
 *
 * Document/PDF preview component for displaying resumes and cover letters
 * Uses iframe-based rendering with download, print, and fullscreen capabilities
 * Used across job seeker and employer views for document review
 */

'use client';

import { cn, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/domain/EmptyState';
import { Download, Printer, Maximize2, FileText, AlertCircle, RotateCw } from 'lucide-react';
import { format } from 'date-fns';

export interface ResumePreviewProps {
  /** URL to the resume/document */
  url: string;
  /** Optional file name */
  fileName?: string;
  /** Optional title */
  title?: string;
  /** Callback when download button clicked */
  onDownload?: () => void;
  /** Callback when print button clicked */
  onPrint?: () => void;
  /** Callback when fullscreen button clicked */
  onFullscreen?: () => void;
  /** Callback when retry button clicked (on error) */
  onRetry?: () => void;
  /** Whether to show print button */
  showPrint?: boolean;
  /** Whether to show fullscreen button */
  showFullscreen?: boolean;
  /** Whether to show metadata (file size, date, pages) */
  showMetadata?: boolean;
  /** File size in bytes */
  fileSize?: number;
  /** Upload date */
  uploadDate?: Date;
  /** Number of pages */
  pageCount?: number;
  /** Preview height in pixels */
  height?: number;
  /** Error message */
  error?: string;
  /** Loading state */
  loading?: boolean;
  /** Visual variant */
  variant?: 'default' | 'card' | 'minimal';
  /** Additional CSS classes */
  className?: string;
}

export function ResumePreview({
  url,
  fileName,
  title,
  onDownload,
  onPrint,
  onFullscreen,
  onRetry,
  showPrint = false,
  showFullscreen = false,
  showMetadata = true,
  fileSize,
  uploadDate,
  pageCount,
  height = 600,
  error,
  loading = false,
  variant = 'default',
  className,
}: ResumePreviewProps) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleFullscreen = () => {
    if (onFullscreen) {
      onFullscreen();
    }
  };

  // Empty/No URL state
  if (!url && !loading && !error) {
    return (
      <div
        data-resume-preview
        data-variant={variant}
        role="region"
        aria-label="Resume preview"
        className={cn(
          'w-full',
          variant === 'card' && 'rounded-lg border border-border bg-card p-4 shadow-sm',
          className
        )}
      >
        <EmptyState title="No resume available" variant="compact" icon={<FileText className="h-12 w-12" />} />
      </div>
    );
  }

  // Container classes based on variant
  const containerClasses = cn(
    'w-full',
    variant === 'card' && 'rounded-lg border border-border bg-card p-4 shadow-sm',
    variant === 'minimal' && 'p-0',
    className
  );

  return (
    <div
      data-resume-preview
      data-variant={variant}
      role="region"
      aria-label={`Resume preview: ${fileName || 'Document'}`}
      className={containerClasses}
    >
      {/* Header */}
      {variant !== 'minimal' && (title || fileName) && (
        <div className="mb-4">
          {title && <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>}
          {fileName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      {showMetadata && variant !== 'minimal' && (fileSize || uploadDate || pageCount) && (
        <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {fileSize && <span>{formatFileSize(fileSize)}</span>}
          {uploadDate && <span>Uploaded {format(uploadDate, 'MMM d, yyyy')}</span>}
          {pageCount && <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>}
        </div>
      )}

      {/* Action Buttons */}
      {variant !== 'minimal' && (
        <div className="mb-4 flex flex-wrap gap-2">
          {/* Download Button */}
          <a
            href={url}
            download={fileName}
            onClick={handleDownload}
            className="inline-block"
          >
            <Button
              disabled={loading}
              size="sm"
              variant="outline"
              aria-label="Download resume"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </a>

          {/* Print Button */}
          {showPrint && (
            <Button
              onClick={handlePrint}
              disabled={loading}
              size="sm"
              variant="outline"
              aria-label="Print resume"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          )}

          {/* Fullscreen Button */}
          {showFullscreen && (
            <Button
              onClick={handleFullscreen}
              disabled={loading}
              size="sm"
              variant="outline"
              aria-label="View fullscreen"
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Fullscreen
            </Button>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                aria-label="Retry loading resume"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div
          role="status"
          aria-label="Loading"
          className="flex items-center justify-center rounded-lg bg-muted"
          style={{ height: `${height}px` }}
        >
          <div className="text-center">
            <div className="h-8 w-8 mx-auto mb-2 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading resume...</p>
          </div>
        </div>
      )}

      {/* PDF Viewer (iframe) */}
      {!error && url && (
        <iframe
          src={url}
          title={fileName || 'Resume preview'}
          className={cn(
            'w-full rounded-lg border border-border',
            loading && 'hidden'
          )}
          style={{ height: `${height}px` }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      )}
    </div>
  );
}
