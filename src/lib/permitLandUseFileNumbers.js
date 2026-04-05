/** @param {string} prefix e.g. 'BP' or 'LU' */
export function nextAnnualFileNumber(existingRows, year, prefix) {
  const p = `${prefix}-${year}-`;
  let max = 0;
  for (const row of existingRows || []) {
    const n = row.file_number;
    if (typeof n === 'string' && n.startsWith(p)) {
      const num = parseInt(n.slice(p.length), 10);
      if (!Number.isNaN(num)) max = Math.max(max, num);
    }
  }
  return `${p}${String(max + 1).padStart(4, '0')}`;
}
