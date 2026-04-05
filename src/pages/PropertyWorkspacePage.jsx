import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, FileText, Hammer, ClipboardList, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import ClearableInput from '@/components/shared/ClearableInput';
import { filterRecordsForProperty, normalizePropertyAddressKey } from '@/lib/propertyAddress';
import StatusBadge from '@/components/shared/StatusBadge';

export default function PropertyWorkspacePage() {
  const { municipality } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [address, setAddress] = useState('');
  const [parcelId, setParcelId] = useState('');
  const [cases, setCases] = useState([]);
  const [permits, setPermits] = useState([]);
  const [landApps, setLandApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const townKey = municipality?.id != null ? String(municipality.id) : '';

  useEffect(() => {
    const q = searchParams.get('address') || searchParams.get('parcel') || '';
    if (q && !address) setAddress(q);
    const p = searchParams.get('parcel_id') || searchParams.get('pid') || '';
    if (p && !parcelId) setParcelId(p);
  }, [searchParams, address, parcelId]);

  useEffect(() => {
    if (!townKey) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [byRoot, byData] = await Promise.all([
          base44.entities.Case.filter({ town_id: townKey }, '-created_date', 400).catch(() => []),
          base44.entities.Case.filter({ 'data.town_id': townKey }, '-created_date', 400).catch(() => []),
        ]);
        const map = new Map();
        for (const c of [...(byRoot || []), ...(byData || [])]) {
          if (c?.id) map.set(c.id, c);
        }
        if (!cancelled) setCases([...map.values()]);

        try {
          const pRows =
            (await base44.entities.BuildingPermit.filter({ town_id: townKey }, '-created_date', 300).catch(() => [])) || [];
          if (!cancelled) setPermits(pRows);
        } catch {
          if (!cancelled) setPermits([]);
        }

        try {
          const lRows =
            (await base44.entities.LandUseApplication.filter({ town_id: townKey }, '-created_date', 300).catch(() => [])) || [];
          if (!cancelled) setLandApps(lRows);
        } catch {
          if (!cancelled) setLandApps([]);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Could not load property data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [townKey]);

  const caseMatches = useMemo(
    () => filterRecordsForProperty(cases, address, parcelId),
    [cases, address, parcelId]
  );
  const permitMatches = useMemo(
    () => filterRecordsForProperty(permits, address, parcelId),
    [permits, address, parcelId]
  );
  const landMatches = useMemo(
    () => filterRecordsForProperty(landApps, address, parcelId),
    [landApps, address, parcelId]
  );

  const keyPreview = normalizePropertyAddressKey(address);
  const hasFilter = address.trim().length > 0 || parcelId.trim().length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Property workspace"
        description="Enforcement cases, building permits, and land use applications for the same address or parcel — jump into each module without retyping."
        helpTitle="Property workspace"
        helpContent={
          <div className="space-y-2 text-sm">
            <p>
              Addresses are matched with a normalized key (abbreviations, punctuation). Prefer assessor parcel ID when your records use it.
            </p>
            <p>Data loads for your municipality; filter by typing an address or PID.</p>
          </div>
        }
      />

      <div className="mx-auto max-w-3xl space-y-6">
        <form
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
          onSubmit={(e) => e.preventDefault()}
          aria-label="Property search"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="prop-address">Property address</Label>
              <ClearableInput
                id="prop-address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  const v = e.target.value.trim();
                  if (v) setSearchParams({ address: v }, { replace: true });
                  else setSearchParams({}, { replace: true });
                }}
                placeholder="e.g. 12 Maple Street"
                autoComplete="street-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-pid">Map / lot / block or PID (optional)</Label>
              <Input
                id="prop-pid"
                value={parcelId}
                onChange={(e) => setParcelId(e.target.value)}
                placeholder="Town parcel identifier"
                autoComplete="off"
              />
            </div>
          </div>
          {keyPreview && (
            <p className="mt-3 text-xs text-muted-foreground">
              Normalized match key: <span className="font-mono text-foreground">{keyPreview}</span>
            </p>
          )}
        </form>

        {loadError && (
          <div
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {loadError}
          </div>
        )}

        <section aria-labelledby="ce-cases-heading" className="rounded-xl border border-border bg-card p-5">
          <h2 id="ce-cases-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            Code enforcement cases
            {loading && <span className="text-sm font-normal text-muted-foreground">(loading…)</span>}
          </h2>
          {!hasFilter ? (
            <p className="text-sm text-muted-foreground">Enter an address or parcel ID to filter your town&apos;s cases.</p>
          ) : caseMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching cases in the loaded set.</p>
          ) : (
            <ul className="divide-y divide-border">
              {caseMatches.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{c.property_address || '—'}</p>
                    <p className="text-sm text-muted-foreground">
                      Case {c.case_number || c.id?.slice(0, 8)}
                      {c.violation_type ? ` · ${c.violation_type}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.status && <StatusBadge status={c.status} />}
                    <Button asChild variant="outline" size="sm" className="min-h-[40px]">
                      <Link to={`/cases/${c.id}`}>Open case</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="bp-heading" className="rounded-xl border border-border bg-card p-5">
          <h2 id="bp-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Hammer className="h-5 w-5 text-primary" aria-hidden="true" />
            Building permits
          </h2>
          {!permits.length ? (
            <p className="text-sm text-muted-foreground">
              No permits loaded — add the <strong>BuildingPermit</strong> entity in Base44 or create permits from the permits module.
            </p>
          ) : !hasFilter ? (
            <p className="text-sm text-muted-foreground">Enter an address or parcel to filter permits ({permits.length} on file).</p>
          ) : permitMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permits match this property in the loaded set.</p>
          ) : (
            <ul className="divide-y divide-border">
              {permitMatches.map((p) => (
                <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium font-mono text-sm">{p.file_number}</p>
                    <p className="text-sm text-muted-foreground">{p.property_address}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {p.status && <StatusBadge status={p.status} />}
                    <Button asChild variant="outline" size="sm" className="min-h-[40px]">
                      <Link to={`/permits/${p.id}`}>Open permit</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="link" className="mt-3 h-auto min-h-[44px] px-0">
            <Link to="/permits">All permits</Link>
          </Button>
        </section>

        <section aria-labelledby="lu-heading" className="rounded-xl border border-border bg-card p-5">
          <h2 id="lu-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
            Land use applications
          </h2>
          {!landApps.length ? (
            <p className="text-sm text-muted-foreground">
              No applications loaded — add the <strong>LandUseApplication</strong> entity in Base44 or create files from the land use module.
            </p>
          ) : !hasFilter ? (
            <p className="text-sm text-muted-foreground">Enter an address or parcel to filter applications ({landApps.length} on file).</p>
          ) : landMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications match this property in the loaded set.</p>
          ) : (
            <ul className="divide-y divide-border">
              {landMatches.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium font-mono text-sm">{a.file_number}</p>
                    <p className="text-sm text-muted-foreground">{a.property_address}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.status && <StatusBadge status={a.status} />}
                    <Button asChild variant="outline" size="sm" className="min-h-[40px]">
                      <Link to={`/land-use/${a.id}`}>Open application</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="link" className="mt-3 h-auto min-h-[44px] px-0">
            <Link to="/land-use">All land use applications</Link>
          </Button>
        </section>

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            GIS and adopted codes: Admin → Municipality.
          </p>
          {municipality?.gis_map_url && /^https?:\/\//i.test(String(municipality.gis_map_url).trim()) && (
            <a
              href={String(municipality.gis_map_url).trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] shrink-0 rounded-md font-medium text-primary underline-offset-4 hover:underline"
            >
              Open municipality GIS / parcel map (new tab)
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
