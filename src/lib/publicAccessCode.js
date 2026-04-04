/** Alphanumeric codes for public case lookup (avoid ambiguous I/O/0/1). */
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePublicAccessCode(length = 8) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}
