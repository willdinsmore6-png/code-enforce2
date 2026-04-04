import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

/** Inlined so this file works when Base44 only syncs a single `exportCaseCourtFile.ts` (no `shared/`). */
type BodyWithActing = { acting_town_id?: string };

function checkActingTownAccess(
  user: { role?: string },
  body: BodyWithActing,
  resourceTownId: string | null | undefined
): Response | null {
  if (user.role !== 'superadmin') return null;
  const acting = typeof body.acting_town_id === 'string' ? body.acting_town_id.trim() : '';
  if (!acting) return null;
  if (!resourceTownId || resourceTownId !== acting) {
    return Response.json(
      { error: 'Forbidden: not allowed outside the active municipality context' },
      { status: 403 }
    );
  }
  return null;
}

export type CourtFileExportOptions = {
  packetVariant: string;
  documentTitlePrefix: string;
  exportRoute: string;
  /** Appended before .pdf, e.g. '-v2' → case-12-v2-court-file.pdf */
  pdfFilenameExtra?: string;
};

function arrayBufferToBase64(buffer) {
  const uint8Array = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Base44 entity filter often needs sort + limit in Deno/service role; single-arg filter can return []. */
const CASE_CHILD_SORT = '-created_date';
const CASE_CHILD_LIMIT = 500;
const LIST_FALLBACK_LIMIT = 5000;

/** Match child rows to a case (snake_case + camelCase + populated ref). */
function normalizeCaseId(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
  if (typeof v === 'object' && v !== null && 'id' in v) {
    return String((v as { id: unknown }).id ?? '').trim();
  }
  return String(v).trim();
}

function rowCaseId(r: Record<string, unknown>): string {
  const data = r?.data as Record<string, unknown> | undefined;
  const fromData = data && (data.case_id ?? data.caseId);
  if (fromData != null) return normalizeCaseId(fromData);
  const direct = r?.case_id ?? r?.caseId;
  if (direct != null) return normalizeCaseId(direct);
  const rel = r?.case;
  if (typeof rel === 'string' || typeof rel === 'number') return normalizeCaseId(rel);
  if (rel && typeof rel === 'object' && rel !== null && 'id' in rel) {
    return normalizeCaseId((rel as { id: unknown }).id);
  }
  return '';
}

function caseIdsEquivalent(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.toLowerCase() === b.toLowerCase();
}

function sniffImageFormat(buffer: ArrayBuffer): 'JPEG' | 'PNG' | null {
  const u = new Uint8Array(buffer.slice(0, 12));
  if (u.length >= 3 && u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return 'JPEG';
  if (u.length >= 4 && u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return 'PNG';
  return null;
}

type EntityClient = {
  filter: (...args: unknown[]) => Promise<unknown[] | null | undefined>;
  list?: (...args: unknown[]) => Promise<unknown[] | null | undefined>;
  get?: (id: string) => Promise<unknown>;
};

/**
 * Load child rows from one entity client.
 * `singleArgFilterFirst`: when true, matches CaseDetail.jsx (browser) — filter({ case_id }) only first.
 */
async function loadCaseChildrenFromClient<T extends { case_id?: unknown; caseId?: unknown }>(
  entityClient: EntityClient | undefined,
  entityLabel: string,
  canonicalCaseId: string,
  alternateCaseId: string,
  townId: string | undefined,
  singleArgFilterFirst: boolean
): Promise<T[]> {
  if (!entityClient?.filter) {
    return [];
  }

  const idMatches = (r: T) => {
    const rk = rowCaseId(r);
    return rk.length > 0 && (rk === canonicalCaseId || (!!alternateCaseId && rk === alternateCaseId));
  };

  const tryFilterByCaseId = async (cid: string): Promise<T[]> => {
    if (!cid) return [];
    try {
      if (singleArgFilterFirst) {
        let rows = (await entityClient.filter({ case_id: cid })) as T[] || [];
        if (rows.length > 0) return rows;
        rows =
          (await entityClient.filter({ case_id: cid }, CASE_CHILD_SORT, CASE_CHILD_LIMIT)) as T[] ||
          [];
        return rows || [];
      }
      let rows =
        (await entityClient.filter({ case_id: cid }, CASE_CHILD_SORT, CASE_CHILD_LIMIT)) as T[] ||
        [];
      if (rows.length > 0) return rows;
      rows = (await entityClient.filter({ case_id: cid })) as T[] || [];
      return rows || [];
    } catch (e) {
      console.error(`${entityLabel} filter case_id=${cid}:`, e?.message);
      return [];
    }
  };

  let rows: T[] = [];
  rows = await tryFilterByCaseId(canonicalCaseId);
  if (rows.length === 0 && alternateCaseId && alternateCaseId !== canonicalCaseId) {
    rows = await tryFilterByCaseId(alternateCaseId);
  }

  if (rows.length === 0 && townId) {
    try {
      const wide =
        (await entityClient.filter(
          { town_id: townId },
          CASE_CHILD_SORT,
          CASE_CHILD_LIMIT
        )) as T[] || [];
      rows = (wide || []).filter(idMatches);
    } catch (e) {
      console.error(`${entityLabel} town fallback failed:`, e?.message);
    }
  }

  if (rows.length === 0 && typeof entityClient.list === 'function') {
    try {
      const listed = (await entityClient.list(CASE_CHILD_SORT, LIST_FALLBACK_LIMIT)) as T[] || [];
      rows = (listed || []).filter(idMatches);
    } catch (e) {
      console.error(`${entityLabel} list fallback failed:`, e?.message);
    }
  }

  return rows;
}

/** Browser uses base44.entities.*; Deno service role often returns [] for the same filter — try user client first. */
async function loadCaseChildren<T extends { case_id?: unknown; caseId?: unknown }>(
  userClient: EntityClient | undefined,
  serviceClient: EntityClient | undefined,
  entityLabel: string,
  canonicalCaseId: string,
  alternateCaseId: string,
  townId: string | undefined
): Promise<T[]> {
  if (!userClient?.filter && !serviceClient?.filter) {
    console.error(`courtFileExport: no entity client for ${entityLabel}`);
    return [];
  }

  if (userClient?.filter) {
    const fromUser = await loadCaseChildrenFromClient<T>(
      userClient,
      `${entityLabel}[user]`,
      canonicalCaseId,
      alternateCaseId,
      townId,
      true
    );
    if (fromUser.length > 0) return fromUser;
  }

  if (serviceClient?.filter) {
    return await loadCaseChildrenFromClient<T>(
      serviceClient,
      `${entityLabel}[service]`,
      canonicalCaseId,
      alternateCaseId,
      townId,
      false
    );
  }

  return [];
}

/**
 * Hydrate investigations by id (from Case Detail). get() sometimes omits or reshapes case_id;
 * use compound filter first, then loose case/town checks.
 */
async function hydrateInvestigationsByIds(
  userEnt: { Investigation?: EntityClient },
  srEnt: { Investigation?: EntityClient },
  rawIds: unknown,
  canonicalCaseId: string,
  requestCaseId: string,
  townId: string | undefined
): Promise<Record<string, unknown>[]> {
  if (!Array.isArray(rawIds) || rawIds.length === 0) return [];
  const ids = [...new Set(rawIds.map((x) => String(x).trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  const invSr = srEnt.Investigation;
  const invUser = userEnt.Investigation;
  const out: Record<string, unknown>[] = [];

  const caseCandidates = [...new Set([canonicalCaseId, requestCaseId].filter(Boolean))];

  for (const iid of ids) {
    let row: Record<string, unknown> | null = null;

    if (invSr?.filter) {
      for (const cid of caseCandidates) {
        try {
          const f = (await invSr.filter(
            { id: iid, case_id: cid },
            CASE_CHILD_SORT,
            10
          )) as Record<string, unknown>[] | null;
          if (f?.[0]) {
            row = f[0];
            break;
          }
        } catch {
          /* */
        }
      }
    }

    if (!row && invSr?.get) {
      try {
        const g = await invSr.get(iid);
        if (g && typeof g === 'object') row = g as Record<string, unknown>;
      } catch {
        /* */
      }
    }
    if (!row && invUser?.get) {
      try {
        const g = await invUser.get(iid);
        if (g && typeof g === 'object') row = g as Record<string, unknown>;
      } catch {
        /* */
      }
    }
    if (!row && invSr?.filter) {
      try {
        const f = (await invSr.filter({ id: iid }, CASE_CHILD_SORT, 5)) as Record<string, unknown>[] | null;
        row = f?.[0] ?? null;
      } catch {
        /* */
      }
    }
    if (!row) continue;

    const k = rowCaseId(row);
    const caseOk =
      caseIdsEquivalent(k, canonicalCaseId) ||
      (!!requestCaseId && caseIdsEquivalent(k, requestCaseId));

    const rowTown = String((row as { town_id?: unknown }).town_id ?? '').trim();
    const townOk = !!townId && rowTown === townId;

    if (caseOk) {
      out.push(row);
    } else if (townOk) {
      // IDs came from this case’s screen; include if tenant matches when case_id compare failed (API shape quirks)
      out.push(row);
    }
  }

  return out;
}

function auditNoteBody(log: { changes?: unknown }): string {
  const c = log?.changes;
  if (c == null) return '';

  if (typeof c === 'object' && c !== null && 'note' in c) {
    return String((c as { note?: unknown }).note ?? '');
  }

  if (typeof c === 'string') {
    const s = c.trim();
    if (s.startsWith('{') && s.includes('"note"')) {
      try {
        const p = JSON.parse(s) as { note?: unknown };
        if (p != null && typeof p === 'object' && 'note' in p) {
          return String(p.note ?? '');
        }
      } catch {
        /* fall through */
      }
    }
    try {
      const p = JSON.parse(s) as { note?: unknown };
      if (p != null && typeof p === 'object' && 'note' in p) {
        return String(p.note ?? '');
      }
    } catch {
      /* not JSON */
    }
    return s;
  }

  return String(c);
}

function collectPhotoUrls(inv: { photos?: unknown }): string[] {
  const raw = inv?.photos;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      if (typeof p === 'string') return p;
      if (p && typeof p === 'object') {
        const o = p as Record<string, string>;
        return o.file_url || o.url || o.href || '';
      }
      return '';
    })
    .filter(Boolean);
}

function attachmentFileName(url: string): string {
  try {
    const path = new URL(url).pathname;
    const seg = path.split('/').pop() || url;
    return decodeURIComponent(seg);
  } catch {
    return url.slice(-80);
  }
}

function isLikelyPdfUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

/** Decode bytes as embeddable image for jsPDF (not PDFs — those are listed as links only). */
function bufferToImagePayload(buffer: ArrayBuffer, contentTypeHeader: string | null): { data: string; format: string } | null {
  const ct = (contentTypeHeader || '').toLowerCase();
  if (ct.includes('pdf')) return null;
  if (ct.startsWith('image/')) {
    const base64 = arrayBufferToBase64(buffer);
    return { data: base64, format: ct.includes('png') ? 'PNG' : 'JPEG' };
  }
  const fmt = sniffImageFormat(buffer);
  if (fmt) {
    return { data: arrayBufferToBase64(buffer), format: fmt };
  }
  return null;
}

async function fetchImageAsBase64(url: string, base44: any) {
  if (!url) return null;

  const tryFetchUrl = async (fetchUrl: string) => {
    const response = await fetch(fetchUrl, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return bufferToImagePayload(buffer, response.headers.get('content-type'));
  };

  const trySignedThenFetch = async () => {
    if (!base44?.asServiceRole?.integrations?.Core?.CreateFileSignedUrl) return null;
    try {
      const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: url,
        expires_in: 300,
      });
      if (signed_url) return await tryFetchUrl(signed_url);
    } catch (e) {
      console.error(`Signed URL failed for attachment: ${url}`, e?.message);
    }
    return null;
  };

  try {
    // App file URLs often need a signed URL when fetched from Deno (even "public" paths).
    const preferSignedFirst = /base44\.app\//i.test(url);
    if (preferSignedFirst) {
      const fromSigned = await trySignedThenFetch();
      if (fromSigned) return fromSigned;
    }

    let result = await tryFetchUrl(url);
    if (result) return result;

    if (!preferSignedFirst) {
      result = await trySignedThenFetch();
      if (result) return result;
    }
  } catch (err) {
    console.error(`Attachment fetch failed: ${url}`, err?.message);
  }
  return null;
}

type TownBranding = {
  name: string;
  state: string;
  tagline: string;
  logo: { data: string; format: string } | null;
};

/** Load TownConfig for PDF cover and running headers (logo via same fetch path as investigation photos). */
async function loadTownBranding(
  base44: any,
  townId: string | undefined,
  isSuperadmin: boolean
): Promise<TownBranding> {
  const fallback = (): TownBranding => ({
    name: 'Municipal Code Enforcement',
    state: '',
    tagline: '',
    logo: null,
  });
  if (!townId) return fallback();

  let row: Record<string, unknown> | null = null;
  const tcUser = base44.entities?.TownConfig;
  const tcSr = base44.asServiceRole?.entities?.TownConfig;

  if (tcUser?.get) {
    try {
      row = (await tcUser.get(townId)) as Record<string, unknown>;
    } catch {
      row = null;
    }
  }
  if (!row && tcSr?.get) {
    try {
      row = (await tcSr.get(townId)) as Record<string, unknown>;
    } catch {
      row = null;
    }
  }
  if (!row && tcSr?.filter) {
    try {
      const f = (await tcSr.filter({ id: townId }, '-created_date', 5)) as Record<string, unknown>[] | null;
      row = f?.[0] ?? null;
    } catch {
      row = null;
    }
  }
  if (!row && isSuperadmin && tcUser?.filter) {
    try {
      const f = (await tcUser.filter({ id: townId }, '-created_date', 5)) as Record<string, unknown>[] | null;
      row = f?.[0] ?? null;
    } catch {
      row = null;
    }
  }

  if (!row) return fallback();

  const name = String(row.town_name || row.short_name || 'Municipal Code Enforcement').trim();
  const state = String(row.state || '').trim();
  const tagline = String(row.tagline || '').trim();
  const logoUrl = String(row.logo_url || '').trim();
  let logo: { data: string; format: string } | null = null;
  if (logoUrl) {
    logo = await fetchImageAsBase64(logoUrl, base44);
  }

  return { name: name || 'Municipal Code Enforcement', state, tagline, logo };
}

export async function handleCourtFileExport(
  req: Request,
  o: CourtFileExportOptions
): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json() as {
      case_id?: string;
      acting_town_id?: string;
      investigation_ids?: unknown;
    };
    const { case_id } = body;
    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    // Resolve case the same way as before multi-tenant: user-scoped Case.get() first (reliable id).
    // Service-role-only load was returning records where child filters stopped matching.
    let caseRecord: Record<string, unknown> | null = null;
    try {
      caseRecord = (await base44.entities.Case.get(case_id)) as Record<string, unknown>;
    } catch {
      caseRecord = null;
    }
    if (!caseRecord) {
      if (user.role === 'superadmin') {
        caseRecord =
          ((await base44.asServiceRole.entities.Case.filter(
            { id: case_id },
            '-created_date',
            5
          ))?.[0] as Record<string, unknown>) ?? null;
        if (!caseRecord) {
          try {
            caseRecord = (await base44.asServiceRole.entities.Case.get(
              case_id
            )) as Record<string, unknown>;
          } catch {
            caseRecord = null;
          }
        }
      } else {
        const scoped = await base44.entities.Case.filter({ id: case_id });
        caseRecord = (scoped?.[0] as Record<string, unknown>) ?? null;
      }
    }
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const actingDenied = checkActingTownAccess(user, body, caseRecord.town_id as string | undefined);
    if (actingDenied) return actingDenied;

    const rawId = caseRecord.id ?? caseRecord._id;
    const canonicalCaseId = String(rawId != null && rawId !== '' ? rawId : case_id).trim();
    const requestCaseId = String(body.case_id || '').trim();
    const townId = caseRecord.town_id ? String(caseRecord.town_id).trim() : undefined;

    const userEnt = base44.entities;
    const srEnt = base44.asServiceRole.entities;

    const [
      notices,
      documents,
      courtActions,
      deadlines,
      auditLogs,
      violations,
      investigationsFromLoad,
    ] = await Promise.all([
      loadCaseChildren(userEnt.Notice, srEnt.Notice, 'Notice', canonicalCaseId, requestCaseId, townId),
      loadCaseChildren(userEnt.Document, srEnt.Document, 'Document', canonicalCaseId, requestCaseId, townId),
      loadCaseChildren(userEnt.CourtAction, srEnt.CourtAction, 'CourtAction', canonicalCaseId, requestCaseId, townId),
      loadCaseChildren(userEnt.Deadline, srEnt.Deadline, 'Deadline', canonicalCaseId, requestCaseId, townId),
      loadCaseChildren(userEnt.AuditLog, srEnt.AuditLog, 'AuditLog', canonicalCaseId, requestCaseId, townId),
      loadCaseChildren(userEnt.Violation, srEnt.Violation, 'Violation', canonicalCaseId, requestCaseId, townId),
      loadCaseChildren(
        userEnt.Investigation,
        srEnt.Investigation,
        'Investigation',
        canonicalCaseId,
        requestCaseId,
        townId
      ),
    ]);

    let investigations = investigationsFromLoad || [];
    if (!investigations.length && srEnt.Investigation?.list) {
      try {
        const all =
          (await srEnt.Investigation.list('-created_date', 10000)) as
            | { case_id?: unknown; caseId?: unknown }[]
            | null
            | undefined;
        const pool = all || [];
        investigations = pool.filter((inv) => {
          const k = rowCaseId(inv);
          if (!k) return false;
          if (k === canonicalCaseId) return true;
          if (requestCaseId && k === requestCaseId) return true;
          return false;
        });
      } catch (e) {
        console.error('Investigation.list full scan fallback failed:', e?.message);
      }
    }

    const clientInvIds = body.investigation_ids;
    if (Array.isArray(clientInvIds) && clientInvIds.length > 0) {
      const hydrated = await hydrateInvestigationsByIds(
        userEnt,
        srEnt,
        clientInvIds,
        canonicalCaseId,
        requestCaseId,
        townId
      );
      if (hydrated.length > 0) {
        const map = new Map<string, Record<string, unknown>>();
        for (const inv of investigations || []) {
          const iid = inv?.id != null ? String(inv.id) : '';
          if (iid) map.set(iid, inv as Record<string, unknown>);
        }
        for (const inv of hydrated) {
          const iid = inv?.id != null ? String(inv.id) : '';
          if (iid) map.set(iid, inv);
        }
        investigations = [...map.values()];
      }
    }

    const allPhotoUrls = (investigations || []).flatMap((inv) => collectPhotoUrls(inv));
    const photoResults = await Promise.allSettled(
      allPhotoUrls.map(url => fetchImageAsBase64(url, base44))
    );
    const photoCache = {};
    allPhotoUrls.forEach((url, i) => {
      if (photoResults[i].status === 'fulfilled' && photoResults[i].value) {
        photoCache[url] = photoResults[i].value;
      }
    });

    const branding = await loadTownBranding(base44, townId, user.role === 'superadmin');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 18;
    const cw = pw - margin * 2;
    let y = margin;

    function checkPageBreak(needed = 10) {
      if (y + needed > ph - margin) {
        doc.addPage();
        y = margin;
        addPageHeader();
      }
    }

    function addPageHeader() {
      const logoBox = 6.5;
      let textStartX = margin;
      if (branding.logo) {
        try {
          doc.addImage(branding.logo.data, branding.logo.format, margin, margin - 12, logoBox, logoBox);
          textStartX = margin + logoBox + 2.5;
        } catch {
          /* optional */
        }
      }
      const townLine = [branding.name, branding.state].filter(Boolean).join(', ');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(75);
      const townMaxW = pw - textStartX - margin - 18;
      const townShown = doc.splitTextToSize(townLine, townMaxW)[0] || townLine;
      doc.text(townShown, textStartX, margin - 7);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(120);
      doc.text(`Page ${doc.internal.pages.length - 1}`, pw - margin, margin - 7, { align: 'right' });
      doc.text(`Case ${caseRecord.case_number || case_id} · Confidential`, textStartX, margin - 3);
      doc.setDrawColor(180);
      doc.line(margin, margin - 1, pw - margin, margin - 1);
      doc.setTextColor(0);
    }

    function sectionTitle(title) {
      checkPageBreak(14);
      doc.setFillColor(30, 64, 175);
      doc.roundedRect(margin, y, cw, 8, 1, 1, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 3, y + 5.5);
      doc.setTextColor(0);
      y += 11;
    }

    function subsectionTitle(title) {
      checkPageBreak(10);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 64, 175);
      doc.text(title, margin, y + 4);
      doc.setDrawColor(30, 64, 175);
      doc.line(margin, y + 5.5, pw - margin, y + 5.5);
      doc.setTextColor(0);
      y += 8;
    }

    function fieldRow(label, value, labelWidth = 55) {
      const text = String(value || '—');
      const lines = doc.splitTextToSize(text, cw - labelWidth - 2);
      const rowH = Math.max(6, lines.length * 4.5);
      checkPageBreak(rowH);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(80);
      doc.text(label + ':', margin, y + 4);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(lines, margin + labelWidth, y + 4);
      y += rowH;
    }

    function twoColField(label1, val1, label2, val2) {
      const half = cw / 2 - 5;
      checkPageBreak(6);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(80);
      doc.text(label1 + ':', margin, y + 4);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(String(val1 || '—'), margin + 40, y + 4);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(80);
      doc.text(label2 + ':', margin + half + 5, y + 4);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(String(val2 || '—'), margin + half + 45, y + 4);
      y += 5.5;
    }

    function bodyText(text) {
      if (!text) return;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(String(text), cw);
      lines.forEach(line => {
        checkPageBreak(5);
        doc.text(line, margin, y + 4);
        y += 4.5;
      });
    }

    function dateStr(d) {
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
      catch { return String(d); }
    }

    // COVER PAGE — municipality name, optional seal/logo, case file title
    const bannerH = 58;
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pw, bannerH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');

    if (branding.logo) {
      const logoW = 28;
      const logoH = 24;
      try {
        doc.addImage(branding.logo.data, branding.logo.format, margin, 10, logoW, logoH);
      } catch (e) {
        console.error('Cover logo embed failed:', e instanceof Error ? e.message : e);
      }
      const tx = margin + logoW + 8;
      const textW = pw - tx - margin;
      doc.setFontSize(16);
      const titleLines = doc.splitTextToSize(branding.name, textW);
      let ty = 18;
      titleLines.forEach((line: string) => {
        doc.text(line, tx, ty);
        ty += 7;
      });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Code Enforcement — Case File', tx, ty + 2);
      if (branding.state) {
        doc.setFontSize(9);
        doc.setTextColor(220, 228, 255);
        doc.text(branding.state, tx, ty + 10);
      }
      if (branding.tagline) {
        doc.setFontSize(8);
        doc.setTextColor(210, 218, 255);
        const tagLines = doc.splitTextToSize(branding.tagline.slice(0, 200), textW);
        let tgy = ty + (branding.state ? 16 : 12);
        tagLines.slice(0, 2).forEach((line: string) => {
          doc.text(line, tx, tgy);
          tgy += 4;
        });
      }
    } else {
      doc.setFontSize(20);
      doc.text(branding.name, pw / 2, 22, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Code Enforcement — Case File', pw / 2, 33, { align: 'center' });
      if (branding.state) {
        doc.setFontSize(9);
        doc.setTextColor(220, 228, 255);
        doc.text(branding.state, pw / 2, 41, { align: 'center' });
      }
      if (branding.tagline) {
        doc.setFontSize(8);
        doc.setTextColor(210, 218, 255);
        doc.text(branding.tagline.slice(0, 96), pw / 2, 48, { align: 'center' });
      }
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(caseRecord.case_number || `Case #${case_id}`, pw / 2, bannerH - 8, { align: 'center' });

    doc.setTextColor(0);
    y = bannerH + 14;
    doc.setFontSize(11);
    doc.text('PROPERTY SUBJECT TO ENFORCEMENT', pw / 2, y, { align: 'center' });
    y += 8;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(caseRecord.property_address || '—', pw / 2, y, { align: 'center' });
    y += 8;
    doc.text(`Owner: ${caseRecord.property_owner_name || '—'}`, pw / 2, y, { align: 'center' });
    y += 20;
    doc.setDrawColor(200);
    doc.line(margin + 20, y, pw - margin - 20, y);
    y += 8;

    const coverFields = [
      ['Case Status', (caseRecord.status || '').toUpperCase()],
      ['Violation Type', (caseRecord.violation_type || '').replace(/_/g, ' ')],
      ['Compliance Path', (caseRecord.compliance_path || 'none').replace(/_/g, ' ')],
      ['Priority', (caseRecord.priority || 'medium').toUpperCase()],
      ['Complaint Date', dateStr(caseRecord.complaint_date)],
      ['Assigned Officer', caseRecord.assigned_officer || '—'],
    ];
    doc.setFontSize(9.5);
    coverFields.forEach(([label, val]) => {
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(80);
      doc.text(label + ':', pw / 2 - 50, y);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(String(val), pw / 2 + 5, y);
      y += 7;
    });

    // SECTION 1: SUMMARY
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle('1. CASE SUMMARY');
    twoColField('Case Number', caseRecord.case_number, 'Status', (caseRecord.status || '').replace(/_/g, ' '));
    twoColField('Complaint Date', dateStr(caseRecord.complaint_date), 'Priority', caseRecord.priority);
    twoColField('Violation Type', (caseRecord.violation_type || '').replace(/_/g, ' '), 'First Offense', caseRecord.is_first_offense ? 'Yes' : 'No');
    twoColField('Compliance Path', (caseRecord.compliance_path || 'none').replace(/_/g, ' '), 'Daily Penalty', `$${caseRecord.daily_penalty_rate || 275}/day`);
    twoColField('Assigned Officer', caseRecord.assigned_officer || '—', 'Abatement Date', dateStr(caseRecord.abatement_deadline));
    
    y += 3;
    subsectionTitle('Property Information');
    fieldRow('Address', caseRecord.property_address);
    fieldRow('Parcel ID', caseRecord.parcel_id);
    fieldRow('Owner', caseRecord.property_owner_name);
    
    y += 3;
    subsectionTitle('Violation Description');
    fieldRow('Code Cited', caseRecord.specific_code_violated);
    bodyText(caseRecord.violation_description);

    // SECTION 2: NOTICES (data was always fetched; previously never written to the PDF)
    const noticeCount = (notices || []).length;
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle(`2. NOTICES (${noticeCount})`);
    if (noticeCount === 0) {
      bodyText('No notices recorded for this case.');
    } else {
      const sortedNotices = [...notices].sort((a, b) =>
        new Date(b.date_issued || 0).getTime() - new Date(a.date_issued || 0).getTime());
      for (const [idx, n] of sortedNotices.entries()) {
        checkPageBreak(28);
        subsectionTitle(`Notice ${idx + 1} — ${dateStr(n.date_issued)}`);
        twoColField('Type', String(n.notice_type || '').replace(/_/g, ' '), 'Delivery', String(n.delivery_method || '').replace(/_/g, ' '));
        fieldRow('Tracking #', n.tracking_number);
        fieldRow('RSA / Ordinance', `${n.rsa_cited || '—'} / ${n.ordinance_cited || '—'}`);
        if (n.notice_content) {
          bodyText(n.notice_content);
        }
        y += 6;
      }
    }

    // SECTION 3: DOCUMENTS
    const docListCount = (documents || []).length;
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle(`3. DOCUMENTS & UPLOADS (${docListCount})`);
    if (docListCount === 0) {
      bodyText('No case documents on file.');
    } else {
      for (const [idx, d] of documents.entries()) {
        checkPageBreak(18);
        subsectionTitle(`${idx + 1}. ${d.title || 'Untitled'}`);
        twoColField('Type', String(d.document_type || '').replace(/_/g, ' '), 'Version', String(d.version ?? 1));
        if (d.file_url) fieldRow('Stored file', String(d.file_url).slice(0, 200) + (String(d.file_url).length > 200 ? '…' : ''));
        if (d.description) bodyText(d.description);
        y += 4;
      }
    }

    // SECTION 4: COURT ACTIONS
    const caCount = (courtActions || []).length;
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle(`4. COURT ACTIONS (${caCount})`);
    if (caCount === 0) {
      bodyText('No court actions recorded.');
    } else {
      const sortedCa = [...courtActions].sort((a, b) =>
        new Date(b.filing_date || 0).getTime() - new Date(a.filing_date || 0).getTime());
      for (const [idx, ca] of sortedCa.entries()) {
        checkPageBreak(26);
        subsectionTitle(`Court action ${idx + 1} — ${dateStr(ca.filing_date)}`);
        twoColField('Type', String(ca.action_type || '').replace(/_/g, ' '), 'Court', String(ca.court_type || '').replace(/_/g, ' '));
        fieldRow('Docket #', ca.docket_number);
        fieldRow('Hearing', ca.hearing_date ? String(ca.hearing_date) : '—');
        if (ca.attorney_notes || ca.outcome) {
          if (ca.attorney_notes) bodyText(ca.attorney_notes);
          if (ca.outcome) bodyText(`Outcome: ${ca.outcome}`);
        }
        y += 5;
      }
    }

    // SECTION 5: DEADLINES
    const dlCount = (deadlines || []).length;
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle(`5. DEADLINES (${dlCount})`);
    if (dlCount === 0) {
      bodyText('No deadlines recorded.');
    } else {
      const sortedDl = [...deadlines].sort((a, b) =>
        new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime());
      for (const [idx, dl] of sortedDl.entries()) {
        checkPageBreak(16);
        subsectionTitle(`Deadline ${idx + 1} — ${dateStr(dl.due_date)}`);
        twoColField('Type', String(dl.deadline_type || '').replace(/_/g, ' '), 'Priority', dl.priority || '—');
        fieldRow('Completed', dl.is_completed ? `Yes (${dateStr(dl.completed_date)})` : 'No');
        if (dl.description) bodyText(dl.description);
        y += 4;
      }
    }

    // SECTION 6: VIOLATION RECORDS (structured Violation entities)
    const vCount = (violations || []).length;
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle(`6. VIOLATION RECORDS (${vCount})`);
    if (vCount === 0) {
      bodyText('No additional structured violation records.');
    } else {
      for (const [idx, v] of violations.entries()) {
        checkPageBreak(20);
        subsectionTitle(`Violation ${idx + 1}`);
        fieldRow('RSA', v.rsa_citation);
        fieldRow('Ordinance', v.ordinance_citation);
        if (v.description) bodyText(v.description);
        if (v.corrective_actions) bodyText(`Corrective actions: ${v.corrective_actions}`);
        y += 4;
      }
    }

    // SECTION 7: FIELD INVESTIGATIONS
    doc.addPage(); y = margin; addPageHeader();
    const invCount = (investigations || []).length;
    sectionTitle(`7. FIELD INVESTIGATIONS (${invCount})`);

    if (invCount === 0) {
      bodyText('No field investigations recorded for this case.');
    } else {
      const sorted = [...investigations].sort((a, b) => {
        const tb = new Date(b.investigation_date || b.created_date || 0).getTime();
        const ta = new Date(a.investigation_date || a.created_date || 0).getTime();
        return tb - ta;
      });
      for (const [idx, inv] of sorted.entries()) {
        checkPageBreak(36);
        subsectionTitle(`Investigation ${idx + 1} — ${dateStr(inv.investigation_date || inv.created_date)}`);
        twoColField('Officer', inv.officer_name, 'Violation confirmed', inv.violation_confirmed ? 'YES' : 'No');
        if (inv.warrant_required) {
          fieldRow('Warrant (RSA 595-B)', inv.warrant_reference || 'Required — see file');
        }
        if (inv.evidence_summary) {
          fieldRow('Evidence summary', '');
          bodyText(inv.evidence_summary);
        }
        if (inv.field_notes) {
          fieldRow('Field notes', '');
          bodyText(inv.field_notes);
        }
        twoColField('Site conditions', inv.site_conditions || '—', 'Weather', inv.weather_conditions || '—');
        if (inv.witnesses) fieldRow('Witnesses', inv.witnesses);

        const invPhotoUrls = collectPhotoUrls(inv);
        if (invPhotoUrls.length > 0) {
          checkPageBreak(14);
          subsectionTitle('Attachments & evidence files');
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(60);
          bodyText(
            'Every file linked to this investigation is listed below. PDFs and non-image types cannot be inlined in this packet; use the URL or the case file in CodeEnforce. Images are also embedded after this list when available.'
          );
          doc.setTextColor(0);
          y += 2;

          invPhotoUrls.forEach((u, ai) => {
            const name = attachmentFileName(u);
            const pdf = isLikelyPdfUrl(u);
            const kind = pdf ? 'PDF' : /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(u) ? 'Image' : 'File';
            checkPageBreak(18);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text(`${ai + 1}. ${name} (${kind})`, margin, y + 4);
            y += 5;
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(30, 64, 175);
            const urlLines = doc.splitTextToSize(String(u), cw);
            urlLines.forEach((line: string) => {
              checkPageBreak(4);
              doc.text(line, margin, y + 4);
              y += 3.5;
            });
            doc.setTextColor(0);
            y += 3;
          });

          const validPhotos = invPhotoUrls.filter((url) => photoCache[url]);
          const notEmbedded = invPhotoUrls.length - validPhotos.length;
          if (notEmbedded > 0) {
            checkPageBreak(8);
            doc.setFont('Helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(
              `${notEmbedded} file(s) above were not embedded as pictures (PDF, fetch failed, or non-JPEG/PNG bytes). URLs remain in the list.`,
              margin,
              y + 4
            );
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(0);
            y += 8;
          }

          if (validPhotos.length > 0) {
            checkPageBreak(10);
            subsectionTitle('Embedded images');
            y += 2;
            let photoX = margin;
            let photoRowMaxY = y;
            for (const photoUrl of validPhotos) {
              const imgData = photoCache[photoUrl];
              const imgW = (cw - 5) / 2;
              const imgH = imgW * 0.75;
              if (photoX + imgW > pw - margin) { photoX = margin; y = photoRowMaxY; }
              checkPageBreak(imgH + 5);
              doc.addImage(imgData.data, imgData.format, photoX, y, imgW, imgH);
              photoRowMaxY = Math.max(photoRowMaxY, y + imgH + 3);
              photoX += imgW + 5;
            }
            y = photoRowMaxY;
          }
        }
        y += 10;
      }
    }

    const notes = (auditLogs || []).filter((l) => l.action === 'note_added' || l.action === 'User note');
    if (notes.length > 0) {
      doc.addPage(); y = margin; addPageHeader();
      sectionTitle(`8. CASE NOTES (${notes.length})`);
      notes.forEach((note, idx) => {
        checkPageBreak(15);
        subsectionTitle(`Note ${idx + 1} — ${dateStr(note.timestamp)}`);
        bodyText(auditNoteBody(note));
        y += 5;
      });
    }

    const pageCount = doc.internal.pages.length - 1;
    for (let i = 2; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(`Page ${i - 1} of ${pageCount - 1}`, pw / 2, ph - 10, { align: 'center' });
      doc.setFontSize(6);
      doc.setTextColor(160);
      const muni = [branding.name, branding.state].filter(Boolean).join(', ');
      const line1 = muni ? `${muni} · ${o.packetVariant}` : `Packet ${o.packetVariant}`;
      const l1 = doc.splitTextToSize(line1, pw - margin * 2);
      doc.text(l1[0], pw / 2, ph - 6, { align: 'center' });
      doc.text(`Sections 1–8 · ${o.exportRoute}`, pw / 2, ph - 2.5, { align: 'center' });
    }

    const pdfBuffer = doc.output('arraybuffer');
    const extra = o.pdfFilenameExtra ?? '';
    const pdfFilename = `${(caseRecord.case_number || 'case')}${extra}-court-file.pdf`;
    const pdfFile = new File([pdfBuffer], pdfFilename, { type: 'application/pdf' });
    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: pdfFile });

    const finalDoc = await base44.asServiceRole.entities.Document.create({
      case_id: caseRecord.id,
      town_id: caseRecord.town_id,
      title: `${o.documentTitlePrefix} — ${caseRecord.case_number}`,
      document_type: 'court_filing',
      file_url: file_uri,
      version: 1,
      created_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      document_id: finalDoc.id,
      filename: pdfFilename,
      packet_variant: o.packetVariant,
      export_route: o.exportRoute,
    });

  } catch (error) {
    console.error('Export Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

if (import.meta.main) {
  Deno.serve((req) =>
    handleCourtFileExport(req, {
      packetVariant: 'full-8-20260404',
      documentTitlePrefix: 'Court File Export (full packet)',
      exportRoute: 'exportCaseCourtFile',
    })
  );
}
