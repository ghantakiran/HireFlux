'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Coins,
  Loader2,
  TrendingUp,
  TrendingDown,
  FileText,
  Briefcase,
  Bot,
  Search,
  DollarSign,
} from 'lucide-react';
import { useBillingStore } from '@/lib/stores/billing-store';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PageLoader } from '@/components/ui/page-loader';
import { EmptyState } from '@/components/ui/empty-state';

// Credit packages
const CREDIT_PACKAGES = [
  {
    amount: 1000,
    price: 10,
    popular: false,
  },
  {
    amount: 2500,
    price: 20,
    popular: true,
    savings: '20%',
  },
  {
    amount: 5000,
    price: 35,
    popular: false,
    savings: '30%',
  },
  {
    amount: 10000,
    price: 60,
    popular: false,
    savings: '40%',
  },
];

export default function CreditsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    credits,
    creditHistory,
    isLoadingCredits,
    creditsError,
    isCreatingCheckout,
    fetchCredits,
    fetchCreditHistory,
    purchaseCredits,
    clearErrors,
  } = useBillingStore();

  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);

  // Fetch credits on mount
  useEffect(() => {
    fetchCredits();
    fetchCreditHistory();
  }, []);

  // Handle purchase success/cancel
  useEffect(() => {
    const purchaseStatus = searchParams.get('purchase');
    if (purchaseStatus === 'success') {
      toast.success('Credits purchased!', {
        description: 'Your credits have been added to your account.',
      });
      fetchCredits();
      router.replace('/dashboard/settings/credits');
    } else if (purchaseStatus === 'cancelled') {
      toast.error('Purchase cancelled', {
        description: 'You can try again anytime.',
      });
      router.replace('/dashboard/settings/credits');
    }
  }, [searchParams]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      clearErrors();

      const checkoutData = await purchaseCredits(selectedPackage);

      // Redirect to Stripe Checkout
      window.location.href = checkoutData.session_url;
    } catch (error) {
      toast.error('Failed to start checkout', {
        description: 'Please try again or contact support.',
      });
    }
  };

  const getCreditTypeIcon = (type: string) => {
    switch (type) {
      case 'ai':
        return <Bot className="h-4 w-4" />;
      case 'cover_letter':
        return <FileText className="h-4 w-4" />;
      case 'auto_apply':
        return <Briefcase className="h-4 w-4" />;
      case 'job_suggestion':
        return <Search className="h-4 w-4" />;
      default:
        return <Coins className="h-4 w-4" />;
    }
  };

  const getCreditTypeName = (type: string) => {
    const names: Record<string, string> = {
      ai: 'AI Generation',
      cover_letter: 'Cover Letter',
      auto_apply: 'Auto-Apply',
      job_suggestion: 'Job Suggestion',
    };
    return names[type] || type;
  };

  // Loading state
  if (isLoadingCredits && !credits) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageLoader message="Loading credits..." />
      </div>
    );
  }

  const totalCredits =
    (credits?.ai_credits || 0) +
    (credits?.cover_letter_credits || 0) +
    (credits?.auto_apply_credits || 0) +
    (credits?.job_suggestion_credits || 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Credits & Usage</h1>
        <p className="text-muted-foreground">
          Manage your credits and view usage history
        </p>
      </div>

      {/* Error Banner */}
      <ErrorBanner error={creditsError} onDismiss={clearErrors} />

      {/* Credit Balance Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">
                {credits?.ai_credits === -1 ? '∞' : credits?.ai_credits || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Resume & content generation
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cover Letters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">
                {credits?.cover_letter_credits === -1
                  ? '∞'
                  : credits?.cover_letter_credits || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              AI-powered cover letters
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Auto-Apply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">
                {credits?.auto_apply_credits || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Automated job applications
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Job Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold">
                {credits?.job_suggestion_credits === -1
                  ? '∞'
                  : credits?.job_suggestion_credits || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Personalized job matches
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Credits Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Purchase Credits</CardTitle>
          <CardDescription>
            Buy credits to unlock more features and applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {CREDIT_PACKAGES.map((pkg) => (
              <Card
                key={pkg.amount}
                className={`cursor-pointer transition-all ${
                  pkg.popular ? 'border-2 border-blue-500' : ''
                } ${selectedPackage === pkg.amount ? 'bg-blue-50 border-blue-500' : ''}`}
                variant="interactive"
                onClick={() => {
                  setSelectedPackage(pkg.amount);
                  setPurchaseDialogOpen(true);
                }}
              >
                {pkg.popular && (
                  <div className="bg-blue-500 text-white text-xs font-semibold text-center py-1">
                    Best Value
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span className="text-2xl font-bold">{pkg.amount.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">credits</p>

                    <div className="text-xl font-bold mb-2">${pkg.price}</div>
                    {pkg.savings && (
                      <Badge variant="secondary" className="text-xs">
                        Save {pkg.savings}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Credits never expire and can be used across all features
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {credits && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lifetime Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Total Earned
                  </span>
                  <span className="font-semibold">{credits.total_earned.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Total Spent
                  </span>
                  <span className="font-semibold">{credits.total_spent.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Balance</span>
                    <span className="text-lg font-bold text-blue-600">
                      {totalCredits.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Last Reset</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Credits reset monthly based on your subscription plan.
              </p>
              {credits.last_reset && (
                <p className="text-sm font-medium mt-2">
                  Last reset: {formatDateTime(credits.last_reset)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent credit transactions and usage</CardDescription>
        </CardHeader>
        <CardContent>
          {creditHistory.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No transactions yet"
              description="Your credit purchase and usage history will appear here once you start using premium features."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditHistory.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(transaction.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCreditTypeIcon(transaction.credit_type)}
                        <span className="text-sm">
                          {getCreditTypeName(transaction.credit_type)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          transaction.operation === 'add'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {transaction.operation === 'add' ? '+' : '-'}
                        {transaction.amount}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {transaction.operation === 'add' ? '+' : '-'}
                      {transaction.amount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transaction.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You're about to purchase {selectedPackage?.toLocaleString()} credits
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground">Credits</span>
              <span className="font-semibold">{selectedPackage?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground">Price</span>
              <span className="font-semibold">
                $
                {CREDIT_PACKAGES.find((pkg) => pkg.amount === selectedPackage)?.price}
              </span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Credits never expire and can be used across all features.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePurchase} disabled={isCreatingCheckout}>
              {isCreatingCheckout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Purchase Credits'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
