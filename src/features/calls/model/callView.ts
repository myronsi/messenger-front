import { createStore } from './createStore';

export type CallViewMode = 'full' | 'mini';
export type CallCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface CallView {
  mode: CallViewMode;
  corner: CallCorner;
  stage: HTMLElement | null;
}

export interface BubbleBox {
  size: number;
  margin: number;
  top: number;
  bottom: number;
}

const CORNER_KEY = 'messenger:call-bubble-corner';
const corners: readonly CallCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export const bubbleBox: BubbleBox = { size: 64, margin: 16, top: 80, bottom: 96 };

const readCorner = (): CallCorner => {
  try {
    const saved = window.localStorage.getItem(CORNER_KEY);
    return corners.find((corner) => corner === saved) ?? 'bottom-right';
  } catch {
    return 'bottom-right';
  }
};

const saveCorner = (corner: CallCorner) => {
  try {
    window.localStorage.setItem(CORNER_KEY, corner);
  } catch {
    return;
  }
};

export const callViewStore = createStore<CallView>({ mode: 'full', corner: readCorner(), stage: null });

const patchView = (patch: Partial<CallView>) => callViewStore.update((view) => (
  Object.entries(patch).every(([key, value]) => view[key as keyof CallView] === value) ? view : { ...view, ...patch }
));

export const maximizeCall = () => patchView({ mode: 'full' });
export const minimizeCall = () => patchView({ mode: 'mini' });
export const setCallStage = (stage: HTMLElement | null) => patchView({ stage });

export const placeCallBubble = (corner: CallCorner) => {
  saveCorner(corner);
  patchView({ corner });
};

export const nearestCorner = (centerX: number, centerY: number, width: number, height: number): CallCorner => {
  const vertical = centerY < height / 2 ? 'top' : 'bottom';
  const horizontal = centerX < width / 2 ? 'left' : 'right';
  return `${vertical}-${horizontal}`;
};

export const cornerPosition = (corner: CallCorner, width: number, height: number, box: BubbleBox = bubbleBox) => {
  const maxLeft = Math.max(box.margin, width - box.size - box.margin);
  const maxTop = Math.max(box.margin, height - box.size - box.bottom);
  return {
    left: corner.endsWith('left') ? box.margin : maxLeft,
    top: corner.startsWith('top') ? Math.min(box.top, maxTop) : maxTop,
  };
};

export const shouldMinimizeOnChatChange = (previous: string | null, next: string | null, callChatId: string | null) => (
  next !== null && previous !== next && next !== callChatId
);

export const CALL_VIEW_MOTION_MS = 260;
export const CALL_VIEW_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export const bubbleMorph = (
  rect: { left: number; top: number; width: number; height: number }, corner: CallCorner, width: number, height: number, box: BubbleBox = bubbleBox,
) => {
  const spot = cornerPosition(corner, width, height, box);
  const centerX = spot.left + box.size / 2;
  const centerY = spot.top + box.size / 2;
  const originX = centerX - rect.left;
  const originY = centerY - rect.top;
  return { origin: `${originX}px ${originY}px`, originX, originY, scale: box.size / Math.max(rect.width, rect.height, 1) };
};

export interface CallViewDrag {
  offset: number;
  scale: number;
}

export const swipeDragScale = (offset: number, height: number) => Math.max(0.8, 1 - (offset / Math.max(1, height)) * 0.4);

export const swipeShouldMinimize = (offset: number, velocity: number, height: number) => (
  offset > Math.min(160, height * 0.22) || (offset > 40 && velocity > 0.6)
);

export const dragAsMorphStart = (drag: CallViewDrag, width: number, originX: number, originY: number) => {
  const pull = 1 - drag.scale;
  return `translate(${pull * (width / 2 - originX)}px, ${pull * -originY + drag.offset}px) scale(${drag.scale})`;
};
