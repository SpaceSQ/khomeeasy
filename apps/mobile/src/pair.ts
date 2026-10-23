export type AccountRole = 'homeowner' | 'installer';

export function parsePairPayload(value: string): { role: AccountRole; id: string; secret: string } | null {
  const parts = value.trim().split(':');
  if (parts.length !== 5 || parts[0] !== 'khomeeasy-pair' || parts[1] !== 'v1') {
    return null;
  }
  const role = parts[2];
  const id = parts[3];
  const secret = parts[4];
  if ((role !== 'homeowner' && role !== 'installer') || !id || !secret) {
    return null;
  }
  return { role, id, secret };
}
