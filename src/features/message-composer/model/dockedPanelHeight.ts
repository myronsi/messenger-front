const CLOSE_PULL = 80;
const EXPANDED_RATIO = 0.75;

export const expandedPanelHeight = (baseHeight: number) => Math.max(baseHeight, Math.round(window.innerHeight * EXPANDED_RATIO));

export const settlePanelHeight = (height: number, baseHeight: number, expandedHeight: number) => {
  if (height < baseHeight - CLOSE_PULL) return null;
  return height > (baseHeight + expandedHeight) / 2 ? expandedHeight : baseHeight;
};
