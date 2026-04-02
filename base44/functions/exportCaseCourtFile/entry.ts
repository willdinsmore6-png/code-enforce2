import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

// --- HELPER FUNCTIONS (PRESERVED) ---
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
    if (!contentType.startsWith('image/')) return null;
    const buffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    return { data: base64, format: contentType.includes('png') ? 'PNG' : 'JPEG' };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. AUTHENTICATION & ROLE CHECK
    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { case_id } = body;
    if (!case_id) return Response.json({ error: 'case_id is required' }, { status: 400 });

    // 2. DATA AGGREGATION (ALL ORIGINAL ENTITIES INCLUDED)
    const caseRecord = await base44.entities.Case.get(case_id);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    // Fetch Town Config for Dynamic Branding
    const townConfig = await base44.asServiceRole.entities.TownConfig.get(caseRecord.town_id);
    const townName = (townConfig?.town_name || 'Municipal').toUpperCase();
    const townState = townConfig?.state || 'NH';

    const [investigations, notices, documents, courtActions, deadlines, auditLogs, violations] = await Promise.all([
      base44.asServiceRole.entities.Investigation.filter({ case_id }),
      base44.asServiceRole.entities.Notice.filter({ case_id }),
      base44.asServiceRole.entities.Document.filter({ case_id }),
      base44.asServiceRole.entities.CourtAction.filter({ case_id }),
      base44.asServiceRole.entities.Deadline.filter({ case_id }),
      base44.asServiceRole.entities.AuditLog.filter({ case_id }),
      base44.asServiceRole.entities.Violation.filter({ case_id }),
    ]);

    // 3. PHOTO PRE-FETCHING & CACHING (PRESERVED)
    const allPhotoUrls = (investigations || []).flatMap(inv => inv.photos || []);
    const photoResults = await Promise.allSettled(allPhotoUrls.map(url => fetchImageAsBase64(url)));
    const photoCache = {};
    allPhotoUrls.forEach((url, i) => {
      if (photoResults[i].status === 'fulfilled' && photoResults[i].value) {
        photoCache[url] = photoResults[i].value;
      }
    });

    // 4. PDF INITIALIZATION & STYLING
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 18;
    const cw = pw - margin * 2;
    let y = margin;

    const PRIMARY_COLOR = [30, 58, 138]; // Municipal Navy
    const SECONDARY_COLOR = [100, 116, 139]; // Slate Gray

    function checkPageBreak(needed = 10) {
      if (y + needed > ph - margin) {
        doc.addPage();
        y = margin;
        addPageHeader();
      }
    }

    function addPageHeader() {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...SECONDARY_COLOR);
      doc.text(`TOWN OF ${townName}, ${townState} — CERTIFIED ENFORCEMENT RECORD`, margin, margin - 5);
      doc.text(`CASE: ${caseRecord.case_number || 'ID-' + case_id.slice(0, 5)}`, pw - margin, margin - 5, { align: 'right' });
      doc.setDrawColor(200);
      doc.line(margin, margin - 3, pw - margin, margin - 3);
    }

    function sectionTitle(title) {
      checkPageBreak(15);
      doc.setFillColor(...PRIMARY_COLOR);
      doc.rect(margin, y, cw, 7, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(title.toUpperCase(), margin + 3, y + 4.5);
      doc.setTextColor(0);
      y += 11;
    }

    function subsectionTitle(title) {
      checkPageBreak(10);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text(title, margin, y + 4);
      doc.setDrawColor(...PRIMARY_COLOR);
      doc.line(margin, y + 5.5, pw - margin, y + 5.5);
      doc.setTextColor(0);
      y += 8;
    }

    function fieldRow(label, value, labelWidth = 50) {
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

    function dateStr(d) {
      if (!d) return
