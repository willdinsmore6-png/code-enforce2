import { useParams, Link } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';

export default function LandUseApplicationDetailPage() {
  const { id } = useParams();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Land use application"
        description={`Record ID: ${id || '—'} (placeholder)`}
        helpTitle="Application detail"
        helpContent={
          <p className="text-sm">
            Will include hearing dates, abutter notice tracking, staff reports, conditions, draft and final NOD, and cross-links to permits and
            enforcement cases on the same property.
          </p>
        }
      />
      <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        <p className="mb-4">Backend entity not connected yet.</p>
        <Link to="/land-use" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to land use applications
        </Link>
      </div>
    </div>
  );
}
