/**
 * Domain Verification Settings Page - Issue #67
 *
 * Dedicated page for domain verification settings.
 * Allows company owners/admins to verify their domain through:
 * - Email verification
 * - DNS TXT record
 * - File upload
 *
 * Following TDD/BDD approach - implements scenarios from:
 * frontend/tests/features/domain-verification.feature
 */

'use client';

import React, { useState, useEffect } from 'react';
import { DomainVerification } from '@/components/employer/DomainVerification';
import { VerifiedBadge } from '@/components/employer/VerifiedBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  domain?: string;
}

export default function DomainVerificationPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch('/api/employer/company/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompany(data);
      } else {
        setError('Failed to load company information');
      }
    } catch (err) {
      setError('Error loading company information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Domain Verification</h1>
          <VerifiedBadge />
        </div>
        <p className="text-muted-foreground">
          Verify your company domain to build trust and prevent impersonation
        </p>
      </div>

      {/* Why Verify Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Why verify your domain?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="font-medium">Build Trust</p>
                <p className="text-sm text-muted-foreground">
                  Show candidates that your company is legitimate and verified
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="font-medium">Prevent Impersonation</p>
                <p className="text-sm text-muted-foreground">
                  Protect your brand from fake job postings and scammers
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="font-medium">Stand Out</p>
                <p className="text-sm text-muted-foreground">
                  Verified companies get priority placement in search results
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="font-medium">Higher Application Rates</p>
                <p className="text-sm text-muted-foreground">
                  Candidates are 3x more likely to apply to verified companies
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Domain Verification Component */}
      <DomainVerification companyDomain={company?.domain} />

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Email verification:</strong> Fastest method if you have access to admin email
            addresses at your domain.
          </p>
          <p>
            <strong>DNS verification:</strong> Requires access to your domain's DNS settings
            (recommended for IT teams).
          </p>
          <p>
            <strong>File verification:</strong> Requires ability to upload files to your website's
            root directory.
          </p>
          <p className="pt-2">
            Having trouble? Contact support at{' '}
            <a href="mailto:support@hireflux.com" className="text-primary hover:underline">
              support@hireflux.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
