/**
 * Domain Verification Component - Issue #67
 *
 * Component for verifying company domain ownership through:
 * - Email verification (send to admin@/postmaster@/webmaster@domain)
 * - DNS TXT record verification
 * - File upload verification (upload file to website root)
 *
 * Following TDD/BDD approach - implements scenarios from:
 * frontend/tests/features/domain-verification.feature
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Globe,
  FileText,
  Copy,
  RefreshCw,
  Shield,
  Info,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

// Types
interface VerificationStatus {
  verified: boolean;
  domain?: string;
  method?: 'email' | 'dns' | 'file';
  attempts: number;
  last_attempt?: string;
  verified_at?: string;
  can_retry: boolean;
  remaining_attempts: number;
}

interface VerificationInstructions {
  success: boolean;
  verification_id: string;
  method: string;
  instructions: string;
  verification_token?: string;
  expires_at?: string;
  txt_record?: string;
  txt_record_value?: string;
  filename?: string;
  file_content?: string;
}

export function DomainVerification({ companyDomain }: { companyDomain?: string }) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [instructions, setInstructions] = useState<VerificationInstructions | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'dns' | 'file'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch verification status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/employer/domain-verification/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Error fetching verification status:', err);
    }
  };

  const initiateVerification = async () => {
    if (!companyDomain) {
      setError('Please set your company domain in profile settings first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/employer/domain-verification/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: companyDomain,
          method: selectedMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to initiate verification');
      }

      setInstructions(data);
      setSuccess(data.instructions);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate verification');
    } finally {
      setLoading(false);
    }
  };

  const verifyDomain = async () => {
    setVerifyLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/employer/domain-verification/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: selectedMethod,
          token: instructions?.verification_token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Verification failed');
      }

      if (data.verified) {
        setSuccess('Domain verified successfully! ✓');
        await fetchStatus();
        setInstructions(null);
      } else {
        setError(data.message || 'Verification failed. Please check your setup and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  const resendEmail = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/employer/domain-verification/resend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to resend email');
      }

      setSuccess('Verification emails resent successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to resend email');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status?.verified) {
    return (
      <Card data-testid="domain-verification-verified">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Domain Verified
              </CardTitle>
              <CardDescription>
                Your domain {status.domain} has been verified
              </CardDescription>
            </div>
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Verification method:</strong> {status.method?.toUpperCase()}
            </p>
            <p>
              <strong>Verified on:</strong>{' '}
              {status.verified_at
                ? formatDate(status.verified_at)
                : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="domain-verification-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Domain Verification
            </CardTitle>
            <CardDescription>
              Verify your company domain to prevent impersonation and build trust
            </CardDescription>
          </div>
          {status && !status.verified && (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Not Verified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Domain Info */}
        {companyDomain ? (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{companyDomain}</span>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please set your company domain in the profile settings first.
            </AlertDescription>
          </Alert>
        )}

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" data-testid="verification-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200" data-testid="verification-success">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Rate Limit Info */}
        {status && !status.can_retry && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You've reached the maximum verification attempts (5 per 24 hours). Please try again
              later.
            </AlertDescription>
          </Alert>
        )}

        {status && status.can_retry && status.remaining_attempts < 3 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {status.remaining_attempts} verification attempt{status.remaining_attempts !== 1 ? 's' : ''} remaining today.
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Methods */}
        <Tabs
          value={selectedMethod}
          onValueChange={(value) => setSelectedMethod(value as 'email' | 'dns' | 'file')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" data-testid="method-email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="dns" data-testid="method-dns">
              <Globe className="h-4 w-4 mr-2" />
              DNS
            </TabsTrigger>
            <TabsTrigger value="file" data-testid="method-file">
              <FileText className="h-4 w-4 mr-2" />
              File
            </TabsTrigger>
          </TabsList>

          {/* Email Verification */}
          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Email Verification</h4>
              <p className="text-sm text-muted-foreground">
                We'll send verification emails to admin@, postmaster@, and webmaster@ addresses at
                your domain. Click the link in the email to verify.
              </p>
            </div>

            {instructions && instructions.method === 'email' && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Verification emails sent to:</p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>admin@{companyDomain}</li>
                  <li>postmaster@{companyDomain}</li>
                  <li>webmaster@{companyDomain}</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Expires: {instructions.expires_at ? new Date(instructions.expires_at).toLocaleString() : 'N/A'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resendEmail}
                  disabled={loading}
                  data-testid="resend-email-button"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Resend Email
                </Button>
              </div>
            )}

            <Button
              onClick={initiateVerification}
              disabled={loading || !companyDomain || (status !== null && !status.can_retry)}
              data-testid="initiate-verification-button"
            >
              {loading ? 'Sending...' : 'Send Verification Email'}
            </Button>
          </TabsContent>

          {/* DNS Verification */}
          <TabsContent value="dns" className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">DNS Verification</h4>
              <p className="text-sm text-muted-foreground">
                Add a TXT record to your domain's DNS settings to verify ownership.
              </p>
            </div>

            {instructions && instructions.method === 'dns' && (
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">TXT Record Name</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-background rounded border text-sm">
                        {instructions.txt_record}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(instructions.txt_record || '')}
                        data-testid="copy-txt-record"
                        aria-label="Copy TXT record"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">TXT Record Value</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-background rounded border text-sm break-all">
                        {instructions.txt_record_value}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(instructions.txt_record_value || '')}
                        data-testid="copy-txt-value"
                        aria-label="Copy TXT record value"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {copied && (
                    <p className="text-xs text-green-600">Copied to clipboard!</p>
                  )}
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    DNS changes can take up to 48 hours to propagate. After adding the record,
                    click "Verify DNS Record" below.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={verifyDomain}
                  disabled={verifyLoading}
                  data-testid="verify-dns-button"
                >
                  {verifyLoading ? 'Verifying...' : 'Verify DNS Record'}
                </Button>
              </div>
            )}

            {!instructions && (
              <Button
                onClick={initiateVerification}
                disabled={loading || !companyDomain || (status !== null && !status.can_retry)}
                data-testid="initiate-dns-button"
              >
                {loading ? 'Generating...' : 'Generate DNS Record'}
              </Button>
            )}
          </TabsContent>

          {/* File Verification */}
          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">File Verification</h4>
              <p className="text-sm text-muted-foreground">
                Upload a verification file to your website's root directory to verify ownership.
              </p>
            </div>

            {instructions && instructions.method === 'file' && (
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Filename</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-background rounded border text-sm">
                        {instructions.filename}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(instructions.filename || '')}
                        aria-label="Copy filename"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">File Content</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-background rounded border text-sm break-all">
                        {instructions.file_content}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(instructions.file_content || '')}
                        data-testid="copy-file-content"
                        aria-label="Copy file content"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {copied && (
                    <p className="text-xs text-green-600">Copied to clipboard!</p>
                  )}
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Upload this file to: https://{companyDomain}/{instructions.filename}
                    <br />
                    After uploading, click "Verify File" below.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={verifyDomain}
                  disabled={verifyLoading}
                  data-testid="verify-file-button"
                >
                  {verifyLoading ? 'Verifying...' : 'Verify File'}
                </Button>
              </div>
            )}

            {!instructions && (
              <Button
                onClick={initiateVerification}
                disabled={loading || !companyDomain || (status !== null && !status.can_retry)}
                data-testid="initiate-file-button"
              >
                {loading ? 'Generating...' : 'Generate Verification File'}
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
