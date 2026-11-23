export const fillPercent = (template: string | undefined, progress: number) =>
  (template || '{percent}%').replace('{percent}', String(Math.round(progress)));
