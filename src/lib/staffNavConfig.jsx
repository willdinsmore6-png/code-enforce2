import {
  LayoutDashboard,
  FileText,
  Search,
  CalendarClock,
  Scale,
  ScrollText,
  FolderOpen,
  BookOpen,
  Globe,
  Plus,
  Sparkles,
  ClipboardList,
  Hammer,
  MapPin,
  Shield,
} from 'lucide-react';
import { MERIDIAN_DISPLAY_NAME } from '@/lib/meridianAssistant';

/**
 * Grouped navigation for sidebar and mobile drawer (single source of truth).
 * @type {Array<{ id: string, label: string, items: Array<{ path: string, icon: import('lucide-react').LucideIcon, label: string }> }>}
 */
export const STAFF_NAV_GROUPS = [
  {
    id: 'enforcement',
    label: 'Code enforcement',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/cases', icon: FileText, label: 'Cases' },
      { path: '/new-complaint', icon: Plus, label: 'New complaint' },
      { path: '/investigations', icon: Search, label: 'Investigations' },
      { path: '/deadlines', icon: CalendarClock, label: 'Timeline' },
      { path: '/court-actions', icon: Scale, label: 'Court actions' },
      { path: '/documents', icon: FolderOpen, label: 'Document vault' },
      { path: '/property-workspace', icon: MapPin, label: 'Property workspace' },
    ],
  },
  {
    id: 'building',
    label: 'Building & permits',
    items: [{ path: '/permits', icon: Hammer, label: 'Permits & inspections' }],
  },
  {
    id: 'planning',
    label: 'Planning & land use',
    items: [
      { path: '/land-use', icon: ClipboardList, label: 'Land use applications' },
      { path: '/zoning-determinations', icon: ScrollText, label: 'Zoning determinations' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { path: '/compass', icon: Sparkles, label: MERIDIAN_DISPLAY_NAME },
      { path: '/resources', icon: BookOpen, label: 'Resource library' },
      { path: '/public-portal', icon: Globe, label: 'Public portal' },
    ],
  },
];

export const ADMIN_NAV_ITEM = { path: '/admin', label: 'Admin tools' };
export const SUPERADMIN_NAV_ITEM = { path: '/superadmin', label: 'Global dashboard' };

/** Flat list for superadmin shell (no town context). */
export const SUPERADMIN_SHELL_ITEMS = [{ path: '/superadmin', icon: Shield, label: 'Global dashboard' }];
