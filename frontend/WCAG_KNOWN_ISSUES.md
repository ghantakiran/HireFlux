# WCAG 2.1 AA Compliance - Known Issues

## Issue #148: Document Title Violations on Client Component Pages

### Problem
Pages using the `'use client'` directive cannot utilize Next.js server-side metadata exports. This causes WCAG 2.1 AA violations for document titles (Success Criterion 2.4.2).

### Affected Pages
- `app/dashboard/page.tsx` - Dashboard page
- `app/dashboard/jobs/page.tsx` - Job Matches page
- Other pages with 'use client' directive

### Root Cause
Next.js App Router limitation: Metadata exports (`export const metadata: Metadata`) only work in Server Components. Client Components (pages with `'use client'` directive) cannot export metadata.

### Current Workarounds Implemented
1. Created layout files with metadata at parent level:
   - `app/dashboard/layout.tsx`
   - `app/dashboard/jobs/layout.tsx`
   - And 7 other layout files

2. Fixed viewport warnings by using `generateViewport()` export in root layout

### Test Results
- ✅ Homepage: 0 violations (Server Component)
- ❌ Dashboard: 1 serious violation (document-title) - Client Component
- ❌ Job Matches: 1 serious violation (document-title) - Client Component

### Recommended Solutions

#### Option 1: Refactor Pages (Recommended)
Remove 'use client' from page components and move client-side logic to child components:
```typescript
// page.tsx (Server Component)
import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: '...',
};

export default function DashboardPage() {
  return <DashboardClient />;
}

// DashboardClient.tsx (Client Component)
'use client';
// All hooks and client logic here
```

#### Option 2: Use generateMetadata Function
Use dynamic metadata generation:
```typescript
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Dashboard',
    description: '...',
  };
}
```

#### Option 3: Use template.tsx
Move client logic to template.tsx and keep page.tsx as server component.

### Priority
**P0** - Critical for WCAG 2.1 AA compliance

### Status
**In Progress** - Metadata infrastructure implemented, architectural refactor required

### Next Steps
1. Decide on architectural approach (Option 1 recommended)
2. Refactor affected pages to separate client/server concerns
3. Re-run WCAG tests to verify 0 violations
4. Update tests to cover all pages

---
*Last Updated: 2025-12-17*
*Issue: #148 WCAG 2.1 AA Compliance Audit*
