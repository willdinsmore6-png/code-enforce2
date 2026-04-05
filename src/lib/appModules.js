/** High-level workspaces — staff switch fluidly without leaving one app shell. */

export const WORKSPACE = {
  enforcement: {
    id: 'enforcement',
    label: 'Code enforcement',
    shortLabel: 'Enforcement',
    homePath: '/',
  },
  building: {
    id: 'building',
    label: 'Building & permits',
    shortLabel: 'Building',
    homePath: '/permits',
  },
  planning: {
    id: 'planning',
    label: 'Planning & land use',
    shortLabel: 'Planning',
    homePath: '/land-use',
  },
};

/**
 * @param {string} pathname
 * @returns {keyof typeof WORKSPACE}
 */
export function workspaceIdForPath(pathname) {
  const p = pathname || '/';
  if (p.startsWith('/permits')) return 'building';
  if (p.startsWith('/land-use') || p.startsWith('/zoning-determinations')) return 'planning';
  return 'enforcement';
}

export function workspaceList() {
  return [WORKSPACE.enforcement, WORKSPACE.building, WORKSPACE.planning];
}
