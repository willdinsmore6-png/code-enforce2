import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This is called by a scheduled automation — use service role
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all open cases with an assigned officer
    const cases = await base44.asServiceRole.entities.Case.list('-created_date', 200);
    const openCases = cases.filter(c =>
      !['resolved', 'closed'].includes(c.status) && c.assigned_officer
    );

    // Fetch all incomplete deadlines
    const deadlines = await base44.asServiceRole.entities.Deadline.filter({ is_completed: false });

    let emailsSent = 0;
    const errors = [];

    for (const c of openCases) {
      // Find deadlines for this case due in the next 7 days
      const caseDeadlines = deadlines.filter(d => {
        if (d.case_id !== c.id) return false;
        const due = new Date(d.due_date);
        due.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        return daysUntil >= 0 && daysUntil <= 7;
      });

      // Also check the case's own abatement deadline
      const caseAlerts = [];
      if (c.abatement_deadline) {
        const due = new Date(c.abatement_deadline);
        due.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 7) {
          caseAlerts.push({ description: 'Abatement Deadline', due_date: c.abatement_deadline, daysUntil });
        }
      }
      if (c.zba_appeal_deadline) {
        const due = new Date(c.zba_appeal_deadline);
        due.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 7) {
          caseAlerts.push({ description: 'ZBA Appeal Deadline', due_date: c.zba_appeal_deadline, daysUntil });
        }
      }

      const allAlerts = [
        ...caseAlerts,
        ...caseDeadlines.map(d => {
          const due = new Date(d.due_date);
          due.setHours(0, 0, 0, 0);
          return {
            description: d.description,
            due_date: d.due_date,
            daysUntil: Math.ceil((due - today) / (1000 * 60 * 60 * 24)),
          };
        })
      ];

      if (allAlerts.length === 0) continue;

      // Determine next recommended action based on status
      const nextActionMap = {
        intake: 'Assign a CEO and conduct a site investigation.',
        investigation: 'Issue a Notice of Violation citing the relevant RSA/ordinance.',
        notice_sent: 'Confirm delivery of the notice and monitor for property owner response.',
        awaiting_response: 'Evaluate compliance. If no response, consider a Second Notice or enforcement action.',
        citation_issued: 'File summons with District Court and track daily penalties ($275/day).',
        court_action: 'Attend hearings and monitor court orders and attorney filings.',
        in_compliance: 'Conduct a final site inspection to verify full compliance and close the case.',
      };
      const nextAction = nextActionMap[c.status] || 'Review case status and take appropriate action.';

      const deadlineRows = allAlerts.map(a =>
        `<tr>
          <td style="padding:6px 12px; border-bottom:1px solid #eee;">${a.description}</td>
          <td style="padding:6px 12px; border-bottom:1px solid #eee;">${a.due_date}</td>
          <td style="padding:6px 12px; border-bottom:1px solid #eee; color:${a.daysUntil <= 2 ? '#dc2626' : '#92400e'}; font-weight:bold;">
            ${a.daysUntil === 0 ? 'TODAY' : a.daysUntil === 1 ? 'Tomorrow' : `${a.daysUntil} days`}
          </td>
        </tr>`
      ).join('');

      const emailBody = `
        <div style="font-family:sans-serif; max-width:600px; margin:0 auto;">
          <div style="background:#1e3a5f; color:white; padding:20px 24px; border-radius:8px 8px 0 0;">
            <h2 style="margin:0; font-size:18px;">⚠ Deadline Alert — Bow Code Enforcement</h2>
          </div>
          <div style="background:#fff; border:1px solid #e2e8f0; padding:24px; border-radius:0 0 8px 8px;">
            <p>Hello,</p>
            <p>You are the assigned officer for case <strong>${c.case_number || c.id.slice(0, 8)}</strong> at <strong>${c.property_address}</strong>.</p>
            <p>The following deadlines are approaching within the next 7 days:</p>
            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:8px 12px; text-align:left; font-size:12px; color:#64748b;">DEADLINE</th>
                  <th style="padding:8px 12px; text-align:left; font-size:12px; color:#64748b;">DATE</th>
                  <th style="padding:8px 12px; text-align:left; font-size:12px; color:#64748b;">TIME LEFT</th>
                </tr>
              </thead>
              <tbody>${deadlineRows}</tbody>
            </table>
            <div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:6px; padding:14px; margin:16px 0;">
              <strong style="color:#92400e;">📋 Recommended Next Action:</strong>
              <p style="margin:6px 0 0; color:#78350f;">${nextAction}</p>
            </div>
            <p style="color:#64748b; font-size:13px;">Current case status: <strong>${c.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></p>
            <p style="color:#94a3b8; font-size:12px; margin-top:24px;">— Bow NH Code Enforcement System</p>
          </div>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: c.assigned_officer,
        from_name: 'Bow Code Enforcement',
        subject: `⚠ Action Required: ${allAlerts.length} deadline(s) approaching — ${c.case_number || c.property_address}`,
        body: emailBody,
      });
      emailsSent++;
    }

    return Response.json({ success: true, emailsSent, casesChecked: openCases.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});