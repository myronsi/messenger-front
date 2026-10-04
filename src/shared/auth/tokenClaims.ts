const readClaims = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + (4 - normalizedPayload.length % 4) % 4, '=');
    return JSON.parse(atob(paddedPayload));
  } catch {
    return null;
  }
};

export const getTokenExpiresAt = (token: string) => {
  const exp = readClaims(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
};

// The account an access token belongs to (the `sub` claim), or null for a missing or unreadable token.
export const getTokenSubject = (token: string | null | undefined) => {
  if (!token) return null;
  const sub = readClaims(token)?.sub;
  return typeof sub === 'string' || typeof sub === 'number' ? String(sub) : null;
};