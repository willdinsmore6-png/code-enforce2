/**
 * Typical residential/commercial inspection stages — towns enable subsets via TownConfig (future).
 * Labels are end-user facing; `id` is stable for stored checklists on permits.
 */
export const DEFAULT_INSPECTION_STAGE_PRESETS = [
  { id: 'footing', label: 'Footing' },
  { id: 'foundation_wall', label: 'Foundation wall' },
  { id: 'foundation_backfill_sealant_drainage', label: 'Foundation backfill / sealant / drainage' },
  { id: 'rough_framing', label: 'Rough framing' },
  { id: 'rough_electrical', label: 'Rough electrical' },
  { id: 'rough_plumbing', label: 'Rough plumbing' },
  { id: 'rough_mechanical', label: 'Rough mechanical' },
  { id: 'rough_gas', label: 'Rough gas' },
  { id: 'thermal_envelope', label: 'Thermal envelope' },
  { id: 'drywall', label: 'Drywall' },
  { id: 'final_building', label: 'Final building' },
  { id: 'final_electrical', label: 'Final electrical' },
  { id: 'final_plumbing', label: 'Final plumbing' },
  { id: 'final_mechanical', label: 'Final mechanical' },
  { id: 'final_fire', label: 'Final fire / life safety' },
];
