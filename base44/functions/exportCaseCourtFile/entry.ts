import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

// --- HELPER FUNCTIONS ---
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

    const caseRecord = await base44.entities.Case.get(case_id);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    const townConfig = await base44.asServiceRole.entities.TownConfig.get(caseRecord.town_id);
    const townName = (townConfig?.town_name || 'Municipal').toUpperCase();
    const townState = townConfig?.state || 'NH';

    const [investigations, notices, documents] = await Promise.all([
      base44.asServiceRole.entities.Investigation.filter({ case_id }),
      base44.asServiceRole.entities.Notice.filter({ case_id }),
      base44.asServiceRole.entities.Document.filter({ case_id }),
    ]);

    const allPhotoUrls = (investigations || []).flatMap(inv => inv.photos || []);
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

    const PRIMARY_COLOR = [30, 58, 138];
    const SECONDARY_COLOR = [100, 116, 139];

    function addPageHeader() {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...SECONDARY_COLOR);
      doc.text(`TOWN OF ${townName}, ${townState} — CERTIFIED ENFORCEMENT RECORD`, margin, margin - 5);
      doc.text(`CASE: ${caseRecord.case_number || 'ID-' + case_id.slice(0, 5)}`, pw - margin, margin - 5, { align: 'right' });
      doc.setDrawColor(200);
      doc.line(margin, margin - 3, pw - margin, margin - 3);
    }

    function checkPageBreak(needed = 10) {
      if (y + needed > ph - margin) {
        doc.addPage(); y = margin; addPageHeader();
      }
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

    // COVER PAGE
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, pw, 5, 'F');
    y = 35;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...SECONDARY_COLOR);
    doc.text(`STATE OF ${townState}`, pw / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(`TOWN OF ${townName}`, pw / 2, y, { align: 'center' });
    y += 20;
    doc.setFontSize(26);
    doc.text('CERTIFIED CASE FILE', pw / 2, y, { align: 'center' });
    
    y += 25;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, cw, 50, 2, 2, 'F');
    let gridY = y + 10;
    const drawGrid = (l, v) => {
      doc.setFont('Helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...PRIMARY_COLOR);
      doc.text(l, margin + 10, gridY);
      doc.setFont('Helvetica', 'normal'); doc.setTextColor(0);
      doc.text(String(v || '—'), margin + 55, gridY);
      gridY += 8;
    };
    drawGrid('Property Address:', caseRecord.property_address);
    drawGrid('Owner of Record:', caseRecord.property_owner_name);
    drawGrid('Violation Type:', caseRecord.violation_type?.replace('_', ' ').toUpperCase());
    drawGrid('Current Status:', caseRecord.status?.replace('_', ' ').toUpperCase());
    drawGrid('Generated On:', new Date().toLocaleDateString());

    // CONTENT
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle('1. Case Overview');
    fieldRow('Violation Description', caseRecord.violation_description);
    fieldRow('Code Citations', caseRecord.specific_code_violated);
    
    if (investigations?.length > 0) {
      sectionTitle(`2. Field Investigations (${investigations.length})`);
      investigations.forEach((inv) => {
        checkPageBreak(15);
        fieldRow(`Inspection Date: ${new Date(inv.investigation_date).toLocaleDateString()}`, inv.summary || inv.field_notes);
        if (inv.photos?.length > 0) {
          const valid = inv.photos.filter(url => photoCache[url]);
          if (valid.length > 0) {
            y += 2;
            let px = margin;
            valid.forEach(url => {
              const img = photoCache[url];
              const iw = (cw / 2) - 2;
              const ih = iw * 0.75;
              if (y + ih > ph - margin) { doc.addPage(); y = margin; addPageHeader(); }
              doc.addImage(img.data, img.format, px, y, iw, ih);
              px = px === margin ? margin + iw + 4 : margin;
              if (px === margin) y += ih + 4;
            });
            if (px !== margin) y += 65; 
          }
        }
      });
    }

    if (documents?.length > 0) {
      sectionTitle('3. Evidence Exhibits');
      documents.forEach((d, idx) => {
        fieldRow(`EXHIBIT ${idx + 1}`, `${d.title} (${d.document_type})`);
      });
    }

    const pdfBuffer = doc.output('arraybuffer');
    const pdfFilename = `OFFICIAL_FILE_${caseRecord.case_number || case_id.slice(0,5)}.pdf`;
    
    // IMPORTANT: Upload to private storage
    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ 
      file: new File([pdfBuffer], pdfFilename, { type: 'application/pdf' }) 
    });

    // Match your getCourtFilePDF expectation: store it as "file_url"
    const docRecord = await base44.asServiceRole.entities.Document.create({
      case_id,
      town_id: caseRecord.town_id,
      title: `Certified Record — ${new Date().toLocaleDateString()}`,
      document_type: 'court_filing',
      file_url: file_uri, 
      uploaded_by: user.email
    });

    return Response.json({ success: true, document_id: docRecord.id, filename: pdfFilename });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
