const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALPHABET = LOWER + UPPER + DIGITS;

const GROUPS = 4;
const GROUP_SIZE = 5;

type RandomSource = (values: Uint32Array) => Uint32Array;

const defaultRandom: RandomSource = (values) => crypto.getRandomValues(values);

const pickIndex = (size: number, random: RandomSource) => {
  const limit = Math.floor(0x1_0000_0000 / size) * size;
  const buffer = new Uint32Array(1);
  for (;;) {
    const [value] = random(buffer);
    if (value < limit) return value % size;
  }
};

const hasEveryKind = (value: string) => [LOWER, UPPER, DIGITS].every((set) => [...value].some((char) => set.includes(char)));

export const generatePassword = (random: RandomSource = defaultRandom): string => {
  for (;;) {
    const chars = Array.from({ length: GROUPS * GROUP_SIZE }, () => ALPHABET[pickIndex(ALPHABET.length, random)]);
    const password = Array.from({ length: GROUPS }, (_, group) => chars.slice(group * GROUP_SIZE, (group + 1) * GROUP_SIZE).join('')).join('-');
    if (hasEveryKind(password)) return password;
  }
};
