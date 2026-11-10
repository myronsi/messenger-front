export const insertAtCursor = (value: string, text: string, start: number, end: number) => ({
  value: value.slice(0, start) + text + value.slice(end),
  caret: start + text.length,
});
