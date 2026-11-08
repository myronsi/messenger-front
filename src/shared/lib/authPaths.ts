const AUTH_PATHS = ['/login', '/register', '/recover-username', '/recover-key', '/recover-email', '/recover-device', '/recover-parts'];

export const pathOutsideAuth = (pathname: string): string | null => {
  const match = AUTH_PATHS.find((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!match) return null;
  return pathname.slice(match.length) || '/';
};
