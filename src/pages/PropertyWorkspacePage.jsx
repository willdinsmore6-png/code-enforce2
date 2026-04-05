import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import ClearableInput from '@/components/shared/ClearableInput';
import { filterRecordsForProperty, normalizePropertyAddressKey, normalizeParcelKey } from '@/lib/propertyAddress';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';

/** Inlined so Base44/Git sync applies changes with the page file only. */
const CLOSED_STATUS = new Set(['resolved', 'closed']);
function isCaseConsideredOpen(c) {
  const s = String(c?.status || '').toLowerCase();
  return !CLOSED_STATUS.has(s);
}
function casePropertyAddress(c) {
  return String(c.property_address || c.data?.property_address || '').trim();
}
function caseParcelId(c) {
  return String(
    c.parcel_id || c.data?.parcel_id || c.map_parcel_id || c.data?.map_parcel_id || ''
  ).trim();
}
function sortCasesForSuggestions(a, b) {
  const ao = isCaseConsideredOpen(a) ? 0 : 1;
  const bo = isCaseConsideredOpen(b) ? 0 : 1;
  if (ao !== bo) return ao - bo;
  return String(b.created_date || '').localeCompare(String(a.created_date || ''));
}
function buildAddressSuggestionRows(cases, limit = 200) {
  const sorted = [...(cases || [])].sort(sortCasesForSuggestions);
  const byNorm = new Map();
  for (const c of sorted) {
    const label = casePropertyAddress(c);
    if (!label) continue;
    const nk = normalizePropertyAddressKey(label);
    if (!nk) continue;
    const pid = caseParcelId(c);
    const open = isCaseConsideredOpen(c);
    if (!byNorm.has(nk)) {
      byNorm.set(nk, { label, normKey: nk, parcel_id: pid || null, open });
    } else {
      const cur = byNorm.get(nk);
      if (!cur.parcel_id && pid) cur.parcel_id = pid;
      if (open) cur.open = true;
    }
  }
  return [...byNorm.values()].slice(0, limit);
}
function buildParcelSuggestionRows(cases, limit = 150) {
  const sorted = [...(cases || [])].sort(sortCasesForSuggestions);
  const byPid = new Map();
  for (const c of sorted) {
    const pid = caseParcelId(c);
    if (!pid) continue;
    const nk = normalizeParcelKey(pid);
    if (!nk) continue;
    const addr = casePropertyAddress(c);
    const open = isCaseConsideredOpen(c);
    if (!byPid.has(nk)) {
      byPid.set(nk, { label: pid, normKey: nk, addressHint: addr || null, open });
    } else {
      const cur = byPid.get(nk);
      if (!cur.addressHint && addr) cur.addressHint = addr;
      if (open) cur.open = true;
    }
  }
  return [...byPid.values()].slice(0, limit);
}
function filterAddressRows(rows, query, max = 12) {
  const q = query.trim();
  const nq = normalizePropertyAddressKey(q);
  if (!q) {
    const openRows = rows.filter((r) => r.open);
    const pool = openRows.length > 0 ? openRows : rows;
    return pool.slice(0, max);
  }
  const ql = q.toLowerCase();
  return rows
    .filter((r) => r.label.toLowerCase().includes(ql) || (nq && r.normKey.includes(nq)))
    .slice(0, max);
}
function filterParcelRows(rows, query, max = 12) {
  const q = query.trim();
  const nq = normalizeParcelKey(q);
  if (!q) {
    const openRows = rows.filter((r) => r.open);
    const pool = openRows.length > 0 ? openRows : rows;
    return pool.slice(0, max);
  }
  const ql = q.toLowerCase();
  return rows
    .filter((r) => r.label.toLowerCase().includes(ql) || (nq && r.normKey.includes(nq)))
    .slice(0, max);
}
function CasePropertySuggestList({
  cases,
  mode,
  query,
  open: panelOpen,
  onPickAddress,
  onPickParcel,
  className,
  maxItems = 12,
}) {
  const rows = useMemo(() => {
    if (mode === 'address') return buildAddressSuggestionRows(cases);
    return buildParcelSuggestionRows(cases);
  }, [cases, mode]);
  const filtered = useMemo(() => {
    if (mode === 'address') return filterAddressRows(rows, query, maxItems);
    return filterParcelRows(rows, query, maxItems);
  }, [mode, rows, query, maxItems]);
  if (!panelOpen || filtered.length === 0) return null;
  return (
    <ul
      className={cn(
        'absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md',
        className
      )}
      role="listbox"
      aria-label={mode === 'address' ? 'Address suggestions from cases' : 'Parcel ID suggestions from cases'}
    >
      {filtered.map((row) => (
        <li key={row.normKey}>
          <button
            type="button"
            role="option"
            className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
            onMouseDown={(e) => {
              e.preventDefault();
              if (mode === 'address') onPickAddress(row.label, row.parcel_id || '');
              else onPickParcel(row.label);
            }}
          >
            {mode === 'address' ? (
              <>
                <span className="font-medium leading-tight">{row.label}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {row.open && <span className="text-primary">Open case</span>}
                  {row.parcel_id && <span className="font-mono">{row.parcel_id}</span>}
                </span>
              </>
            ) : (
              <>
                <span className="font-mono text-sm font-medium leading-tight">{row.label}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {row.open && <span className="text-primary">Open case</span>}
                  {row.addressHint && <span className="line-clamp-1">{row.addressHint}</span>}
                </span>
              </>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function PropertyWorkspacePage() {
  const { municipality } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [address, setAddress] = useState('');
  const [parcelId, setParcelId] = useState('');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [addressSuggestOpen, setAddressSuggestOpen] = useState(false);
  const [parcelSuggestOpen, setParcelSuggestOpen] = useState(false);

  const townKey = municipality?.id != null ? String(municipality.id) : '';

  const syncQueryParams = useCallback(
    (addr, pid) => {
      const next = new URLSearchParams();
      const a = String(addr || '').trim();
      const p = String(pid || '').trim();
      if (a) next.set('address', a);
      if (p) next.set('parcel_id', p);
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  useEffect(() => {
    const q = searchParams.get('address') || '';
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
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Could not load cases.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [townKey]);

  const matches = useMemo(
    () => filterRecordsForProperty(cases, address, parcelId),
    [cases, address, parcelId]
  );

  const keyPreview = normalizePropertyAddressKey(address);
  const hasFilter = address.trim().length > 0 || parcelId.trim().length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Property workspace"
        description="Find enforcement cases by address or parcel ID — same normalized matching as new complaints, so duplicates are easier to spot."
        helpTitle="Property workspace"
        helpContent={
          <div className="space-y-2 text-sm">
            <p>
              Addresses are matched with a normalized key (abbreviations, punctuation). Prefer your assessor parcel ID when your records
              use it.
            </p>
            <p>
              While you type, suggestions come from this town&apos;s loaded cases (open cases first when the field is empty). Choosing an
              address can fill parcel ID when a case recorded one.
            </p>
            <p>Use this before filing a new complaint if you are unsure whether a case already exists.</p>
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
            <div className="relative space-y-2 sm:col-span-2">
              <Label htmlFor="prop-address">Property address</Label>
              <ClearableInput
                id="prop-address"
                value={address}
                onChange={(e) => {
                  const v = e.target.value;
                  setAddress(v);
                  syncQueryParams(v, parcelId);
                }}
                onFocus={() => setAddressSuggestOpen(true)}
                onBlur={() => window.setTimeout(() => setAddressSuggestOpen(false), 180)}
                placeholder="e.g. 12 Maple Street — type to match open cases"
                autoComplete="street-address"
                aria-autocomplete="list"
                aria-expanded={addressSuggestOpen}
              />
              <CasePropertySuggestList
                cases={cases}
                mode="address"
                query={address}
                open={addressSuggestOpen && cases.length > 0}
                onPickAddress={(addr, pidHint) => {
                  setAddress(addr);
                  if (pidHint) setParcelId(pidHint);
                  syncQueryParams(addr, pidHint || parcelId);
                  setAddressSuggestOpen(false);
                }}
                onPickParcel={() => {}}
              />
            </div>
            <div className="relative space-y-2">
              <Label htmlFor="prop-pid">Map / lot / block or PID (optional)</Label>
              <Input
                id="prop-pid"
                value={parcelId}
                onChange={(e) => {
                  const v = e.target.value;
                  setParcelId(v);
                  syncQueryParams(address, v);
                }}
                onFocus={() => setParcelSuggestOpen(true)}
                onBlur={() => window.setTimeout(() => setParcelSuggestOpen(false), 180)}
                placeholder="Town parcel identifier — suggestions from cases"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={parcelSuggestOpen}
              />
              <CasePropertySuggestList
                cases={cases}
                mode="parcel"
                query={parcelId}
                open={parcelSuggestOpen && cases.length > 0}
                onPickAddress={() => {}}
                onPickParcel={(pid) => {
                  setParcelId(pid);
                  syncQueryParams(address, pid);
                  setParcelSuggestOpen(false);
                }}
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
          ) : matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching cases in the loaded set.</p>
          ) : (
            <ul className="divide-y divide-border">
              {matches.map((c) => (
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

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Optional GIS link and adopted code summary: Admin → Municipality.
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