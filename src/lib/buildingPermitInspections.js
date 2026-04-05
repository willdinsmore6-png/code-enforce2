import { DEFAULT_INSPECTION_STAGE_PRESETS } from '@/lib/inspectionChecklistPresets';

/** @returns {string} JSON for BuildingPermit.inspection_checklist_json */
export function initialInspectionChecklistJson() {
  const rows = DEFAULT_INSPECTION_STAGE_PRESETS.map((s) => ({
    id: s.id,
    label: s.label,
    status: 'pending',
    notes: '',
    inspected_at: '',
    inspected_by: '',
  }));
  return JSON.stringify(rows);
}

/** @returns {Array<{ id: string, label: string, status: string, notes: string, inspected_at: string, inspected_by: string }>} */
export function parseInspectionChecklistJson(raw) {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function stringifyInspectionChecklist(rows) {
  return JSON.stringify(rows);
}
