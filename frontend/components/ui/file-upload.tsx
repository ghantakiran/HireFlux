'use client';

import { useId, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  maxSizeMb?: number;
  onFileSelected?: (file: File) => void;
  className?: string;
}

export function FileUpload({ accept, maxSizeMb = 10, onFileSelected, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMb}MB.`);
      return;
    }
    setError(null);
    onFileSelected?.(file);
  }

  return (
    <div
      className={`rounded-lg border border-dashed p-6 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      } ${className ?? ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      role="region"
      aria-label="File upload"
      aria-describedby={error ? errorId : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label="Choose file to upload"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-3">
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-primary hover:underline"
          >
            Click to upload
          </button>{' '}
          or drag and drop
        </div>
        {accept && <p className="text-xs text-muted-foreground">Accepted: {accept}</p>}
        <p className="text-xs text-muted-foreground">Max size: {maxSizeMb}MB</p>
        {error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}


