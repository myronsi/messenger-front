const EDGE = 8;
const REACTION_GAP = 45;
const WIDEST_MENU = 232;
const BUBBLE_SELECTOR = '.motion-message-bubble';

export interface MessageMenuPlacement {
  reaction: { x: number; y: number };
  context: { x: number; y: number };
  openLeft: boolean;
}

const bubbleTop = (row: Element | null | undefined) => {
  if (!row) return undefined;
  return (row.querySelector(BUBBLE_SELECTOR) ?? row).getBoundingClientRect().top;
};

export const messageMenuPlacement = (pointer: { clientX: number; clientY: number }, row?: Element | null): MessageMenuPlacement => {
  const top = bubbleTop(row);
  const reactionY = top !== undefined && top - REACTION_GAP >= EDGE ? top - REACTION_GAP : pointer.clientY - REACTION_GAP;
  return {
    reaction: { x: pointer.clientX, y: reactionY },
    context: { x: pointer.clientX, y: pointer.clientY },
    openLeft: pointer.clientX + WIDEST_MENU + EDGE > window.innerWidth,
  };
};
