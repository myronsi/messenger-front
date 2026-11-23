export const trimEndChars = (value: string, chars: string) => {
  let end = value.length;
  while (end > 0 && chars.includes(value[end - 1])) end -= 1;
  return value.slice(0, end);
};

export const trimChars = (value: string, chars: string) => {
  let start = 0;
  while (start < value.length && chars.includes(value[start])) start += 1;
  return trimEndChars(value.slice(start), chars);
};

export const trimLineEnds = (text: string, chars = ' \t') => text.split('\n').map((line) => (
  line.endsWith('\r') ? `${trimEndChars(line.slice(0, -1), chars)}\r` : trimEndChars(line, chars)
)).join('\n');
