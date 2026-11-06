export const recoveryKeyGroups = (recoveryKey: string) => {
  const trimmed = recoveryKey.trim();
  if (trimmed.includes('-')) return trimmed.split('-').filter(Boolean);
  const compact = trimmed.replace(/\s/g, '');
  return compact.match(/.{1,4}/g) ?? [];
};
