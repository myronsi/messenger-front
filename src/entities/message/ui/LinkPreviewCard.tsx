import React, { useEffect, useRef, useState } from 'react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { isGoApi } from '@/shared/api/goSocket';
import { useGetLinkPreviewQuery } from '../api/linkPreviewApi';
import { ExternalLinkConfirm } from './ExternalLinkConfirm';

interface LinkPreviewCardProps {
  url: string;
  isMine: boolean;
}

const useNearViewport = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || near) return;
    if (!('IntersectionObserver' in window)) { setNear(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: '300px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);
  return { ref, near };
};

const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ url, isMine }) => {
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const { currentData: data } = useGetLinkPreviewQuery(url, { skip: !near || !isGoApi() });
  const [imageFailed, setImageFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const confirm = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setConfirming(true);
  };
  const image = data?.image && !imageFailed ? data.image : null;
  const large = !!image?.width && !!image.height && image.width >= 400 && image.width / image.height >= 1.3;
  const imageNode = (className: string) => image && (
    <AuthenticatedImage src={resolveMediaUrl(image.url)} alt="" draggable={false} onError={() => setImageFailed(true)} className={className} />
  );

  const visible = !!data && (!!data.title || !!image);

  return (
    <div ref={ref} className={visible ? 'max-w-full pb-[1.125rem] pt-1.5' : 'max-w-full'}>
      {data && visible && (
        <a
          ref={cardRef}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-preview"
          onClick={confirm}
          onAuxClick={(event) => { if (event.button === 1) confirm(event); }}
          className={`flex max-w-full flex-col overflow-hidden rounded-lg border-l-[3px] no-underline transition-colors ${
            isMine ? 'border-white/80 bg-white/15 hover:bg-white/20' : 'border-primary bg-primary/10 hover:bg-primary/15'
          }`}
        >
          {large && imageNode('max-h-48 w-full object-cover')}
          <span className="flex min-w-0 items-start gap-2 px-2 py-1.5">
            <span className="min-w-0 flex-1">
              {data.site_name && (
                <span className={`block truncate text-xs font-semibold ${isMine ? 'text-primary-foreground' : 'text-primary'}`}>{data.site_name}</span>
              )}
              {data.title && <span className="line-clamp-2 block text-sm font-semibold leading-snug">{data.title}</span>}
              {data.description && <span className="line-clamp-3 block text-xs leading-snug opacity-80">{data.description}</span>}
            </span>
            {!large && imageNode('h-14 w-14 shrink-0 rounded object-cover')}
          </span>
        </a>
      )}
      <ExternalLinkConfirm href={url} open={confirming} onOpenChange={setConfirming} trigger={cardRef} />
    </div>
  );
};

export default LinkPreviewCard;
