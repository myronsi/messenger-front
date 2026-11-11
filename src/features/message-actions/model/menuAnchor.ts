const EDGE = 8;
const REACTION_GAP = 45;
const WIDEST_MENU = 232;

export interface MessageMenuPlacement {
  reaction: { x: number; y: number };
  context: { x: number; y: number };
  openLeft: boolean;
}

export const messageMenuPlacement = (pointer: { clientX: number; clientY: number }): MessageMenuPlacement => ({
  reaction: { x: pointer.clientX, y: Math.max(EDGE, pointer.clientY - REACTION_GAP) },
  context: { x: pointer.clientX, y: pointer.clientY },
  openLeft: pointer.clientX + WIDEST_MENU + EDGE > window.innerWidth,
});
