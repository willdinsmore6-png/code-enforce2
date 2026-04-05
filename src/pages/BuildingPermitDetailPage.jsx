import { useParams, Link } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';

export default function BuildingPermitDetailPage() {
  const { id } = useParams();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Permit detail"
        description={`Record ID: ${id || '—'} (placeholder)`}
        helpTitle="Permit detail"
        helpContent={
          <p className="text-sm">
            This route will show application data, attachments, inspection timeline, fee worksheet, issued documents, and cross-links to open
            code cases and land-use files for the same parcel.
          </p>
        }
      />
      <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        <p className="mb-4">Backend entity not connected yet.</p>
        <Link to="/permits" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to permits
        </Link>
      </div>
    </div>
  );
}
