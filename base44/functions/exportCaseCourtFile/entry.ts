import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import jsPDF from 'npm:jspdf@4.0.0';

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
    const [caseData, documents, auditLogs] = await Promise.all([
      base44.asServiceRole.entities.Case.filter({ id: case_id }),
      base44.asServiceRole.entities.Document.filter({ case_id }),
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

    // Section 2: Documents
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
        if (doc_item.description) {
          addText(doc_item.description, 9);
        }
        if (doc_item.file_url) {
          addText(`URL: ${doc_item.file_url}`, 8);
        }
        addText(`Uploaded: ${doc_item.created_date ? new Date(doc_item.created_date).toLocaleDateString() : 'N/A'} by ${doc_item.uploaded_by || 'Unknown'}`, 8);
        yPos += 1;
      });

      yPos += 3;
    }

    // Section 3: Activity Log
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
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${caseRecord.case_number || 'case'}-court-file.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});