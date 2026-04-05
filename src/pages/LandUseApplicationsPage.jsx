import { Link } from 'react-router-dom';
import { ClipboardList, Gavel, Banknote, MapPin } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';

const PHASES = [
  'Application received → completeness / fee worksheet (abutter notice costs, filing fees — calculated and tracked only).',
  'Staff review, hearings, conditions — status history through Notice of Decision (NOD).',
  'Public uploads (PDF plans, surveys) with virus scanning via your file pipeline.',
  'GIS quick link from TownConfig opens assessor or city map in a new tab (embed optional later).',
  'Property workspace shows zoning / PB files next to permits and enforcement cases.',
];

export default function LandUseApplicationsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Land use applications"
        description="Planning board, zoning board, and special exception workflows through Notice of Decision — aligned with NH practice."
        helpTitle="Land use module"
        helpContent={
          <div className="space-y-3 text-sm">
            <p>Tracks applications separately from zoning determinations (written decisions you already store), with a full application lifecycle.</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {PHASES.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        }
        actions={
          <Button type="button" disabled variant="secondary" className="gap-2">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            New application (soon)
          </Button>
        }
      />

      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Gavel className="h-4 w-4 text-primary" aria-hidden="true" />
            Application register
          </h2>
          <p className="text-sm text-muted-foreground">
            The LandUseApplication entity will populate this table with file numbers, board type, statutory deadlines, and NOD issuance date.
            Until then, use{' '}
            <Link to="/zoning-determinations" className="font-medium text-primary underline-offset-4 hover:underline">
              zoning determinations
            </Link>{' '}
            for written decisions already in the system.
          </p>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Banknote className="h-4 w-4 text-primary" aria-hidden="true" />
            Fees
          </h2>
          <p className="text-sm text-muted-foreground">
            Fee schedules are town-defined. The app records what was charged and whether it was satisfied — not payment processing.
          </p>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            Property link
          </h2>
          <p className="text-sm text-muted-foreground">
            Every application is keyed to normalized address and optional map / lot / block / PID to prevent duplicates.
          </p>
        </div>
      </div>
    </div>
  );
}
