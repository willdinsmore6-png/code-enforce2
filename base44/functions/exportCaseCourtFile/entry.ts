import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

// --- HELPERS (PRESERVED) ---
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

async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    return { data: arrayBufferToBase64(buffer), format: contentType.includes('png') ? 'PNG' : 'JPEG' };
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) return Response.json({ error: 'Unauthorized' }, { status: 403 });

    const { case_id } = await req.json();
    const caseRecord = await base44.entities.Case.get(case_id);
    const townConfig = await base44.asServiceRole.entities.TownConfig.get(caseRecord.town_id);
    const townName = (townConfig?.town_name || 'Municipal').toUpperCase();

    // FETCH EVERYTHING - ENSURE NO DATA IS LEFT BEHIND
    const [investigations, notices, documents, courtActions, deadlines, auditLogs, violations] = await Promise.all([
      base44.asServiceRole.entities.Investigation.filter({ case_id }),
      base44.asServiceRole.entities.Notice.filter({ case_id }),
      base44.asServiceRole.entities.Document.filter({ case_id }),
      base44.asServiceRole.entities.CourtAction.filter({ case_id }),
      base44.asServiceRole.entities.Deadline.filter({ case_id }),
      base44.asServiceRole.entities.AuditLog.filter({ case_id }),
      base44.asServiceRole.entities.Violation.filter({ case_id }),
    ]);

    // PHOTO CACHE (PRESERVED)
    const allPhotoUrls = (investigations || []).flatMap(inv => inv.photos || []);
    const photoResults = await Promise.allSettled(allPhotoUrls.map(url => fetchImageAsBase64(url)));
    const photoCache = {};
    allPhotoUrls.forEach((url, i) => {
      if (photoResults[i].status === 'fulfilled' && photoResults[i].value) photoCache[url] = photoResults[i].value;
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 18;
    const cw = pw - margin * 2;
    let y = margin;

    // STYLING HELPERS
    const addPageHeader = () => {
      doc.setFont('Helvetica', 'bold').setFontSize(7).setTextColor(100);
      doc.text(`TOWN OF ${townName} — OFFICIAL RECORD`, margin, margin - 5);
      doc.text(`CASE: ${caseRecord.case_number}`, pw - margin, margin - 5, { align: 'right' });
      doc.setDrawColor(200).line(margin, margin - 3, pw - margin, margin - 3);
    };

    const sectionTitle = (title) => {
      if (y + 20 > ph - margin) { doc.addPage(); y = margin; addPageHeader(); }
      doc.setFillColor(30, 58, 138).rect(margin, y, cw, 7, 'F');
      doc.setFont('Helvetica', 'bold').setFontSize(9).setTextColor(255).text(title.toUpperCase(), margin + 3, y + 4.5);
      y += 11;
    };

    const fieldRow = (label, value) => {
      doc.setFont('Helvetica', 'bold').setFontSize(8.5).setTextColor(80).text(label + ':', margin, y + 4);
      doc.setFont('Helvetica', 'normal').setTextColor(0).text(String(value || '—'), margin + 50, y + 4);
      y += 6;
    };

    // --- COVER PAGE ---
    doc.setFont('Helvetica', 'bold').setFontSize(18).text(`TOWN OF ${townName}`, pw / 2, 40, { align: 'center' });
    doc.setFontSize(24).text('CERTIFIED ENFORCEMENT FILE', pw / 2, 55, { align: 'center' });
    y = 80;
    fieldRow('Property Address', caseRecord.property_address);
    fieldRow('Owner', caseRecord.property_owner_name);
    fieldRow('Status', caseRecord.status.toUpperCase());

    // --- SECTION 1: INVESTIGATIONS & PHOTOS ---
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle('1. Field Investigations');
    investigations.forEach((inv) => {
      fieldRow('Date', new Date(inv.investigation_date).toLocaleDateString());
      fieldRow('Summary', inv.summary || inv.field_notes);
      if (inv.photos?.length > 0) {
        inv.photos.forEach(url => {
          const img = photoCache[url];
          if (img && y + 60 < ph) {
            doc.addImage(img.data, img.format, margin, y + 2, 80, 60);
            y += 65;
          }
        });
      }
      y += 5;
    });

    // --- SECTION 2: NOTICES & AUDITS ---
    sectionTitle('2. Notices & Log');
    notices.forEach(n => fieldRow(n.notice_type, `Sent: ${n.date_issued}`));
    auditLogs.slice(0, 10).forEach(log => fieldRow(new Date(log.timestamp).toLocaleDateString(), log.action));

    // FINALIZE & STORE
    const pdfBuffer = doc.output('arraybuffer');
    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ 
      file: new File([pdfBuffer], `CASE_${caseRecord.case_number}.pdf`, { type: 'application/pdf' }) 
    });

    const docRecord = await base44.asServiceRole.entities.Document.create({
      case_id,
      town_id: caseRecord.town_id,
      title: `Certified Record — ${new Date().toLocaleDateString()}`,
      document_type: 'court_filing',
      file_url: file_uri, // Store URI for getCourtFilePDF
      uploaded_by: user.email
    });

    return Response.json({ success: true, document_id: docRecord.id });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});
