import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

// --- HELPERS (PRESERVED) ---
function arrayBufferToBase64(buffer) {
  const uint8Array = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i += 8192) {
    const chunk = uint8Array.subarray(i, i + 8192);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
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
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { case_id } = await req.json();
    if (!case_id) return Response.json({ error: 'Missing case_id' }, { status: 400 });

    // 1. FETCH PRIMARY DATA
    const caseRecord = await base44.asServiceRole.entities.Case.get(case_id);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    const townConfig = await base44.asServiceRole.entities.TownConfig.get(caseRecord.town_id);
    const townName = (townConfig?.town_name || 'Municipal').toUpperCase();

    // 2. FETCH SUB-ENTITIES (BROAD FETCH)
    const [investigations, notices, auditLogs] = await Promise.all([
      base44.asServiceRole.entities.Investigation.filter({ case_id }),
      base44.asServiceRole.entities.Notice.filter({ case_id }),
      base44.asServiceRole.entities.AuditLog.filter({ case_id }),
    ]);

    console.log(`Found ${investigations.length} investigations and ${notices.length} notices.`);

    // 3. PHOTO PRE-FETCH
    const allPhotoUrls = (investigations || []).flatMap(inv => inv.photos || []);
    const photoResults = await Promise.allSettled(allPhotoUrls.map(url => fetchImageAsBase64(url)));
    const photoCache = {};
    allPhotoUrls.forEach((url, i) => {
      if (photoResults[i].status === 'fulfilled' && photoResults[i].value) {
        photoCache[url] = photoResults[i].value;
      }
    });

    // 4. PDF GENERATION
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 18;
    const cw = pw - margin * 2;
    let y = margin;

    const addPageHeader = () => {
      doc.setFont('Helvetica', 'bold').setFontSize(7).setTextColor(120);
      doc.text(`TOWN OF ${townName} — OFFICIAL RECORD`, margin, margin - 5);
      doc.text(`CASE: ${caseRecord.case_number}`, pw - margin, margin - 5, { align: 'right' });
      doc.setDrawColor(200).line(margin, margin - 3, pw - margin, margin - 3);
    };

    const sectionTitle = (title) => {
      if (y + 25 > ph - margin) { doc.addPage(); y = margin; addPageHeader(); }
      doc.setFillColor(30, 64, 175).roundedRect(margin, y, cw, 8, 1, 1, 'F');
      doc.setFont('Helvetica', 'bold').setFontSize(10).setTextColor(255).text(title, margin + 3, y + 5.5);
      y += 12;
    };

    const fieldRow = (label, value) => {
      if (y + 10 > ph - margin) { doc.addPage(); y = margin; addPageHeader(); }
      doc.setFont('Helvetica', 'bold').setFontSize(8.5).setTextColor(80).text(label + ':', margin, y + 4);
      doc.setFont('Helvetica', 'normal').setTextColor(0).text(String(value || '—'), margin + 55, y + 4);
      y += 7;
    };

    // COVER PAGE
    doc.setFillColor(30, 64, 175).rect(0, 0, pw, 60, 'F');
    doc.setFont('Helvetica', 'bold').setFontSize(22).setTextColor(255).text('CODE ENFORCEMENT RECORD', pw / 2, 35, { align: 'center' });
    doc.setTextColor(0); y = 75;
    fieldRow('Address', caseRecord.property_address);
    fieldRow('Owner', caseRecord.property_owner_name);
    fieldRow('Assigned Officer', caseRecord.assigned_officer);

    // INVESTIGATIONS
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle('1. INVESTIGATIONS');
    if (!investigations.length) fieldRow('Status', 'No investigation records found.');
    investigations.forEach((inv, idx) => {
      fieldRow(`Investigation Date`, new Date(inv.investigation_date).toLocaleDateString());
      doc.setFontSize(8).text(doc.splitTextToSize(`Notes: ${inv.summary || inv.field_notes || 'None'}`, cw - 10), margin + 5, y + 4);
      y += 15;
      (inv.photos || []).forEach(url => {
        const img = photoCache[url];
        if (img && y + 55 < ph) {
          doc.addImage(img.data, img.format, margin + 5, y, 75, 50);
          y += 55;
        }
      });
      y += 5;
    });

    // NOTICES (ENHANCED LOGIC)
    sectionTitle('2. NOTICES ISSUED');
    if (!notices.length) fieldRow('Status', 'No notices recorded.');
    notices.forEach(n => {
      fieldRow(n.notice_type?.toUpperCase().replace(/_/g, ' ') || 'NOTICE', new Date(n.date_issued).toLocaleDateString());
      fieldRow('Status', n.status);
      y += 2;
    });

    // 5. STORAGE & RECORD CREATION
    const pdfBuffer = doc.output('arraybuffer');
    const pdfFilename = `${caseRecord.case_number?.replace(/\s+/g, '_')}_Record.pdf`;
    
    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ 
      file: new File([pdfBuffer], pdfFilename, { type: 'application/pdf' }) 
    });

    // SAFETY CHECK: Ensure town_id exists before creating document record
    const docRecord = await base44.asServiceRole.entities.Document.create({
      case_id,
      town_id: caseRecord.town_id || 'default_town',
      title: `Certified Record — ${new Date().toLocaleDateString()}`,
      document_type: 'court_filing',
      file_url: file_uri,
      uploaded_by: user.email || 'system'
    });

    return Response.json({ success: true, document_id: docRecord.id });
  } catch (error) { 
    console.error('PDF Export Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 }); 
  }
});
