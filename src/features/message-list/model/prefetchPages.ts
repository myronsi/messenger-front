export const PREFETCH_SCREENS = 2;

interface PagingState {
  hasMoreMessages: boolean;
  isLoadingOlderMessages: boolean;
  onLoadOlderMessages?: () => Promise<void>;
  hasMoreNewerMessages: boolean;
  isLoadingNewerMessages: boolean;
  onLoadNewerMessages?: () => Promise<void>;
}

export const prefetchPages = (container: HTMLElement, paging: PagingState) => {
  const ahead = container.clientHeight * PREFETCH_SCREENS;
  const belowView = container.scrollHeight - container.scrollTop - container.clientHeight;
  if (container.scrollTop <= ahead && paging.hasMoreMessages && !paging.isLoadingOlderMessages) void paging.onLoadOlderMessages?.();
  if (belowView <= ahead && paging.hasMoreNewerMessages && !paging.isLoadingNewerMessages) void paging.onLoadNewerMessages?.();
};
