import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/** Strip spaces/dashes, uppercase — matches how codes are shown on notices. */
function normalizeAccessInput(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/[\s\-_]/g, '')
    .toUpperCase();
}

type DataBag = {
  public_access_code?: string;
  publicAccessCode?: string;
  case_number?: string;
  caseNumber?: string;
  town_id?: string;
};

type CaseRow = Record<string, unknown> & {
  id?: string;
  town_id?: string;
  case_number?: string;
  public_access_code?: string;
  publicAccessCode?: string;
  caseNumber?: string;
  status?: string;
  property_address?: string;
  violation_type?: string;
  specific_code_violated?: string;
  abatement_deadline?: string;
  zba_appeal_deadline?: string;
  data?: DataBag;
};

function publicCodeFromCase(c: CaseRow): string {
  const d = c.data || {};
  const raw =
    c.public_access_code ??
    c.publicAccessCode ??
    d.public_access_code ??
    d.publicAccessCode;
  return normalizeAccessInput(raw ?? '');
}

function caseNumberFromCase(c: CaseRow): string {
  const d = c.data || {};
  const raw = c.case_number ?? c.caseNumber ?? d.case_number ?? d.caseNumber;
  return normalizeAccessInput(raw ?? '');
}

/** App-generated codes avoid 0/O and 1/I; notices/fonts often confuse them. */
function lookupVariants(primary: string): string[] {
  const out = new Set<string>([primary]);
  if (primary.includes('1')) out.add(primary.replace(/1/g, 'I'));
  if (primary.includes('I')) out.add(primary.replace(/I/g, '1'));
  if (primary.includes('0')) out.add(primary.replace(/0/g, 'O'));
  if (primary.includes('O')) out.add(primary.replace(/O/g, '0'));
  return [...out];
}

async function tryFilter(
  Case: { filter: (q: Record<string, string>) => Promise<CaseRow[]> },
  q: Record<string, string>
): Promise<CaseRow[]> {
  try {
    const rows = await Case.filter(q);
    return rows?.length ? rows : [];
  } catch {
    return [];
  }
}

function rowMatchesCode(c: CaseRow, tryCode: string): boolean {
  if (publicCodeFromCase(c) === tryCode) return true;
  if (caseNumberFromCase(c) === tryCode) return true;
  const scan = (obj: unknown, depth: number): boolean => {
    if (depth > 3 || !obj || typeof obj !== 'object') return false;
    for (const v of Object.values(obj as Record<string, unknown>)) {
      if (typeof v === 'string' && normalizeAccessInput(v) === tryCode) return true;
      if (v && typeof v === 'object' && !Array.isArray(v) && scan(v, depth + 1)) return true;
    }
    return false;
  };
  return scan(c, 0);
}

/**
 * Resolve a case by public access code or (fallback) case number.
 * Tries snake_case + camelCase filters, 1/I and 0/O variants, then scans recent cases.
 */
async function findCaseByCode(
  base44: {
    asServiceRole: {
      entities: {
        Case: {
          filter: (q: Record<string, string>) => Promise<CaseRow[]>;
          list: (sort: string, limit: number, skip?: number) => Promise<CaseRow[]>;
        };
      };
    };
  },
  code: string
): Promise<CaseRow | null> {
  if (!code) return null;

  const Case = base44.asServiceRole.entities.Case;
  const variants = lookupVariants(code);

  for (const tryCode of variants) {
    const filterQueries: Record<string, string>[] = [
      { public_access_code: tryCode },
      { publicAccessCode: tryCode },
      { case_number: tryCode },
      { caseNumber: tryCode },
      { 'data.public_access_code': tryCode },
      { 'data.publicAccessCode': tryCode },
      { 'data.case_number': tryCode },
      { 'data.caseNumber': tryCode },
    ];
    for (const q of filterQueries) {
      const rows = await tryFilter(Case, q);
      if (rows.length) return rows[0];
    }
  }

  const PAGE = 2500;
  const MAX_SKIP = 100000;
  for (let skip = 0; skip < MAX_SKIP; ) {
    let batch: CaseRow[] = [];
    try {
      batch = (await Case.list('-created_date', PAGE, skip)) || [];
    } catch {
      batch = [];
    }
    if (!batch.length) break;
    for (const tryCode of variants) {
      for (const c of batch) {
        if (rowMatchesCode(c, tryCode)) return c;
      }
    }
    if (batch.length < PAGE) break;
    skip += PAGE;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body: { access_code?: string; code?: string } = {};
    try {
      body = (await req.json()) as { access_code?: string; code?: string };
    } catch {
      body = {};
    }

    const code = normalizeAccessInput(body.access_code ?? body.code);
    if (!code) {
      return Response.json({ error: 'Access code required' }, { status: 400 });
    }

    const c = await findCaseByCode(base44, code);
    if (!c) {
      return Response.json({ found: false });
    }

    const d = c.data || {};
    const [allDocs, allNotices] = await Promise.all([
      base44.asServiceRole.entities.Document.filter({ case_id: c.id as string }),
      base44.asServiceRole.entities.Notice.filter({ case_id: c.id as string }),
    ]);

    const publicDocTypes = ['nov', 'citation', 'abatement_proof', 'court_filing', 'correspondence', 'other'];
    const publicDocs = allDocs.filter((d: { document_type?: string }) => publicDocTypes.includes(d.document_type || ''));

    return Response.json({
      found: true,
      case: {
        id: c.id,
        town_id: c.town_id ?? d.town_id,
        case_number: c.case_number ?? c.caseNumber ?? d.case_number ?? d.caseNumber,
        status: c.status,
        property_address: c.property_address,
        violation_type: c.violation_type,
        specific_code_violated: c.specific_code_violated,
        abatement_deadline: c.abatement_deadline,
        zba_appeal_deadline: c.zba_appeal_deadline,
      },
      notices: allNotices.map(
        (n: {
          id: string;
          notice_type?: string;
          date_issued?: string;
          delivery_method?: string;
          delivery_confirmed?: boolean;
          rsa_cited?: string;
          abatement_deadline?: string;
          appeal_deadline?: string;
          appeal_instructions?: string;
          notice_content?: string;
          document_url?: string;
        }) => ({
          id: n.id,
          notice_type: n.notice_type,
          date_issued: n.date_issued,
          delivery_method: n.delivery_method,
          delivery_confirmed: n.delivery_confirmed,
          rsa_cited: n.rsa_cited,
          abatement_deadline: n.abatement_deadline,
          appeal_deadline: n.appeal_deadline,
          appeal_instructions: n.appeal_instructions,
          notice_content: n.notice_content,
          document_url: n.document_url,
        })
      ),
      documents: publicDocs.map(
        (d: {
          id: string;
          title?: string;
          document_type?: string;
          description?: string;
          file_url?: string;
          created_date?: string;
          version?: number;
        }) => ({
          id: d.id,
          title: d.title,
          document_type: d.document_type,
          description: d.description,
          file_url: d.file_url,
          created_date: d.created_date,
          version: d.version,
        })
      ),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
