import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { case_id } = await req.json();
    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    // Fetch case and related data
    const [caseData, investigations, notices, documents, courtActions, deadlines, auditLogs] = await Promise.all([
      base44.asServiceRole.entities.Case.filter({ id: case_id }),
      base44.asServiceRole.entities.Investigation.filter({ case_id }),
      base44.asServiceRole.entities.Notice.filter({ case_id }),
      base44.asServiceRole.entities.Document.filter({ case_id }),
      base44.asServiceRole.entities.CourtAction.filter({ case_id }),
      base44.asServiceRole.entities.Deadline.filter({ case_id }),
      base44.asServiceRole.entities.AuditLog.filter({ case_id }),
    ]);

    if (!caseData || !caseData[0]) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const caseRecord = caseData[0];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    let pageNum = 1;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    // Helper to add text with word wrap and page breaks
    function addText(text, size, isBold = false, maxWidth = contentWidth) {
      doc.setFontSize(size);
      doc.setFont('Helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      const lineHeight = size * 0.35;
      const requiredHeight = lines.length * lineHeight;

      if (yPos + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        pageNum++;
      }

      doc.text(lines, margin, yPos);
      yPos += requiredHeight;
      return lines.length;
    }

    // Header with case number
    doc.setFontSize(18);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Court File Export: ${caseRecord.case_number || `Case #${case_id.slice(0, 8)}`}`, margin, yPos);
    yPos += 12;

    // Page footer
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Section 1: Case Summary
    addText('CASE SUMMARY', 12, true);
    yPos += 2;

    const caseFields = [
      { label: 'Case Number', value: caseRecord.case_number || 'N/A' },
      { label: 'Status', value: caseRecord.status || 'N/A' },
      { label: 'Property Address', value: caseRecord.property_address || 'N/A' },
      { label: 'Owner Name', value: caseRecord.property_owner_name || 'N/A' },
      { label: 'Owner Email', value: caseRecord.property_owner_email || 'N/A' },
      { label: 'Violation Type', value: caseRecord.violation_type?.replace(/_/g, ' ') || 'N/A' },
      { label: 'Violation Description', value: caseRecord.violation_description || 'N/A' },
      { label: 'Code Cited', value: caseRecord.specific_code_violated || 'N/A' },
      { label: 'Assigned Officer', value: caseRecord.assigned_officer || 'Unassigned' },
      { label: 'Abatement Deadline', value: caseRecord.abatement_deadline ? new Date(caseRecord.abatement_deadline).toLocaleDateString() : 'N/A' },
      { label: 'Compliance Path', value: caseRecord.compliance_path?.replace(/_/g, ' ') || 'None' },
      { label: 'Priority', value: caseRecord.priority || 'Medium' },
      { label: 'Total Fines Accrued', value: `$${caseRecord.total_fines_accrued || 0}` },
      { label: 'Created Date', value: caseRecord.created_date ? new Date(caseRecord.created_date).toLocaleDateString() : 'N/A' },
    ];

    caseFields.forEach(({ label, value }) => {
      addText(`${label}: ${value}`, 10);
    });

    yPos += 5;

    // Section 2: Investigations
    if (investigations && investigations.length > 0) {
      if (yPos + 15 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        pageNum++;
      }
      addText('INVESTIGATIONS', 12, true);
      yPos += 2;

      investigations.sort((a, b) => new Date(b.investigation_date) - new Date(a.investigation_date));
      investigations.forEach((inv, idx) => {
        addText(`${idx + 1}. Investigation on ${inv.investigation_date ? new Date(inv.investigation_date).toLocaleDateString() : 'N/A'}`, 10, true);
        addText(`Officer: ${inv.officer_name || 'N/A'}`, 10);
        if (inv.field_notes) addText(`Notes: ${inv.field_notes}`, 9);
        if (inv.visible_from_public_row !== undefined) addText(`Visible from public row: ${inv.visible_from_public_row ? 'Yes' : 'No'}`, 9);
        if (inv.warrant_required) addText(`Warrant Required: Yes`, 9);
        if (inv.violation_confirmed !== undefined) addText(`Violation Confirmed: ${inv.violation_confirmed ? 'Yes' : 'No'}`, 9);
        if (inv.site_conditions) addText(`Site Conditions: ${inv.site_conditions}`, 9);
        if (inv.weather_conditions) addText(`Weather: ${inv.weather_conditions}`, 9);
        if (inv.evidence_summary) addText(`Evidence: ${inv.evidence_summary}`, 9);
        if (inv.photos && inv.photos.length > 0) {
          addText(`Photos: ${inv.photos.join(', ')}`, 8);
        }
        yPos += 2;
      });
      yPos += 3;
    }

    // Section 3: Notices and Citations
    if (notices && notices.length > 0) {
      if (yPos + 15 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        pageNum++;
      }
      addText('NOTICES & CITATIONS', 12, true);
      yPos += 2;

      notices.sort((a, b) => new Date(b.date_issued) - new Date(a.date_issued));
      notices.forEach((notice, idx) => {
        addText(`${idx + 1}. ${notice.notice_type?.replace(/_/g, ' ').toUpperCase()} - Issued ${notice.date_issued ? new Date(notice.date_issued).toLocaleDateString() : 'N/A'}`, 10, true);
        addText(`Type: ${notice.notice_type?.replace(/_/g, ' ') || 'N/A'}`, 10);
        addText(`Delivery: ${notice.delivery_method?.replace(/_/g, ' ') || 'N/A'} ${notice.tracking_number ? `(${notice.tracking_number})` : ''}`, 10);
        if (notice.rsa_cited) addText(`RSA Cited: ${notice.rsa_cited}`, 9);
        if (notice.ordinance_cited) addText(`Ordinance: ${notice.ordinance_cited}`, 9);
        if (notice.abatement_deadline) addText(`Abatement Deadline: ${new Date(notice.abatement_deadline).toLocaleDateString()}`, 9);
        if (notice.appeal_deadline) addText(`Appeal Deadline: ${new Date(notice.appeal_deadline).toLocaleDateString()}`, 9);
        if (notice.delivery_confirmed) addText(`Delivery Confirmed: ${notice.delivery_confirmed_date ? new Date(notice.delivery_confirmed_date).toLocaleDateString() : 'Pending'}`, 9);
        if (notice.document_url) addText(`Document: ${notice.document_url}`, 8);
        yPos += 2;
      });
      yPos += 3;
    }

    // Section 4: Court Actions
    if (courtActions && courtActions.length > 0) {
      if (yPos + 15 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        pageNum++;
      }
      addText('COURT ACTIONS', 12, true);
      yPos += 2;

      courtActions.sort((a, b) => new Date(b.filing_date) - new Date(a.filing_date));
      courtActions.forEach((action, idx) => {
        addText(`${idx + 1}. ${action.action_type?.replace(/_/g, ' ').toUpperCase()} - ${action.court_type?.replace(/_/g, ' ').toUpperCase()}`, 10, true);
        if (action.filing_date) addText(`Filed: ${new Date(action.filing_date).toLocaleDateString()}`, 10);
        if (action.docket_number) addText(`Docket: ${action.docket_number}`, 10);
        if (action.hearing_date) addText(`Hearing: ${new Date(action.hearing_date).toLocaleString()}`, 10);
        if (action.attorney_assigned) addText(`Attorney: ${action.attorney_assigned}`, 10);
        if (action.status) addText(`Status: ${action.status?.replace(/_/g, ' ')}`, 9);
        if (action.outcome) addText(`Outcome: ${action.outcome}`, 9);
        if (action.penalties_awarded) addText(`Penalties: $${action.penalties_awarded}`, 9);
        if (action.injunction_granted) addText(`Injunction Granted: Yes`, 9);
        if (action.attorney_notes) addText(`Notes: ${action.attorney_notes}`, 9);
        yPos += 2;
      });
      yPos += 3;
    }

    // Section 5: Deadlines
    if (deadlines && deadlines.length > 0) {
      if (yPos + 15 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        pageNum++;
      }
      addText('DEADLINES', 12, true);
      yPos += 2;

      deadlines.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      deadlines.forEach((deadline) => {
        const isOverdue = new Date(deadline.due_date) < new Date();
        addText(`${deadline.description} - Due: ${new Date(deadline.due_date).toLocaleDateString()} ${isOverdue ? '[OVERDUE]' : ''}`, 10, isOverdue);
        addText(`Type: ${deadline.deadline_type?.replace(/_/g, ' ')} | Priority: ${deadline.priority || 'Medium'} | Status: ${deadline.is_completed ? 'Completed' : 'Pending'}`, 9);
        yPos += 2;
      });
      yPos += 3;
    }

    // Section 6: Documents
    if (documents && documents.length > 0) {
      if (yPos + 15 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        pageNum++;
      }
      addText('DOCUMENTS ON FILE', 12, true);
      yPos += 2;

      documents.forEach((doc_item, idx) => {
        addText(`${idx + 1}. ${doc_item.title || 'Untitled'} (${doc_item.document_type?.replace(/_/g, ' ') || 'Other'})`, 10, true);
        if (doc_item.description) addText(doc_item.description, 9);
        if (doc_item.file_url) addText(`URL: ${doc_item.file_url}`, 8);
        addText(`Uploaded: ${doc_item.created_date ? new Date(doc_item.created_date).toLocaleDateString() : 'N/A'} by ${doc_item.uploaded_by || 'Unknown'}`, 8);
        yPos += 1;
      });
      yPos += 3;
    }

    // Section 7: Activity Log
    if (auditLogs && auditLogs.length > 0) {
      if (yPos + 15 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        pageNum++;
      }

      addText('ACTIVITY AUDIT LOG', 12, true);
      yPos += 2;

      const sortedLogs = auditLogs.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      sortedLogs.slice(0, 50).forEach((log) => {
        const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A';
        const user_info = log.user_name ? `${log.user_name} (${log.user_email})` : log.user_email || 'Unknown';
        addText(`${timestamp} | ${user_info}`, 9, true);
        addText(`Action: ${log.action || 'N/A'} | Entity: ${log.entity_type || 'N/A'}`, 9);
        if (log.changes) {
          try {
            const changes = typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes;
            addText(`Changes: ${JSON.stringify(changes).slice(0, 150)}...`, 8);
          } catch {
            addText(`Changes: ${log.changes}`, 8);
          }
        }
        yPos += 2;
      });
    }

    // Add page numbers to all pages
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');
    // Convert to base64 for JSON transport
    const uint8Array = new Uint8Array(pdfBytes);
    const binaryString = String.fromCharCode.apply(null, uint8Array);
    const base64Data = btoa(binaryString);
    return Response.json({ success: true, pdf_base64: base64Data, filename: `${caseRecord.case_number || 'case'}-court-file.pdf` });
  } catch (error) {
    console.error('PDF export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});