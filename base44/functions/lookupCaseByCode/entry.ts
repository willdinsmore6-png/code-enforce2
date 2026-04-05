import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/** Strip spaces/dashes, uppercase — matches how codes are shown on notices. */
function normalizeAccessInput(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/[\s\-_]/g, '')
    .toUpperCase();
}

type CaseRow = Record<string, unknown> & {
  id?: string;
  town_id?: string;
  case_number?: string;
  public_access_code?: string;
  status?: string;
  property_address?: string;
  violation_type?: string;
  specific_code_violated?: string;
  abatement_deadline?: string;
  zba_appeal_deadline?: string;
  data?: {
    public_access_code?: string;
    case_number?: string;
    town_id?: string;
  };
};

function publicCodeFromCase(c: CaseRow): string {
  const root = c.public_access_code;
  const nested = c.data?.public_access_code;
  return normalizeAccessInput((root ?? nested ?? '') as string);
}

function caseNumberFromCase(c: CaseRow): string {
  const root = c.case_number;
  const nested = c.data?.case_number;
  return normalizeAccessInput((root ?? nested ?? '') as string);
}

/**
 * Resolve a case by public access code or (fallback) case number.
 * Some environments store fields only on `data`; `filter` may not hit those rows — scan is last resort.
 */
async function findCaseByCode(
  base44: {
    asServiceRole: {
      entities: {
        Case: {
          filter: (q: Record<string, string>) => Promise<CaseRow[]>;
          list: (sort: string, limit: number) => Promise<CaseRow[]>;
        };
      };
    };
  },
  code: string
): Promise<CaseRow | null> {
  if (!code) return null;

  let rows = await base44.asServiceRole.entities.Case.filter({ public_access_code: code });
  if (rows?.length) return rows[0];

  rows = await base44.asServiceRole.entities.Case.filter({ case_number: code });
  if (rows?.length) return rows[0];

  const MAX_SCAN = 8000;
  const all = await base44.asServiceRole.entities.Case.list('-created_date', MAX_SCAN);
  for (const c of all) {
    if (publicCodeFromCase(c) === code) return c;
  }
  for (const c of all) {
    if (caseNumberFromCase(c) === code) return c;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body: { access_code?: string } = {};
    try {
      body = (await req.json()) as { access_code?: string };
    } catch {
      body = {};
    }

    const code = normalizeAccessInput(body.access_code);
    if (!code) {
      return Response.json({ error: 'Access code required' }, { status: 400 });
    }

    const c = await findCaseByCode(base44, code);
    if (!c) {
      return Response.json({ found: false });
    }

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
        town_id: c.town_id ?? c.data?.town_id,
        case_number: c.case_number ?? c.data?.case_number,
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
