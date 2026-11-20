import type { ReactNode } from 'react';
import { openOwnLink } from '@/shared/lib/ownLink';
import { cn } from '@/shared/lib/utils';

export function MentionLink({ name, own, children }: { name: string; own: boolean; children: ReactNode }) {
  return (
    <a href={`/@${name}`} data-mention={name} data-own-mention={own || undefined}
      className={cn('font-medium text-inherit underline-offset-2 hover:underline', own && 'rounded bg-primary/20 px-0.5')}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); openOwnLink(`/@${name}`); }}>
      {children}
    </a>
  );
}
