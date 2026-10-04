export interface ParsedVersion {
  numbers: [number, number, number];
  prerelease: string[];
}

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export const parseVersion = (value: unknown): ParsedVersion | null => {
  if (typeof value !== 'string') return null;
  const match = VERSION_PATTERN.exec(value.trim());
  if (!match) return null;
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split('.') : [],
  };
};

const comparePrerelease = (a: string[], b: string[]) => {
  // A version without a prerelease tag is newer than the same version with one.
  if (a.length === 0 || b.length === 0) return Math.sign(b.length - a.length);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index];
    const right = b[index];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const bothNumeric = /^\d+$/.test(left) && /^\d+$/.test(right);
    if (bothNumeric && Number(left) !== Number(right)) return Number(left) < Number(right) ? -1 : 1;
    if (!bothNumeric && left !== right) return left < right ? -1 : 1;
  }
  return 0;
};

// Returns null when either value is not a valid version, so callers can ignore data they cannot interpret.
export const compareVersions = (a: unknown, b: unknown): number | null => {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;
  for (let index = 0; index < 3; index += 1) {
    if (left.numbers[index] !== right.numbers[index]) return left.numbers[index] < right.numbers[index] ? -1 : 1;
  }
  return comparePrerelease(left.prerelease, right.prerelease);
};