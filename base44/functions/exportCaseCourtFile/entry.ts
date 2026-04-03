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
      return Response.json({ error: 'Unauthorized - please log in' }, { status: 401 });
    }

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { case_id } = body;
    if (!case_id) return Response.json({ error: 'case_id is required' }, { status: 400 });

    console.log(`Generating PDF for case: ${case_id}`);

    let caseRecord;
    try {
      caseRecord = await base44.entities.Case.get(case_id);
    } catch (e) {
      console.error('Error fetching case:', e?.message);
      return Response.json({ error: 'Case not found: ' + e?.message }, { status: 404 });
    }
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    // FIXED: Explicitly mapping the case_id property to ensure records are found
    const [investigations, notices, documents, courtActions, deadlines, auditLogs, violations] = await Promise.all([
      base44.asServiceRole.entities.Investigation.filter({ case_id: case_id }),
      base44.asServiceRole.entities.Notice.filter({ case_id: case_id }),
      base44.asServiceRole.entities.Document.filter({ case_id: case_id }),
      base44.asServiceRole.entities.CourtAction.filter({ case_id: case_id }),
      base44.asServiceRole.entities.Deadline.filter({ case_id: case_id }),
      base44.asServiceRole.entities.AuditLog.filter({ case_id: case_id }),
      base44.asServiceRole.entities.Violation.filter({ case_id: case_id }),
    ]);

    // Pre-fetch all investigation photos in parallel
    const allPhotoUrls = (investigations || []).flatMap(inv => inv.photos || []);
    const photoResults = await Promise.allSettled(allPhotoUrls.map(url => fetchImageAsBase64(url)));
    const photoCache = {};
    allPhotoUrls.forEach((url, i) => {
      if (photoResults[i].status === 'fulfilled' && photoResults[i].value) {
        photoCache[url] = photoResults[i].value;
      }
    });

    console.log(`Pre-fetched ${Object.keys(photoCache).length}/${allPhotoUrls.length} photos. Building PDF...`);

    // --- PDF Setup ---
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
      doc.setDrawColor(0);
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
      doc.setTextColor(30);
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

    function datetimeStr(d) {
      if (!d) return '—';
      try { return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
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
    doc.setFont('Helvetica', 'normal');
    doc.text(caseRecord.case_number || `Case #${case_id.slice(0, 8)}`, pw / 2, 47, { align: 'center' });

    doc.setTextColor(0);
    y = 72;
    doc.setFont('Helvetica', 'bold');
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
      ['Case Status', (caseRecord.status || '').replace(/_/g, ' ').toUpperCase()],
      ['Violation Type', (caseRecord.violation_type || '').replace(/_/g, ' ')],
      ['Compliance Path', (caseRecord.compliance_path || 'none').replace(/_/g, ' ')],
      ['Priority', (caseRecord.priority || 'medium').toUpperCase()],
      ['Complaint Date', dateStr(caseRecord.complaint_date)],
      ['Assigned Officer', caseRecord.assigned_officer || 'Unassigned'],
      ['Report Generated', new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
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
    y += 10;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('This document is prepared for municipal code enforcement proceedings.', pw / 2, y, { align: 'center' });
    doc.text('All information is confidential and intended for authorized use only.', pw / 2, y + 5, { align: 'center' });

    // SECTION 1: CASE SUMMARY
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle('1. CASE SUMMARY');
    twoColField('Case Number', caseRecord.case_number || case_id.slice(0, 8), 'Status', (caseRecord.status || '').replace(/_/g, ' '));
    twoColField('Complaint Date', dateStr(caseRecord.complaint_date), 'Priority', caseRecord.priority || 'Medium');
    twoColField('Violation Type', (caseRecord.violation_type || '').replace(/_/g, ' '), 'First Offense', caseRecord.is_first_offense ? 'Yes' : 'No');
    twoColField('Compliance Path', (caseRecord.compliance_path || 'none').replace(/_/g, ' '), 'Total Fines', `$${caseRecord.total_fines_accrued || 0}`);
    twoColField('Assigned Officer', caseRecord.assigned_officer || 'Unassigned', 'Assigned Attorney', caseRecord.assigned_attorney || '—');
    twoColField('Abatement Deadline', dateStr(caseRecord.abatement_deadline), 'ZBA Appeal Deadline', dateStr(caseRecord.zba_appeal_deadline));
    twoColField('Daily Penalty Rate', `$${caseRecord.daily_penalty_rate || 275}/day`, 'Retention Category', (caseRecord.retention_category || '').replace(/_/g, ' ') || '—');

    y += 3;
    subsectionTitle('Property & Owner Information');
    fieldRow('Property Address', caseRecord.property_address);
    fieldRow('Parcel ID', caseRecord.parcel_id);
    fieldRow('Owner Name', caseRecord.property_owner_name);
    fieldRow('Owner Email', caseRecord.property_owner_email);
    fieldRow('Owner Phone', caseRecord.property_owner_phone);

    y += 3;
    subsectionTitle('Complainant Information');
    if (caseRecord.complainant_anonymous) {
      fieldRow('Complainant', 'Anonymous — identity withheld per request');
    } else {
      fieldRow('Complainant Name', caseRecord.complainant_name);
      fieldRow('Complainant Contact', caseRecord.complainant_contact);
    }
    fieldRow('Source', caseRecord.source === 'public_report' ? 'Public Report' : 'Internal Filing');

    y += 3;
    subsectionTitle('Violation Description');
    fieldRow('Code Cited', caseRecord.specific_code_violated);
    bodyText(caseRecord.violation_description);

    if (caseRecord.resolution_notes) {
      y += 3;
      subsectionTitle('Resolution Notes');
      twoColField('Resolution Date', dateStr(caseRecord.resolution_date), 'Status', caseRecord.status || '—');
      bodyText(caseRecord.resolution_notes);
    }

    // SECTION 2: VIOLATIONS
    if (violations && violations.length > 0) {
      doc.addPage(); y = margin; addPageHeader();
      sectionTitle(`2. VIOLATIONS (${violations.length})`);
      violations.forEach((v, idx) => {
        checkPageBreak(18);
        subsectionTitle(`Violation ${idx + 1}: ${(v.violation_type || '').replace(/_/g, ' ')}`);
        twoColField('RSA Citation', v.rsa_citation || '—', 'Ordinance Citation', v.ordinance_citation || '—');
        twoColField('Status', (v.status || '').replace(/_/g, ' '), 'Fine Per Day', `$${v.fine_per_day || 275}`);
        twoColField('Compliance Deadline', dateStr(v.compliance_deadline), 'Repeat Offense', v.is_repeat_offense ? 'Yes' : 'No');
        if (v.description) fieldRow('Description', v.description);
        if (v.corrective_actions) fieldRow('Corrective Actions Required', v.corrective_actions);
        if (v.compliance_notes) fieldRow('Compliance Notes', v.compliance_notes);
        if (v.resolved_date) fieldRow('Resolved Date', dateStr(v.resolved_date));
        y += 4;
      });
    }

    // SECTION 3: INVESTIGATIONS
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle(`3. FIELD INVESTIGATIONS (${(investigations || []).length})`);
    if (!investigations || investigations.length === 0) {
      bodyText('No field investigations recorded for this case.');
      y += 5;
    } else {
      const sorted = [...investigations].sort((a, b) => new Date(b.investigation_date) - new Date(a.investigation_date));
      for (const [idx, inv] of sorted.entries()) {
        checkPageBreak(20);
        subsectionTitle(`Investigation ${idx + 1} — ${dateStr(inv.investigation_date)}`);
        twoColField('Officer', inv.officer_name || '—', 'Violation Confirmed', inv.violation_confirmed ? 'YES' : inv.violation_confirmed === false ? 'No' : '—');
        twoColField('Warrant Required', inv.warrant_required ? 'Yes' : 'No', 'Warrant Reference', inv.warrant_reference || '—');
        if (inv.weather_conditions) twoColField('Weather Conditions', inv.weather_conditions, 'Site Conditions', inv.site_conditions || '—');
        if (inv.witnesses) fieldRow('Witnesses', inv.witnesses);
        if (inv.field_notes) { fieldRow('Field Notes', ''); bodyText(inv.field_notes); }
        if (inv.evidence_summary) { fieldRow('Evidence Summary', ''); bodyText(inv.evidence_summary); }

        // Embed photos from cache (already fetched in parallel above)
        if (inv.photos && inv.photos.length > 0) {
          const validPhotos = inv.photos.filter(url => photoCache[url]);
          if (validPhotos.length > 0) {
            y += 3;
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(80);
            doc.text(`Site Photos (${validPhotos.length} of ${inv.photos.length}):`, margin, y + 4);
            y += 7;

            let photoX = margin;
            let photoRowMaxY = y;
            for (const photoUrl of validPhotos) {
              const imgData = photoCache[photoUrl];
              const imgW = (cw - 5) / 2;
              const imgH = imgW * 0.65;
              if (photoX + imgW > pw - margin) {
                photoX = margin;
                y = photoRowMaxY;
              }
              checkPageBreak(imgH + 5);
              doc.addImage(imgData.data, imgData.format, photoX, y, imgW, imgH);
              photoRowMaxY = Math.max(photoRowMaxY, y + imgH + 3);
              photoX += imgW + 5;
            }
            y = photoRowMaxY;
          }
        }
        y += 5;
      }
    }

    // SECTION 4: NOTICES
    doc.addPage(); y = margin; addPageHeader();
    sectionTitle(`4. NOTICES & CITATIONS (${(notices || []).length})`);
    if (!notices || notices.length === 0) {
      bodyText('No notices issued for this case.');
    } else {
      const sorted = [...notices].sort((a, b) => new Date(a.date_issued) - new Date(b.date_issued));
      sorted.forEach((notice, idx) => {
        checkPageBreak(22);
        subsectionTitle(`${idx + 1}. ${(notice.notice_type || '').replace(/_/g, ' ').toUpperCase()} — ${dateStr(notice.date_issued)}`);
        twoColField('Delivery Method', (notice.delivery_method || '').replace(/_/g, ' '), 'Tracking Number', notice.tracking_number || '—');
        twoColField('Delivery Confirmed', notice.delivery_confirmed ? 'Yes' : 'No', 'Confirmed Date', dateStr(notice.delivery_confirmed_date));
        twoColField('RSA Cited', notice.rsa_cited || '—', 'Ordinance Cited', notice.ordinance_cited || '—');
        twoColField('Abatement Deadline', dateStr(notice.abatement_deadline), 'Appeal Deadline', dateStr(notice.appeal_deadline));
        fieldRow('Recipient', notice.recipient_name);
        fieldRow('Recipient Address', notice.recipient_address);
        if (notice.appeal_instructions) fieldRow('Appeal Instructions', notice.appeal_instructions);
        if (notice.notice_content) { y += 2; subsectionTitle('Notice Content'); bodyText(notice.notice_content); }
        y += 5;
      });
    }

    // SECTION 5: COURT ACTIONS
    if (courtActions && courtActions.length > 0) {
      doc.addPage(); y = margin; addPageHeader();
      sectionTitle(`5. COURT ACTIONS (${courtActions.length})`);
      [...courtActions].sort((a, b) => new Date(a.filing_date) - new Date(b.filing_date)).forEach((action, idx) => {
        checkPageBreak(20);
        subsectionTitle(`${idx + 1}. ${(action.action_type || '').replace(/_/g, ' ').toUpperCase()}`);
        twoColField('Court Type', (action.court_type || '').replace(/_/g, ' '), 'Status', (action.status || '').replace(/_/g, ' '));
        twoColField('Filing Date', dateStr(action.filing_date), 'Docket Number', action.docket_number || '—');
        if (action.hearing_date) twoColField('Hearing Date', datetimeStr(action.hearing_date), 'Location', action.court_location || '—');
        if (action.attorney_assigned) fieldRow('Attorney Assigned', action.attorney_assigned);
        if (action.outcome) fieldRow('Outcome', action.outcome);
        if (action.penalties_awarded) twoColField('Penalties Awarded', `$${action.penalties_awarded}`, 'Costs Recovered', `$${action.costs_recovered || 0}`);
        if (action.injunction_granted) fieldRow('Injunction Granted', 'YES');
        if (action.next_action_required) fieldRow('Next Action Required', action.next_action_required);
        if (action.attorney_notes) { fieldRow('Attorney Notes', ''); bodyText(action.attorney_notes); }
        y += 5;
      });
    }

    // SECTION 6: DEADLINES
    checkPageBreak(20);
    if (y > margin + 40) { doc.addPage(); y = margin; addPageHeader(); }
    sectionTitle(`6. DEADLINES & CALENDAR (${(deadlines || []).length})`);
    if (!deadlines || deadlines.length === 0) {
      bodyText('No deadlines recorded for this case.');
    } else {
      [...deadlines].sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).forEach((dl) => {
        checkPageBreak(10);
        const overdue = !dl.is_completed && new Date(dl.due_date) < new Date();
        const statusText = dl.is_completed ? `✓ Completed ${dateStr(dl.completed_date)}` : overdue ? '⚠ OVERDUE' : 'Pending';
        twoColField(dateStr(dl.due_date), dl.description, 'Status', statusText);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Type: ${(dl.deadline_type || '').replace(/_/g, ' ')} | Priority: ${dl.priority || 'Medium'} | Assigned: ${dl.assigned_to || '—'}`, margin + 5, y);
        y += 5;
      });
    }

    // SECTION 7: DOCUMENTS ON FILE
    if (documents && documents.length > 0) {
      checkPageBreak(20);
      if (y > ph - 80) { doc.addPage(); y = margin; addPageHeader(); }
      sectionTitle(`7. DOCUMENTS ON FILE (${documents.length})`);
      documents.forEach((d, idx) => {
        checkPageBreak(14);
        subsectionTitle(`${idx + 1}. ${d.title || 'Untitled'}`);
        twoColField('Document Type', (d.document_type || '').replace(/_/g, ' '), 'Version', `v${d.version || 1}`);
        twoColField('Uploaded By', d.uploaded_by || '—', 'Upload Date', dateStr(d.created_date));
        if (d.description) fieldRow('Description', d.description);
        if (d.tags && d.tags.length) fieldRow('Tags', d.tags.join(', '));
        y += 3;
      });
    }

    // SECTION 8 & 9: NOTES & AUDIT LOG
    const notes = (auditLogs || []).filter(l => l.action === 'note_added' || l.action === 'User note');
    const activity = (auditLogs || []).filter(l => l.action !== 'note_added' && l.action !== 'User note').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (notes.length > 0) {
      doc.addPage(); y = margin; addPageHeader();
      sectionTitle(`8. CASE NOTES (${notes.length})`);
      [...notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach((note, idx) => {
        checkPageBreak(18);
        subsectionTitle(`Note ${idx + 1} — ${datetimeStr(note.timestamp)}`);
        fieldRow('Author', `${note.user_name || '—'} (${note.user_email || '—'})`);
        if (note.changes) {
          try {
            const parsed = typeof note.changes === 'string' ? JSON.parse(note.changes) : note.changes;
            bodyText(parsed.note || JSON.stringify(parsed));
          } catch { bodyText(note.changes); }
        }
        y += 4;
      });
    }

    if (activity.length > 0) {
      checkPageBreak(20);
      if (y > ph - 80) { doc.addPage(); y = margin; addPageHeader(); }
      sectionTitle(`9. ACTIVITY AUDIT LOG (${Math.min(activity.length, 100)} most recent)`);
      activity.slice(0, 100).forEach((log) => {
        checkPageBreak(8);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30);
        doc.text(`${datetimeStr(log.timestamp)} — ${log.user_name || log.user_email || '?'} — ${log.action || '—'}`, margin, y + 4);
        y += 4.5;
        if (log.changes) {
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(80);
          let changeText = log.changes;
          try {
            const parsed = typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes;
            changeText = Object.entries(parsed).slice(0, 4).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(' | ');
          } catch { /* keep as is */ }
          const lines = doc.splitTextToSize(changeText.slice(0, 200), cw - 10);
          lines.forEach(line => {
            checkPageBreak(4);
            doc.text(line, margin + 5, y + 3.5);
            y += 4;
          });
          doc.setTextColor(0);
        }
        y += 2;
      });
    }

    // PAGE NUMBERS
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 2; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(
        `Case: ${caseRecord.case_number || case_id.slice(0, 8)} | Generated: ${new Date().toLocaleDateString()} | Page ${i - 1} of ${pageCount - 1}`,
        pw / 2, ph - 8, { align: 'center' }
      );
    }

    console.log(`PDF generated. Pages: ${pageCount}. Uploading to private storage...`);

    // Upload PDF to private storage
    const pdfBuffer = doc.output('arraybuffer');
    const pdfFilename = `${(caseRecord.case_number || 'case').replace(/[^a-zA-Z0-9-]/g, '_')}-court-file.pdf`;
    const pdfFile = new File([pdfBuffer], pdfFilename, { type: 'application/pdf' });
    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: pdfFile });

    // Create a Document entity record linked to this case & town (RLS enforced)
    const filename = `${(caseRecord.case_number || 'case').replace(/[^a-zA-Z0-9-]/g, '_')}-court-file.pdf`;
    const docRecord = await base44.asServiceRole.entities.Document.create({
      case_id,
      town_id: caseRecord.town_id,
      title: `Court File — ${caseRecord.case_number || case_id.slice(0, 8)} (${new Date().toLocaleDateString()})`,
      document_type: 'court_filing',
      file_url: file_uri,
      description: `Auto-generated court file PDF. Generated by ${user.full_name || user.email} on ${new Date().toLocaleString()}.`,
      uploaded_by: user.email,
      version: 1,
    });

    console.log(`PDF stored. Document record created: ${docRecord.id}`);

    return Response.json({
      success: true,
      document_id: docRecord.id,
      filename,
    });

  } catch (error) {
    console.error('PDF export error:', error?.message, error?.stack);
    return Response.json({ error: error.message || 'PDF generation failed' }, { status: 500 });
  }
});
