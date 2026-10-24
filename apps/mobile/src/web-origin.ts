export const productionWebOrigin = 'https://khomeeasy.qianjia.com';

/** Release builds must reach the public site. A missing or LAN origin cannot be used from the phone. */
export function resolveWebOrigin(configured: string | undefined | null): string {
  const value = (configured ?? '').trim().replace(/\/$/, '');
  if (!value) {
    return productionWebOrigin;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return productionWebOrigin;
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (url.protocol !== 'https:' || isLocalHost(host)) {
    return productionWebOrigin;
  }
  return url.origin;
}

function isLocalHost(host: string): boolean {
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host.endsWith('.local') || host.endsWith('.lan')) {
    return true;
  }
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) {
    return false;
  }
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) {
    return true;
  }
  const a = parts[0] ?? 0;
  const b = parts[1] ?? 0;
  if (a === 10 || a === 127 || (a === 192 && b === 168) || (a === 169 && b === 254)) {
    return true;
  }
  return a === 172 && b >= 16 && b <= 31;
}
