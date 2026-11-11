const ANCHOR_ROWS = 4;

export interface RowLayout {
  rows: HTMLElement[];
  bottoms: number[];
}

export type AnchorResult = 'kept' | 'lost';

export const EMPTY_LAYOUT: RowLayout = { rows: [], bottoms: [] };

const contentOrigin = (container: HTMLElement) => container.getBoundingClientRect().top - container.scrollTop;

export const measureRowLayout = (container: HTMLElement, rows: HTMLElement[]): RowLayout => {
  const origin = contentOrigin(container);
  return { rows, bottoms: rows.map((row) => row.getBoundingClientRect().bottom - origin) };
};

const firstBelow = (values: number[], limit: number) => {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (values[middle] > limit) high = middle;
    else low = middle + 1;
  }
  return low;
};

export const keepRowsInPlace = (container: HTMLElement, layout: RowLayout): AnchorResult | null => {
  const start = firstBelow(layout.bottoms, container.scrollTop);
  const end = Math.min(start + ANCHOR_ROWS, layout.rows.length);
  if (start >= end) return null;
  const origin = contentOrigin(container);
  for (let index = start; index < end; index += 1) {
    const row = layout.rows[index];
    if (!row.isConnected) continue;
    const shift = row.getBoundingClientRect().bottom - origin - layout.bottoms[index];
    if (Math.abs(shift) >= 0.5) container.scrollTop += shift;
    return 'kept';
  }
  return 'lost';
};
