import type { DateOrder } from '../model/types';

const SPACE = String.raw`[\s\u202f\u00a0]`;
const DATE = String.raw`(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})\.?`;
const TIME = String.raw`(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?(?:${SPACE}*([ap]\.?${SPACE}?m\.?|vorm\.|nachm\.|ДП|ПП))?`;
const IOS_HEADER = new RegExp(String.raw`^\[${DATE},?${SPACE}+${TIME}\]${SPACE}?(.*)$`, 'iu');
const ANDROID_HEADER = new RegExp(String.raw`^${DATE},?${SPACE}+${TIME}${SPACE}+[-–]${SPACE}+(.*)$`, 'iu');
const LEADING_MARKS = /^[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]+/;
const SENDER = /^([^:\n]{1,100}?):[\s\u202f\u00a0](.*)$/su;

export interface RawLine {
  parts: [number, number, number];
  yearFirst: boolean;
  hour: number;
  minute: number;
  second: number;
  meridiem: 'am' | 'pm' | null;
  sender: string | null;
  text: string;
  platform: 'ios' | 'android';
}

const meridiemOf = (value: string | undefined): RawLine['meridiem'] => {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith('p') || lower === 'nachm.' || lower === 'пп') return 'pm';
  return 'am';
};

const headerOf = (line: string): RawLine | null => {
  const stripped = line.replace(LEADING_MARKS, '');
  const ios = IOS_HEADER.exec(stripped);
  const match = ios ?? ANDROID_HEADER.exec(stripped);
  if (!match) return null;
  const [, a, b, c, hour, minute, second, meridiem, rest] = match;
  const sender = ios || !rest.startsWith('\u200e') ? SENDER.exec(rest) : null;
  return {
    parts: [Number(a), Number(b), Number(c)],
    yearFirst: a.length === 4,
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second ?? 0),
    meridiem: meridiemOf(meridiem),
    sender: sender ? sender[1] : null,
    text: sender ? sender[2] : rest,
    platform: ios ? 'ios' : 'android',
  };
};

export const scanLines = (content: string): RawLine[] => {
  const lines: RawLine[] = [];
  for (const line of content.replace(/^\ufeff/, '').split(/\r\n|\n|\r/)) {
    const header = headerOf(line);
    if (header) lines.push(header);
    else if (lines.length) lines[lines.length - 1].text += `\n${line}`;
  }
  for (const line of lines) line.text = line.text.replace(/\s+$/u, '');
  return lines;
};

export const guessDateOrder = (lines: readonly RawLine[], fallback: DateOrder): { order: DateOrder; certain: boolean } => {
  let dayFirst = false;
  let monthFirst = false;
  for (const line of lines) {
    if (line.yearFirst) continue;
    if (line.parts[0] > 12) dayFirst = true;
    if (line.parts[1] > 12) monthFirst = true;
  }
  if (dayFirst !== monthFirst) return { order: dayFirst ? 'dmy' : 'mdy', certain: true };
  if (lines.length > 0 && lines.every((line) => line.yearFirst)) return { order: fallback, certain: true };
  return { order: fallback, certain: false };
};

const fullYear = (year: number) => (year < 100 ? 2000 + year : year);

const hour24 = (line: RawLine) => {
  if (!line.meridiem) return line.hour;
  const base = line.hour % 12;
  return line.meridiem === 'pm' ? base + 12 : base;
};

export const lineDate = (line: RawLine, order: DateOrder) => {
  const [a, b, c] = line.parts;
  const [year, month, day] = line.yearFirst ? [a, b, c] : [fullYear(c), order === 'dmy' ? b : a, order === 'dmy' ? a : b];
  const date = new Date(year, month - 1, day, hour24(line), line.minute, line.second);
  const valid = date.getMonth() === month - 1 && date.getDate() === day && !Number.isNaN(date.getTime());
  return valid ? date.toISOString() : null;
};
