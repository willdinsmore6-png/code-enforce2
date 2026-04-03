import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

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
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;
    const buffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    return { data: base64, format: contentType.includes('png') ? 'PNG' : 'JPEG' };
  } catch (err) {
    console.error(`Photo fetch failed: ${url}`, err.message);
    return null;
  }
}

Deno.serve(async (req) => {
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

    const body = await req.json();
    const { case_id } = body;
    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    let caseRecord;
    try {
      caseRecord = await base44.entities.Case.get(case_id);
    } catch (e) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // THE FIX: Searching for investigations using both the Short ID and the Hex ID
    const [investigations, notices, documents, courtActions, deadlines, auditLogs, violations] = await Promise.all([
      base44.asServiceRole.entities.Investigation.filter({ 
        $or: [
          { case_id: case_id },           // Human ID (YDLSH1VL)
          { case_id: caseRecord.id }      // Database Hex ID
        ] 
      }),
      base44.asServiceRole.entities.Notice.filter({ case_id: case_id }),
      base44.asServiceRole.entities.Document.filter({ case_id: case_id }),
      base44.asServiceRole.entities.CourtAction.filter({ case_id: case_id }),
      base44.asServiceRole.entities.Deadline.filter({ case_id: case_id }),
      base44.asServiceRole.entities.AuditLog.filter({ case_id: case_id }),
      base44.asServiceRole.entities.Violation.filter({ case_id: case_id }),
    ]);

    const allPhotoUrls = (investigations || []).flatMap(inv => inv.photos || []).filter(Boolean);
    const photoResults = await Promise.allSettled(allPhotoUrls.map(url => fetchImageAsBase64(url)));
    const photoCache = {};
    allPhotoUrls.forEach((url, i) => {
      if (photoResults[i].status === 'fulfilled' && photoResults[i].value) {
        photoCache[url] = photoResults[i].value;
      }
    });

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
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(`CASE FILE: ${caseRecord.case_number || case_id.slice(0, 8)} — CONFIDENTIAL`, margin, margin - 5);
      doc.text(`Page ${doc.internal.pages.length - 1}`, pw - margin, margin - 5, { align: 'right' });
      doc.setDrawColor(180);
      doc.line(margin, margin - 3, pw - margin, margin - 3);
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

    // COVER PAGE
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pw, 60, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('CODE ENFORCEMENT', pw / 2, 22, { align: 'center' });
    doc.text('CASE FILE', pw / 2, 34, { align: 'center' });
    doc.setFontSize(13);
    doc.text(caseRecord.case_number || `Case #${case_id.slice(0, 8)}`, pw / 2, 47, { align: 'center' });

    doc.setTextColor(0);
    y = 72;
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
      ['Violation Type', caseRecord.violation_type || '—'],
      ['Priority', (caseRecord.priority || 'medium').toUpperCase()],
      ['Complaint Date', dateStr(caseRecord.complaint_date)],
      ['Assigned Officer', caseRecord.assigned_officer || '—'],
    ];
    doc.setFontSize(9.5);
    coverFields.forEach(([label, val]) => {
      doc.setFont('Helvetica', 'bold');
      doc.text(label + ':', pw / 2 - 50, y);
      doc.setFont('Helvetica', 'normal');
      doc.text(String(val), pw / 2 + 5, y);
      y += 7;
    });

    // SECTION 1: CASE SUMMARY
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle('1. CASE SUMMARY');
    twoColField('Case Number', caseRecord.case_number, 'Status', caseRecord.status);
    twoColField('Complaint Date', dateStr(caseRecord.complaint_date), 'Priority', caseRecord.priority);
    fieldRow('Address', caseRecord.property_address);
    fieldRow('Owner', caseRecord.property_owner_name);
    fieldRow('Description', caseRecord.violation_description);

    // SECTION 3: INVESTIGATIONS
    doc.addPage(); y = margin; addPageHeader();
    const invCount = (investigations || []).length;
    sectionTitle(`3. FIELD INVESTIGATIONS (${invCount})`);
    
    if (invCount === 0) {
      bodyText('No field investigations recorded for this case.');
    } else {
      const sorted = [...investigations].sort((a, b) => new Date(b.investigation_date).getTime() - new Date(a.investigation_date).getTime());
      for (const [idx, inv] of sorted.entries()) {
        checkPageBreak(30);
        subsectionTitle(`Investigation ${idx + 1} — ${dateStr(inv.investigation_date)}`);
        twoColField('Officer', inv.officer_name, 'Confirmed', inv.violation_confirmed ? 'YES' : 'No');
        
        if (inv.field_notes) {
          fieldRow('Notes', '');
          bodyText(inv.field_notes);
        }

        if (inv.photos && inv.photos.length > 0) {
          const validPhotos = inv.photos.filter(url => photoCache[url]);
          if (validPhotos.length > 0) {
            y += 5;
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

    // SECTION 7: DOCUMENTS
    if (documents && documents.length > 0) {
      doc.addPage(); y = margin; addPageHeader();
      sectionTitle(`7. DOCUMENTS ON FILE (${documents.length})`);
      documents.forEach((d, idx) => {
        checkPageBreak(15);
        subsectionTitle(`${idx + 1}. ${d.title || 'Untitled'}`);
        twoColField('Type', d.document_type, 'Date', dateStr(d.created_at));
        y += 5;
      });
    }

    const pageCount = doc.internal.pages.length - 1;
    for (let i = 2; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.text(`Page ${i - 1} of ${pageCount - 1}`, pw / 2, ph - 8, { align: 'center' });
    }

    const pdfBuffer = doc.output('arraybuffer');
    const pdfFilename = `${(caseRecord.case_number || 'case')}-court-file.pdf`;
    const pdfFile = new File([pdfBuffer], pdfFilename, { type: 'application/pdf' });
    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: pdfFile });

    await base44.asServiceRole.entities.Document.create({
      case_id,
      town_id: caseRecord.town_id,
      title: `Court File Export — ${new Date().toLocaleDateString()}`,
      document_type: 'court_filing',
      file_url: file_uri,
      version: 1,
    });

    return Response.json({ success: true, filename: pdfFilename });

  } catch (error) {
    console.error('Export Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
