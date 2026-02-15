import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Clock, AlertCircle } from 'lucide-react';
import type { CoverLetterTone, CoverLetterLength } from '@/lib/stores/cover-letter-store';
import { ParseStatus } from '@/lib/stores/resume-store';

/** Cover letter tone badge with dark mode support */
export function ToneBadge({ tone }: { tone: CoverLetterTone }) {
  const configs = {
    formal: { label: 'Formal', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    concise: { label: 'Concise', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
    conversational: { label: 'Conversational', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  };

  const config = configs[tone];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

/** Cover letter length badge */
export function LengthBadge({ length }: { length: CoverLetterLength }) {
  const labels: Record<CoverLetterLength, string> = {
    short: 'Short (~150 words)',
    medium: 'Medium (~250 words)',
    long: 'Long (~350 words)',
  };

  return (
    <Badge variant="outline" className="bg-gray-100 text-gray-800">
      {labels[length]}
    </Badge>
  );
}

/** Resume parse status badge with icons */
export function ParseStatusBadge({ status }: { status: ParseStatus }) {
  switch (status) {
    case ParseStatus.COMPLETED:
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Parsed
        </Badge>
      );
    case ParseStatus.PROCESSING:
      return (
        <Badge variant="default" className="bg-blue-500">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case ParseStatus.PENDING:
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case ParseStatus.FAILED:
      return (
        <Badge variant="destructive">
          <AlertCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return null;
  }
}
