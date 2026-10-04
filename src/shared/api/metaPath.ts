// The v2 contract is served under /api/v2. VITE_BASE_URL is the host root, the /api prefix of a
// reverse proxy, or already the /api/v2 root, so the path to append differs.
export const getMetaPath = (baseUrl: string | undefined) => {
  const base = (baseUrl ?? '').split(/[?#]/)[0];
  let end = base.length;
  while (end > 0 && base[end - 1] === '/') end -= 1;
  const path = base.slice(0, end);
  if (path.endsWith('/api/v2')) return '/meta';
  if (path.endsWith('/api')) return '/v2/meta';
  return '/api/v2/meta';
};