export type AccountRole = 'homeowner' | 'installer';

export function isAccountRole(value: unknown): value is AccountRole {
  return value === 'homeowner' || value === 'installer';
}

export function pairPayload(role: AccountRole, id: string, secret: string): string {
  return `khomeeasy-pair:v1:${role}:${id}:${secret}`;
}

export function parsePairPayload(value: string): { role: AccountRole; id: string; secret: string } | null {
  const parts = value.trim().split(':');
  if (parts.length !== 5 || parts[0] !== 'khomeeasy-pair' || parts[1] !== 'v1') {
    return null;
  }
  const role = parts[2];
  const id = parts[3];
  const secret = parts[4];
  if (!isAccountRole(role) || !id || !secret) {
    return null;
  }
  return { role, id, secret };
}
