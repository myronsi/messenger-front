export const fillTemplate = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (placeholder, key: string) => (Object.prototype.hasOwnProperty.call(values, key) ? values[key] : placeholder));
