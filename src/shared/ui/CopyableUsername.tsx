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
      onClick={async () => setCopied(await copyText(handle))}
      title={translations.copyUsername}
      aria-label={`${translations.copyUsername}: ${handle}`}
      className={`group inline-flex min-w-0 max-w-full items-center gap-1.5 rounded text-left font-medium text-gray-900 hover:text-primary ${className}`}
    >
      <span className="truncate">{handle}</span>
      {copied
        ? <Check className="h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden="true" />
        : <Copy className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />}
    </button>
  );
};

export default CopyableUsername;
