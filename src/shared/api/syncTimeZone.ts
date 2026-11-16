import { apiClient } from './client';

let sent: string | null = null;

export const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

export const syncTimeZone = async (stored?: string | null) => {
  const zone = deviceTimeZone();
  if (!zone || zone === stored || zone === sent) return false;
  sent = zone;
  try {
    const { error } = await apiClient.PATCH('/me', { body: { time_zone: zone } });
    return !error;
  } catch {
    return false;
  }
};

export const resetTimeZoneSync = () => {
  sent = null;
};
