/** Refresh only when the access token has a real expiry and is about to lapse. */
export function shouldRefreshAccessToken(expiresAt: number | undefined, nowMs: number): boolean {
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt) || expiresAt <= 0) {
    return false;
  }
  return expiresAt * 1000 <= nowMs + 60_000;
}

export function accessTokenStillValid(expiresAt: number | undefined, nowMs: number): boolean {
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt) || expiresAt <= 0) {
    return true;
  }
  return expiresAt * 1000 > nowMs;
}

export function approveUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/login-challenges/approve`;
}
