import { useState } from 'react';
import { letterAvatar } from '@/shared/lib/letterAvatar';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';

export const PublicAvatar = ({ src, name, className }: { src?: string | null; name: string; className?: string }) => {
  const [broken, setBroken] = useState<string | null>(null);
  const url = src && broken !== src ? resolveMediaUrl(src) : letterAvatar(name);
  return <img src={url} alt={name} data-public-avatar={src || undefined} className={className} onError={() => setBroken(src ?? null)} />;
};
