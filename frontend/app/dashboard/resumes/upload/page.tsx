'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useResumeStore } from '@/lib/stores/resume-store';
import {
  Upload,
  FileText,
  CheckCircle2,
  X,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { ErrorBanner } from '@/components/ui/error-banner';

export default function ResumeUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadResume, uploadProgress, isUploading, error, clearError } =
    useResumeStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedResumeId, setUploadedResumeId] = useState<string | null>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF and DOCX files are allowed');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    clearError();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelect(file || null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file || null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await uploadResume(selectedFile);
      setUploadComplete(true);
      setUploadedResumeId(result.id);

      // Wait a moment to show success, then redirect
      setTimeout(() => {
        router.push(`/dashboard/resumes/${result.id}`);
      }, 1500);
    } catch (err) {
      // Error is handled by the store
      console.error('Upload failed:', err);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={handleCancel} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resumes
        </Button>
        <h1 className="text-3xl font-bold">Upload Resume</h1>
        <p className="mt-2 text-muted-foreground">
          Upload your resume in PDF or DOCX format. We'll automatically parse and extract
          the information.
        </p>
      </div>

      {/* Error Banner */}
      <ErrorBanner error={error} onDismiss={clearError} />

      {/* Success Message */}
      {uploadComplete && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-800">Upload Successful!</h3>
              <p className="text-sm text-green-700">
                Your resume has been uploaded and is being parsed. Redirecting...
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Choose File</CardTitle>
          <CardDescription>
            Supported formats: PDF, DOCX (Max size: 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* File Upload Area */}
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${isUploading || uploadComplete ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-blue-400'}
              `}
              tabIndex={0}
              role="button"
              aria-label="Upload resume file. Drag and drop or click to browse."
              onClick={handleUploadClick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleUploadClick(); } }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isUploading || uploadComplete}
              />

              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {dragActive
                  ? 'Drop your resume here'
                  : 'Drag and drop your resume here'}
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <Button type="button" variant="outline">
                Browse Files
              </Button>
            </div>
          ) : (
            /* Selected File Preview */
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg bg-gray-50">
                <FileText className="h-10 w-10 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} •{' '}
                    {selectedFile.type.includes('pdf') ? 'PDF' : 'DOCX'}
                  </p>
                </div>
                {!isUploading && !uploadComplete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Uploading...</span>
                    <span className="font-medium text-blue-600">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Upload Button */}
              {!isUploading && !uploadComplete && (
                <div className="flex gap-3">
                  <Button onClick={handleCancel} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleUpload} className="flex-1">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Resume
                  </Button>
                </div>
              )}

              {/* Uploading State */}
              {isUploading && (
                <Button disabled className="w-full">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading... {uploadProgress}%
                </Button>
              )}

              {/* Success State */}
              {uploadComplete && (
                <div className="text-center text-green-600 font-medium">
                  <CheckCircle2 className="mx-auto h-8 w-8 mb-2" />
                  Upload successful! Redirecting...
                </div>
              )}
            </div>
          )}

          {/* Guidelines */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Upload Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Use a well-formatted resume for best parsing results</li>
              <li>Include your contact information at the top</li>
              <li>Use clear section headings (Experience, Education, Skills, etc.)</li>
              <li>Avoid tables, images, or complex formatting</li>
              <li>File size must be less than 10MB</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                1
              </span>
              <div>
                <p className="font-medium">Automatic Parsing</p>
                <p className="text-sm text-muted-foreground">
                  We'll extract your information using AI
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                2
              </span>
              <div>
                <p className="font-medium">Review & Edit</p>
                <p className="text-sm text-muted-foreground">
                  Review the parsed data and make any corrections
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                3
              </span>
              <div>
                <p className="font-medium">Start Applying</p>
                <p className="text-sm text-muted-foreground">
                  Use your resume for job matching and applications
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
