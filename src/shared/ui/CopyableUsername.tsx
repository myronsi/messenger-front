import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { copyText } from '@/shared/lib/copyText';

const COPIED_MS = 1500;

interface CopyableUsernameProps {
  username: string;
  className?: string;
}

const CopyableUsername: React.FC<CopyableUsernameProps> = ({ username, className = '' }) => {
  const { translations } = useLanguage();
  const [copied, setCopied] = useState(false);
  const handle = `@${username.replace(/^@/, '')}`;

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async event => {
        const button = event.currentTarget;
        const touchCopy = event.detail > 0 && (window.innerWidth < 768 || window.matchMedia?.('(pointer: coarse)').matches);
        setCopied(await copyText(handle));
        const selection = window.getSelection();
        if (selection?.anchorNode && button.contains(selection.anchorNode)) selection.removeAllRanges();
        if (touchCopy) button.blur();
      }}
      title={translations.copyUsername}
      aria-label={`${translations.copyUsername}: ${handle}`}
      className={`group inline-flex min-w-0 max-w-full touch-manipulation select-none items-center gap-1.5 rounded text-left font-medium text-foreground [@media(hover:hover)]:hover:text-primary ${className}`}
      style={{ WebkitTouchCallout: 'none' }}
    >
      <span className="truncate">{handle}</span>
      <span aria-hidden="true" className="relative h-3.5 w-3.5 shrink-0">
        <Check className={`absolute inset-0 h-3.5 w-3.5 text-success transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${copied ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
        <Copy className={`absolute inset-0 h-3.5 w-3.5 text-muted-foreground transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${copied ? 'scale-75 opacity-0' : 'scale-100 opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-visible:opacity-100'}`} />
      </span>
    </button>
  );
};

export default CopyableUsername;
