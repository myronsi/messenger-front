const HOUR = 3_600_000;
const formatters = new Map<string, Intl.DateTimeFormat>();
const offsets = new Map<string, number>();

const formatterOf = (zone: string) => {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    formatters.set(zone, formatter);
  }
  return formatter;
};

const offsetAt = (zone: string, utc: number) => {
  const key = `${zone}|${Math.floor(utc / HOUR)}`;
  const cached = offsets.get(key);
  if (cached !== undefined) return cached;
  const parts = Object.fromEntries(formatterOf(zone).formatToParts(new Date(utc)).map((part) => [part.type, part.value]));
  const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
  const offset = wall - (utc - (((utc % 1000) + 1000) % 1000));
  offsets.set(key, offset);
  return offset;
};

export const zonedToUtc = (wall: number, zone: string) => wall - offsetAt(zone, wall - offsetAt(zone, wall));

export const isTimeZone = (zone: string) => {
  try {
    formatterOf(zone);
    return true;
  } catch {
    return false;
  }
};

export const browserTimeZone = () => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && isTimeZone(zone) ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
};

const supportedZones = () => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
};

export const timeZoneOptions = () => [...new Set([browserTimeZone(), 'UTC', ...supportedZones()])];
