const EDGE = 8;
const REACTION_GAP = 45;
const BAR_GAP = 6;
const WIDEST_MENU = 232;

export interface MessageMenuPlacement {
  reaction: { x: number; y: number };
  context: { x: number; y: number };
  openLeft: boolean;
}

interface Box {
  top: number;
  left: number;
  right: number;
  width: number;
}

export const messageMenuPlacement = (pointer: { clientX: number; clientY: number }): MessageMenuPlacement => ({
  reaction: { x: pointer.clientX, y: Math.max(EDGE, pointer.clientY - REACTION_GAP) },
  context: { x: pointer.clientX, y: pointer.clientY },
  openLeft: pointer.clientX + WIDEST_MENU + EDGE > window.innerWidth,
});

export const reactionBarPosition = (menu: Box, bar: { width: number; height: number }, openLeft: boolean, viewportWidth = window.innerWidth) => {
  const left = openLeft ? menu.right - bar.width : menu.left;
  return {
    x: Math.max(EDGE, Math.min(left, viewportWidth - bar.width - EDGE)),
    y: Math.max(EDGE, menu.top - bar.height - BAR_GAP),
  };
};
