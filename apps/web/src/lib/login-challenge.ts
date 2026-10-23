import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { isAccountRole, type AccountRole } from './login-pair';

export type { AccountRole };
export { isAccountRole };

export function createPairSecret(): string {
  return randomBytes(24).toString('base64url');
}

export function hashPairSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function secretsMatch(secret: string, secretHash: string): boolean {
  const actual = Buffer.from(hashPairSecret(secret));
  const expected = Buffer.from(secretHash);
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}
