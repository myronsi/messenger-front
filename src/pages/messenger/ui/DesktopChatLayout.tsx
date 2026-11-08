import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/ui/resizable';

interface DesktopChatLayoutProps {
  chatList: ReactNode;
  children: ReactNode;
  resizeLabel: string;
}

export function DesktopChatLayout({ chatList, children, resizeLabel }: DesktopChatLayoutProps) {
  const root = useRef<HTMLDivElement>(null);
  const listPanel = useRef<ImperativePanelHandle>(null);
  const [width, setWidth] = useState(window.innerWidth);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => { if (element.clientWidth) setWidth(element.clientWidth); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} className="h-full min-w-0 flex-1">
      <ResizablePanelGroup direction="horizontal" autoSaveId="messenger-desktop-chat-layout" keyboardResizeBy={2}>
        <ResizablePanel ref={listPanel} id="chat-list" order={1} defaultSize={25}
          minSize={Math.min(45, 240 / Math.max(1, width - 1) * 100)} maxSize={45}
          className="min-w-0 rounded-lg bg-background shadow-lg">
          {chatList}
        </ResizablePanel>
        <ResizableHandle aria-label={resizeLabel} title={resizeLabel}
          onDoubleClick={() => listPanel.current?.resize(25)}
          className="z-10 cursor-col-resize transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary" />
        <ResizablePanel id="active-chat" order={2} defaultSize={75} minSize={55}
          className="min-w-0 overflow-hidden rounded-lg bg-background shadow-lg">
          {children}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
