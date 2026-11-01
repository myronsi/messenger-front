const destination = (pathname: string, search: string) => (
  /^\/chat\/[1-9]\d*$/.test(pathname) && new URLSearchParams(search).get('notification') === '1'
    ? `${pathname}?notification=1` : '/'
);
export function notificationReturnPath(pathname: string, search: string, state?: unknown) {
  const direct = destination(pathname, search);
  if (direct !== '/') return direct;
  if (typeof state !== 'object' || state === null || !('notificationReturnPath' in state) || typeof state.notificationReturnPath !== 'string') return '/';
  const [savedPath, savedSearch = ''] = state.notificationReturnPath.split('?');
  return destination(savedPath, savedSearch);
}
