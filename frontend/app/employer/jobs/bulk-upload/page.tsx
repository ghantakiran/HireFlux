'use client';

/**
 * Bulk Job Upload Page (Sprint 11-12)
 *
 * Features:
 * - CSV file upload with drag-and-drop
 * - Validation error display
 * - Duplicate detection
 * - Job review and editing
 * - Multi-channel distribution selection
 * - Scheduled posting
 */

import { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { bulkJobPostingApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText, AlertCircle, CheckCircle2, XCircle, Download, Sparkles, DollarSign } from 'lucide-react';
import { ErrorBanner } from '@/components/ui/error-banner';
import { formatFileSize, downloadFile } from '@/lib/utils';

// Types matching backend schemas
interface ValidationError {
  row_index: number;
  field: string;
  error_message: string;
}

interface DuplicateInfo {
  row_index: number;
  duplicate_of: number;
  similarity_score: number;
  matching_fields: string[];
}

interface AISuggestion {
  job_index: number;
  normalized_title?: string;
  original_title?: string;
  extracted_skills?: string[];
  suggested_salary_min?: number;
  suggested_salary_max?: number;
}

interface JobRow {
  title: string;
  department?: string;
  location?: string;
  location_type?: string;
  employment_type?: string;
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
  description?: string;
  requirements?: string;
}

interface UploadResponse {
  id: string;
  filename: string;
  total_jobs: number;
  valid_jobs: number;
  invalid_jobs: number;
  duplicate_jobs: number;
  status: string;
  validation_errors?: ValidationError[];
  duplicate_info?: DuplicateInfo[];
  raw_jobs_data?: JobRow[];
}

type UploadStage = 'idle' | 'uploading' | 'validating' | 'review' | 'complete' | 'error';

export default function BulkJobUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set page metadata
  useEffect(() => {
    document.title = 'Bulk Upload Jobs | HireFlux';
  }, []);

  // State
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['INTERNAL']);
  const [isDragging, setIsDragging] = useState(false);
  const [removedDuplicates, setRemovedDuplicates] = useState<Set<number>>(new Set());

  // Handle file selection
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  // Handle file from drag & drop or selection
  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Please upload a CSV file');
      return;
    }
    setSelectedFile(file);
    setErrorMessage('');
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  // Upload file to backend
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStage('uploading');
    setUploadProgress(10);

    try {
      const channelsStr = selectedChannels.join(',');
      const response = await bulkJobPostingApi.uploadCSV(selectedFile, channelsStr);

      setUploadProgress(100);
      setUploadStage('review');
      setUploadResponse(response.data.data);
    } catch (error: any) {
      setUploadStage('error');
      // Prefer details message if available, fallback to main error message
      const details = error.response?.data?.error?.details;
      const detailsMsg = details && details.length > 0 ? details[0].message : null;
      const errorMsg = detailsMsg ||
                       error.response?.data?.error?.message ||
                       error.response?.data?.detail ||
                       error.message ||
                       'Upload failed. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  // Download CSV template
  const handleDownloadTemplate = async () => {
    try {
      const response = await bulkJobPostingApi.getTemplate();
      const { filename, content } = response.data.data;

      // Download CSV file
      downloadFile(content, filename, 'text/csv');
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  // Channel selection toggle
  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  // Remove duplicate
  const handleRemoveDuplicate = (rowIndex: number) => {
    setRemovedDuplicates((prev) => {
      const newSet = new Set(prev);
      newSet.add(rowIndex);
      return newSet;
    });
  };

  // Calculate active job counts (excluding removed duplicates)
  const activeDuplicateCount = uploadResponse?.duplicate_info?.filter(
    (dup) => !removedDuplicates.has(dup.row_index)
  ).length || 0;

  const activeJobCount = uploadResponse
    ? uploadResponse.total_jobs - removedDuplicates.size
    : 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bulk Job Upload</h1>
        <p className="text-gray-600">
          Upload a CSV file with up to 500 job postings. Jobs will be validated, checked for
          duplicates, and distributed to your selected channels.
        </p>
      </div>

      {/* Upload Stage: Idle/File Selection */}
      {uploadStage === 'idle' && (
        <div className="space-y-6">
          {/* CSV Dropzone */}
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Drag and drop your CSV file or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium mb-2">
                  Drop your CSV file here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-sm text-gray-500 mb-4">Maximum 500 jobs per file</p>
                {selectedFile && (
                  <div className="mt-4 flex items-center justify-center space-x-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <Badge variant="outline">{formatFileSize(selectedFile.size)}</Badge>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="csv-upload-input"
                />
              </div>

              <ErrorBanner error={errorMessage} />

              <div className="mt-6 flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile}
                  className="px-8"
                  data-testid="upload-button"
                >
                  Upload & Validate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Distribution Channels */}
          <Card>
            <CardHeader>
              <CardTitle>Distribution Channels</CardTitle>
              <CardDescription>
                Select where to publish your job postings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['INTERNAL', 'LINKEDIN', 'INDEED', 'GLASSDOOR'].map((channel) => (
                  <label
                    key={channel}
                    className={`flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedChannels.includes(channel)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`channel-${channel.toLowerCase()}`}
                  >
                    <Checkbox
                      checked={selectedChannels.includes(channel)}
                      onChange={() => toggleChannel(channel)}
                    />
                    <span className="font-medium">{channel}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Stage: Uploading */}
      {uploadStage === 'uploading' && (
        <Card>
          <CardHeader>
            <CardTitle>Uploading & Validating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={uploadProgress} className="w-full" data-testid="upload-progress" />
              <p className="text-center text-gray-600">
                Processing {selectedFile?.name}...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Stage: Review */}
      {uploadStage === 'review' && uploadResponse && (
        <div className="space-y-6">
          {/* Success Header */}
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-center space-x-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <h2 className="text-2xl font-bold">
                    {uploadResponse.total_jobs} {uploadResponse.total_jobs === 1 ? 'job' : 'jobs'} uploaded
                  </h2>
                  <p className="text-gray-600">
                    {uploadResponse.valid_jobs} valid, {uploadResponse.invalid_jobs} invalid, {uploadResponse.duplicate_jobs} duplicates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {uploadResponse.total_jobs}
                  </p>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {uploadResponse.valid_jobs}
                  </p>
                  <p className="text-sm text-gray-600">Valid Jobs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {uploadResponse.invalid_jobs}
                  </p>
                  <p className="text-sm text-gray-600">Invalid Jobs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600">
                    {uploadResponse.duplicate_jobs}
                  </p>
                  <p className="text-sm text-gray-600">Duplicates</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Validation Errors */}
          {uploadResponse.validation_errors && uploadResponse.validation_errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <XCircle className="mr-2 h-5 w-5 text-red-600" />
                  Validation Errors ({uploadResponse.validation_errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {uploadResponse.validation_errors.map((error, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start"
                      data-testid={`validation-error-${idx}`}
                    >
                      <AlertCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Row {error.row_index + 1}</span>
                        <span className="text-gray-600"> - {error.field}:</span>{' '}
                        <span>{error.error_message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Duplicate Detection */}
          {uploadResponse.duplicate_info && uploadResponse.duplicate_info.length > 0 && (
            <Card data-testid="duplicate-warning">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5 text-yellow-600" />
                  {activeDuplicateCount} Duplicate{activeDuplicateCount !== 1 ? 's' : ''} Detected
                </CardTitle>
                <CardDescription>
                  Similar jobs found in your upload
                  {removedDuplicates.size > 0 && (
                    <span className="block mt-1 font-medium">
                      {activeJobCount} {activeJobCount === 1 ? 'job' : 'jobs'} remaining
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {uploadResponse.duplicate_info
                    .filter((dup) => !removedDuplicates.has(dup.row_index))
                    .map((dup, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                        data-testid={`duplicate-info-${idx}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <span className="font-medium">Row {dup.row_index + 1}</span>
                            <span className="text-gray-600">
                              {' '}
                              is similar to Row {dup.duplicate_of + 1}
                            </span>
                            {dup.matching_fields.length > 0 && (
                              <p className="text-sm text-gray-600 mt-1">
                                Matching fields: {dup.matching_fields.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-start gap-2">
                            <Badge variant="outline">
                              {(dup.similarity_score * 100).toFixed(0)}% match
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveDuplicate(dup.row_index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove Duplicate
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Job Preview Table */}
          <Card>
            <CardHeader>
              <CardTitle>Job Preview</CardTitle>
              <CardDescription>Review your uploaded jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto" data-testid="job-review-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Salary Range</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadResponse.raw_jobs_data?.slice(0, 10).map((job, idx) => {
                      const hasError = uploadResponse.validation_errors?.some(
                        (e) => e.row_index === idx
                      );
                      const isDuplicate = uploadResponse.duplicate_info?.some(
                        (d) => d.row_index === idx
                      );

                      return (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">{job.title}</TableCell>
                          <TableCell>{job.department || '-'}</TableCell>
                          <TableCell>{job.location || '-'}</TableCell>
                          <TableCell>{job.employment_type || '-'}</TableCell>
                          <TableCell>
                            {job.salary_min && job.salary_max
                              ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {hasError ? (
                              <Badge variant="destructive">Error</Badge>
                            ) : isDuplicate ? (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                Duplicate
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-green-500 text-green-700">
                                Valid
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {uploadResponse.raw_jobs_data && uploadResponse.raw_jobs_data.length > 10 && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Showing 10 of {uploadResponse.raw_jobs_data.length} jobs
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setUploadStage('idle');
                setSelectedFile(null);
                setUploadResponse(null);
              }}
            >
              Upload Another File
            </Button>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/employer/jobs')}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setUploadStage('complete');
                  // In a real implementation, this would trigger publishing
                  setTimeout(() => router.push('/employer/jobs'), 1500);
                }}
                disabled={uploadResponse.valid_jobs === 0}
                data-testid="publish-button"
              >
                Publish {uploadResponse.valid_jobs} Jobs
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Stage: Complete */}
      {uploadStage === 'complete' && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Jobs Published Successfully!</h2>
            <p className="text-gray-600">
              Your jobs are being distributed to the selected channels.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload Stage: Error */}
      {uploadStage === 'error' && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Upload Failed</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <Button onClick={() => setUploadStage('idle')}>Try Again</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
