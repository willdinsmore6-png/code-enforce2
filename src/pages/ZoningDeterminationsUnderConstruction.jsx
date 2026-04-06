import { Link } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';

/**
 * Shown when zoning determination routes are disabled (e.g. ZoningDetermination entity not on backend).
 * Flip `ZONING_DETERMINATIONS_ENABLED` in `@/lib/features` to restore full pages.
 */
export default function ZoningDeterminationsUnderConstruction() {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Zoning determinations"
        description="This section is temporarily unavailable while municipal data configuration is finalized."
        helpTitle="Zoning determinations"
        helpContent={
          <p>
            Administrative zoning determination files will return here once your Base44 app includes the{' '}
            <strong>ZoningDetermination</strong> entity. Code enforcement cases, timelines, and Meridian are unchanged.
          </p>
        }
      />
      <div className="mt-8 flex flex-col items-center rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <HardHat className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold">Under construction</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Creating or opening zoning determination files isn&apos;t available yet. You won&apos;t lose work — nothing is
          saved from this screen. Use <strong>Cases</strong> and <strong>Property workspace</strong> for enforcement
          matters in the meantime.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/cases">Go to cases</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
