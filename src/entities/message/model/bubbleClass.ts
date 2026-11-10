interface BubbleOptions {
  isMine: boolean;
  showTail: boolean;
  isImage: boolean;
  isText: boolean;
  isSticker: boolean;
  hasReactions: boolean;
  deleting?: boolean;
}

const surface = ({ isMine, showTail, isSticker }: BubbleOptions) => {
  if (isSticker) return '';
  return isMine
    ? `bubble-out bg-primary text-primary-foreground${showTail ? ' message-tail-right' : ''}`
    : `bubble-in bg-accent text-accent-foreground${showTail ? ' message-tail-left' : ''}`;
};

const padding = ({ isMine, isImage, isText, isSticker }: BubbleOptions) => {
  if (isSticker) return 'p-0';
  const border = `border${isMine ? ' border-primary' : ' border-accent'}`;
  return isImage ? `p-0 ${border}` : `px-3 ${isText ? 'pt-0.5 pb-1.5' : 'py-1.5'} ${border}`;
};

export const bubbleClass = (options: BubbleOptions) => [
  'motion-message-bubble relative w-fit min-w-0 max-w-full rounded-bubble [overflow-wrap:anywhere]',
  options.deleting ? 'message-dissolve' : '',
  surface(options),
  padding(options),
  options.hasReactions ? (options.isImage ? 'mb-4' : 'mb-3.5') : '',
].filter(Boolean).join(' ');
