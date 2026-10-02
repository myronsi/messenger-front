// The backend treats curly braces as template markers, so outgoing text escapes them.
export const escapeCurlyBraces = (text: string) => text.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
export const unescapeCurlyBraces = (text: string) => text.replace(/\\{/g, '{').replace(/\\}/g, '}');