import {
  addDays,
  differenceInCalendarDays,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';

/** @param {unknown} d */
function parseDate(d) {
  if (d == null || d === '') return null;
  try {
    const x = typeof d === 'string' ? parseISO(d.slice(0, 10)) : new Date(d);
    return isValid(x) ? startOfDay(x) : null;
  } catch {
    return null;
  }
}

/**
 * Abatement period length from town config, keyed off violation category
 * (building / health / septic / site plan vs zoning-style violations).
 */
export function abatementDaysForCase(caseRecord, config) {
  const vt = caseRecord?.violation_type || '';
  const buildingish = new Set([
    'building_code',
    'housing_condition',
    'health_safety',
    'septic',
    'site_plan',
    'subdivision',
  ]);
  const daysB = config?.compliance_days_building ?? config?.compliance_days_zoning ?? 30;
  const daysZ = config?.compliance_days_zoning ?? 30;
  return buildingish.has(vt) ? daysB : daysZ;
}

function deadlineLabel(d) {
  const type = d.deadline_type?.replace(/_/g, ' ') || '';
  const desc = (d.description || '').trim();
  if (desc) return desc;
  if (type) return `${type.charAt(0).toUpperCase()}${type.slice(1)} deadline`;
  return 'Case deadline';
}

/**
 * Merge recorded Deadline rows with computed NH / municipal milestones.
 * @returns {Array<{ id: string; label: string; date: Date; detail?: string; source: string; completed?: boolean; variant: 'recorded' | 'auto' }>}
 */
export function buildEnforcementTimeline(
  caseRecord,
  municipality,
  deadlines,
  notices,
  investigations
) {
  const cfg = municipality || {};
  const zbaDays = cfg.zba_appeal_days ?? 30;
  const items = [];
  const today = startOfDay(new Date());
  const abDays = abatementDaysForCase(caseRecord, cfg);

  const complaint =
    parseDate(caseRecord?.complaint_date) ||
    parseDate(caseRecord?.created_date);

  if (complaint) {
    items.push({
      id: 'milestone-complaint',
      label: 'Complaint / case opened',
      date: complaint,
      detail: 'Baseline date for recommended follow-up timing',
      source: 'case',
      variant: 'auto',
    });
  }

  const status = caseRecord?.status || '';
  if (['intake', 'pending_review', 'investigation'].includes(status) && complaint) {
    items.push({
      id: 'milestone-investigation-target',
      label: 'Target: initial site visit & investigation',
      date: addDays(complaint, 14),
      detail:
        'Recommended within 14 days of intake (adjust for your town’s practice or union agreements)',
      source: 'computed',
      variant: 'auto',
    });
  }

  const datedNotices = (notices || [])
    .map((n) => ({ n, d: parseDate(n.date_issued) }))
    .filter((x) => x.d);
  datedNotices.sort((a, b) => a.d - b.d);

  const primaryNotice =
    datedNotices.find((x) => x.n.notice_type === 'first_nov')?.n || datedNotices[0]?.n;

  const abatementFromCase = parseDate(caseRecord?.abatement_deadline);

  const hasAbatementDeadlineRow = (deadlines || []).some(
    (d) => d.deadline_type === 'abatement' && parseDate(d.due_date)
  );

  if (primaryNotice) {
    const issued = parseDate(primaryNotice.date_issued);
    if (issued) {
      items.push({
        id: 'milestone-zba-window',
        label: 'ZBA appeal window ends (typical)',
        date: addDays(issued, zbaDays),
        detail: `${zbaDays} days from first notice issue — town config (verify RSA 676:5 and local ordinance with counsel)`,
        source: 'computed',
        variant: 'auto',
      });

      if (!hasAbatementDeadlineRow) {
        const abateDate = abatementFromCase || addDays(issued, abDays);
        items.push({
          id: 'milestone-abatement',
          label: abatementFromCase
            ? 'Abatement deadline (on case)'
            : `Abatement period ends (${abDays} days from notice)`,
          date: abateDate,
          detail: abatementFromCase
            ? 'Stored on the case record'
            : `${abDays}-day period from town config for this violation category`,
          source: abatementFromCase ? 'case' : 'computed',
          variant: 'auto',
        });
      }
    }
  } else if (abatementFromCase && !hasAbatementDeadlineRow) {
    items.push({
      id: 'milestone-abatement-case',
      label: 'Abatement deadline (on case)',
      date: abatementFromCase,
      detail: 'Stored on the case record',
      source: 'case',
      variant: 'auto',
    });
  }

  const secondNov = datedNotices.find((x) => x.n.notice_type === 'second_nov');
  if (secondNov?.d) {
    items.push({
      id: 'milestone-second-nov',
      label: 'Second notice issued',
      date: secondNov.d,
      detail: 'Escalation notice on file',
      source: 'notice',
      variant: 'auto',
    });
  }

  const invSorted = [...(investigations || [])]
    .map((i) => ({
      i,
      d: parseDate(i.investigation_date) || parseDate(i.created_date),
    }))
    .filter((x) => x.d)
    .sort((a, b) => b.d - a.d);

  if (status === 'investigation' && invSorted[0]?.d) {
    items.push({
      id: 'milestone-followup-inv',
      label: 'Suggested: follow-up site check',
      date: addDays(invSorted[0].d, 14),
      detail: 'If the violation persists, document and move toward formal notice',
      source: 'computed',
      variant: 'auto',
    });
  }

  for (const d of deadlines || []) {
    const dt = parseDate(d.due_date);
    if (!dt) continue;
    items.push({
      id: `deadline-${d.id}`,
      label: deadlineLabel(d),
      date: dt,
      detail: d.is_completed
        ? `Completed${d.completed_date ? ` ${d.completed_date}` : ''}`
        : d.priority && d.priority !== 'medium'
          ? `Priority: ${d.priority}`
          : undefined,
      source: 'deadline',
      completed: !!d.is_completed,
      variant: 'recorded',
    });
  }

  const seen = new Set();
  const deduped = [];
  for (const it of items) {
    const key = `${it.label}|${it.date.getTime()}|${it.variant}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  deduped.sort((a, b) => a.date - b.date);

  return deduped.map((it) => {
    const days = differenceInCalendarDays(it.date, today);
    let urgency = 'upcoming';
    if (it.completed) urgency = 'done';
    else if (days < 0) urgency = 'overdue';
    else if (days <= 7) urgency = 'soon';
    return { ...it, urgency, daysFromToday: days };
  });
}
