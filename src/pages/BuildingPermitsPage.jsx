import { Link } from 'react-router-dom';
import { Hammer, FileStack, ClipboardCheck, Mail } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { DEFAULT_INSPECTION_STAGE_PRESETS } from '@/lib/inspectionChecklistPresets';

const ROADMAP_ITEMS = [
  'Base44 entities: BuildingPermit, PermitInspection, PermitDocument, FeeLineItem (town-scoped RLS).',
  'Applicant uploads on public portal → inspector queue; issued permit / denial PDF via secure function + email.',
  'Inspection scheduling and notes (mirror Investigation patterns); photo + Meridian review with adopted code edition from TownConfig.',
  'Certificate of occupancy / completion / use generation from checklist completion + fee balance display (track only, no card processing here).',
  'Closing export: single PDF packet (permit, inspections, CO, attachments metadata).',
];

export default function BuildingPermitsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Building permits & inspections"
        description="Intake, review, inspections, certificates, and fee tracking — integrated with code enforcement by property."
        helpTitle="Building module roadmap"
        helpContent={
          <div className="space-y-3 text-sm">
            <p>
              This workspace is being wired to your data layer. The list below is the implementation order; each step will reuse patterns you
              already have (documents, investigations, town config, public portal).
            </p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {ROADMAP_ITEMS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        }
        actions={
          <Button type="button" disabled variant="secondary" className="gap-2">
            <FileStack className="h-4 w-4" aria-hidden="true" />
            New permit (soon)
          </Button>
        }
      />

      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            Inspection presets
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Towns will pick which stages apply per permit type. Default library:
          </p>
          <ul className="max-h-48 overflow-y-auto text-sm text-muted-foreground">
            {DEFAULT_INSPECTION_STAGE_PRESETS.map((s) => (
              <li key={s.id} className="border-b border-border/60 py-1.5 last:border-0">
                {s.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
            Permits list
          </div>
          <p className="text-sm text-muted-foreground">
            No permit records are loaded yet. When the BuildingPermit entity is added in Base44, this page will list open and closed permits,
            link to the property workspace, and surface related code cases.
          </p>
          <p className="mt-4 text-sm">
            <Link to="/property-workspace" className="font-medium text-primary underline-offset-4 hover:underline">
              Open property workspace
            </Link>{' '}
            to review existing enforcement cases by address today.
          </p>
        </div>
      </div>

      <p className="mx-auto mt-8 flex max-w-4xl items-center gap-2 text-sm text-muted-foreground">
        <Hammer className="h-4 w-4 shrink-0" aria-hidden="true" />
        Use the workspace bar above to switch back to code enforcement without losing context.
      </p>
    </div>
  );
}
