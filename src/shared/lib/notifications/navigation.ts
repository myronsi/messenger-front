const destination = (pathname: string, search: string) => {
  const params = new URLSearchParams(search);
  if (!/^\/chat\/[1-9]\d*$/.test(pathname) || params.get('notification') !== '1') return '/';
  return `${pathname}?notification=1${params.get('reply') === '1' ? '&reply=1' : ''}`;
};
export function notificationReturnPath(pathname: string, search: string, state?: unknown) {
  const direct = destination(pathname, search);
  if (direct !== '/') return direct;
  if (typeof state !== 'object' || state === null || !('notificationReturnPath' in state) || typeof state.notificationReturnPath !== 'string') return '/';
  const [savedPath, savedSearch = ''] = state.notificationReturnPath.split('?');
  return destination(savedPath, savedSearch);
}
