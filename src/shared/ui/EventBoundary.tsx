import type { ReactNode, SyntheticEvent } from 'react';

const stop = (event: SyntheticEvent) => event.stopPropagation();

export const EventBoundary = ({ children }: { children: ReactNode }) => (
  <div className="contents" onClick={stop} onDoubleClick={stop} onContextMenu={stop} onPointerDown={stop} onPointerUp={stop}
    onMouseDown={stop} onMouseUp={stop} onTouchStart={stop} onTouchEnd={stop} onKeyDown={stop}>
    {children}
  </div>
);
