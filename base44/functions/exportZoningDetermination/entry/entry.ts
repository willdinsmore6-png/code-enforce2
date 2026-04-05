import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { checkActingTownAccess } from '../../shared/actingTownGuard/entry.ts';

type ZD = Record<string, unknown>;

function noteBody(changes: unknown): string {
  if (changes == null) return '';
  if (typeof changes === 'object' && changes !== null && 'note' in changes) {
    return String((changes as { note?: unknown }).note ?? '');
  }
  if (typeof changes === 'string') {
    try {
      const p = JSON.parse(changes) as { note?: unknown };
      if (p && typeof p === 'object' && 'note' in p) return String(p.note ?? '');
    } catch {
      return changes;
    }
  }
  return String(changes);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as { zoning_determination_id?: string; acting_town_id?: string };
    const zid = body.zoning_determination_id?.trim();
    if (!zid) return Response.json({ error: 'zoning_determination_id required' }, { status: 400 });

    let zd: ZD | null = null;
    try {
      zd = (await base44.entities.ZoningDetermination.get(zid)) as ZD;
    } catch {
      zd = null;
    }
    if (!zd && user.role === 'superadmin') {
      const rows = (await base44.asServiceRole.entities.ZoningDetermination.filter(
        { id: zid },
        '-created_date',
        5
      )) as ZD[] | null;
      zd = rows?.[0] ?? null;
    }
    if (!zd) {
      const sc = (await base44.entities.ZoningDetermination.filter({ id: zid })) as ZD[] | null;
      zd = sc?.[0] ?? null;
    }
    if (!zd) return Response.json({ error: 'Zoning determination not found' }, { status: 404 });

    const actingDenied = checkActingTownAccess(user, body, zd.town_id as string | undefined);
    if (actingDenied) return actingDenied;

    const townId = String(zd.town_id || '');
    const sr = base44.asServiceRole.entities;

    const [docs, invs, logs, townRows] = await Promise.all([
      sr.Document.filter({ zoning_determination_id: zid }, '-created_date', 200).catch(() => []),
      sr.Investigation.filter({ zoning_determination_id: zid }, '-created_date', 100).catch(() => []),
      sr.AuditLog.filter({ zoning_determination_id: zid }, '-timestamp', 300).catch(() => []),
      sr.TownConfig.filter({ id: townId }, '-created_date', 2).catch(() => []),
    ]);

    const town = (townRows as ZD[] | null)?.[0];
    const townName = String(town?.town_name || 'Municipal Zoning Office');
    const townState = String(town?.state || '');

    const notes = ((logs as ZD[]) || []).filter(
      (l) => l.action === 'User note' || l.action === 'note_added'
    );

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 18;
    const cw = pw - margin * 2;
    let y = margin;

    function addFooter(pageIndex: number, total: number) {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${pageIndex} of ${total}`, pw / 2, ph - 10, { align: 'center' });
      doc.setFontSize(7);
      doc.text('Zoning determination packet — property file / legal record', pw / 2, ph - 6, { align: 'center' });
      doc.setTextColor(0);
    }

    function section(title: string) {
      doc.setFillColor(30, 64, 175);
      doc.roundedRect(margin, y, cw, 7, 0.5, 0.5, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 2, y + 5);
      doc.setTextColor(0);
      y += 10;
    }

    function bodyText(text: string, size = 9) {
      if (!text) return;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, cw);
      for (const line of lines) {
        if (y > ph - margin - 14) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += size * 0.45;
      }
      y += 2;
    }

    // Cover
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pw, 45, 'F');
    doc.setTextColor(255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ZONING DETERMINATION', pw / 2, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.text(townName + (townState ? `, ${townState}` : ''), pw / 2, 28, { align: 'center' });
    doc.setFontSize(13);
    doc.text(String(zd.file_number || 'File'), pw / 2, 38, { align: 'center' });
    doc.setTextColor(0);
    y = 52;
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.text('Property', margin, y);
    y += 5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    bodyText(String(zd.property_address || '—'));
    doc.setFont('Helvetica', 'bold');
    doc.text(`Parcel / map-lot: ${String(zd.parcel_id || '—')} · ${String(zd.map_block_lot || '—')}`, margin, y);
    y += 8;

    section('Applicant & request');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    bodyText(
      `Applicant: ${String(zd.applicant_name || '—')}${zd.applicant_is_agent ? ' (agent)' : ''}\nContact: ${String(zd.applicant_contact || '—')}\nCategory: ${String(zd.request_category || '').replace(/_/g, ' ')}\nDistrict (recorded): ${String(zd.zoning_district_recorded || '—')}`
    );
    bodyText(String(zd.request_summary || '—'));

    section('Written determination');
    bodyText(String(zd.determination_text || '— (draft — complete before issuance)'));

    section('Legal basis & conditions');
    bodyText(String(zd.legal_basis || '—'));
    bodyText(String(zd.conditions || ''));

    section('Issuance');
    bodyText(
      `Status: ${String(zd.status || '').replace(/_/g, ' ')}\nPrepared by: ${String(zd.prepared_by || '—')}\nIssued: ${String(zd.issued_date || '—')}\nEffective: ${String(zd.effective_date || '—')}`
    );

    if (Array.isArray(zd.related_case_ids) && zd.related_case_ids.length) {
      section('Related enforcement cases');
      bodyText((zd.related_case_ids as string[]).join(', '));
    }

    section(`Field investigations (${(invs as ZD[]).length})`);
    for (const inv of invs as ZD[]) {
      if (y > ph - margin - 30) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${String(inv.investigation_date || inv.created_date || '')} — ${String(inv.officer_name || '')}`, margin, y);
      y += 4;
      doc.setFont('Helvetica', 'normal');
      bodyText(
        [
          inv.field_notes ? `Notes: ${String(inv.field_notes)}` : '',
          inv.evidence_summary ? `Evidence: ${String(inv.evidence_summary)}` : '',
          inv.site_conditions ? `Site: ${String(inv.site_conditions)}` : '',
        ]
          .filter(Boolean)
          .join('\n\n')
      );
    }

    section(`Documents on file (${(docs as ZD[]).length})`);
    for (const d of docs as ZD[]) {
      if (y > ph - margin - 12) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      const line = `• ${String(d.title || 'Untitled')} (${String(d.document_type || '').replace(/_/g, ' ')})`;
      doc.text(line, margin, y);
      y += 4;
      if (d.file_url) {
        const u = String(d.file_url).slice(0, 120);
        doc.setTextColor(40, 80, 180);
        doc.text(u + (String(d.file_url).length > 120 ? '…' : ''), margin, y);
        doc.setTextColor(0);
        y += 4;
      }
    }

    section(`Staff notes (${notes.length})`);
    for (const n of notes) {
      if (y > ph - margin - 20) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(String(n.timestamp || ''), margin, y);
      y += 3.5;
      doc.setFont('Helvetica', 'normal');
      bodyText(noteBody(n.changes), 8.5);
    }

    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    const pdfBuffer = doc.output('arraybuffer');
    const fn = `${String(zd.file_number || 'zoning-determination').replace(/[^\w\-]+/g, '-')}-packet.pdf`;
    const pdfFile = new File([pdfBuffer], fn, { type: 'application/pdf' });
    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: pdfFile });

    const finalDoc = await base44.asServiceRole.entities.Document.create({
      zoning_determination_id: zid,
      town_id: townId,
      title: `Zoning determination packet — ${String(zd.file_number || zid).slice(0, 80)}`,
      document_type: 'zoning_determination',
      file_url: file_uri,
      version: 1,
      description: 'Official packet export',
    });

    return Response.json({
      success: true,
      document_id: finalDoc.id,
      filename: fn,
    });
  } catch (error) {
    console.error('exportZoningDetermination:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
