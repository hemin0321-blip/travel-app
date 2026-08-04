export function isTokenExpired(expiresAtMs: number, nowMs: number): boolean {
  return nowMs >= expiresAtMs;
}
