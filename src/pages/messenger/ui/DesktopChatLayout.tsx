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

  const percentOf = (pixels: number) => pixels / Math.max(1, width - 1) * 100;
  const listMinSize = Math.min(40, percentOf(280));
  const listDefaultSize = Math.max(listMinSize, Math.min(30, percentOf(360)));

  return (
    <div ref={root} className="h-full min-w-0 flex-1">
      <ResizablePanelGroup direction="horizontal" autoSaveId="messenger-desktop-chat-layout-v2" keyboardResizeBy={2}>
        <ResizablePanel ref={listPanel} id="chat-list" order={1} defaultSize={listDefaultSize} minSize={listMinSize} maxSize={45}
          className="min-w-0 rounded-lg bg-background shadow-lg">
          {chatList}
        </ResizablePanel>
        <ResizableHandle aria-label={resizeLabel} title={resizeLabel}
          onDoubleClick={() => listPanel.current?.resize(listDefaultSize)}
          className="z-10 cursor-col-resize transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary" />
        <ResizablePanel id="active-chat" order={2} defaultSize={100 - listDefaultSize} minSize={55}
          className="min-w-0 overflow-hidden rounded-lg bg-background shadow-lg">
          {children}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
