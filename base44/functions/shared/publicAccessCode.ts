const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomPublicAccessCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

/** Allocate a code not already used on Case.public_access_code (best-effort uniqueness). */
export async function allocateUniquePublicAccessCode(
  base44: { asServiceRole: { entities: { Case: { filter: (q: object) => Promise<unknown[]> } } } },
  maxAttempts = 16
): Promise<string> {
  for (let a = 0; a < maxAttempts; a += 1) {
    const code = randomPublicAccessCode(8);
    const existing = await base44.asServiceRole.entities.Case.filter({ public_access_code: code });
    if (!existing?.length) return code;
  }
  throw new Error('Could not allocate a unique public access code');
}
