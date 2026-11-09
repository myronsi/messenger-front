import { useState } from 'react';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { ImageViewer, type ViewerImageInfo } from '@/shared/ui/image-viewer';
import type { MessageAttachment } from '../model/types';
import { isVideoAttachment } from '../model/videoAttachment';
import { VideoViewer } from './VideoMessage';
import VideoThumbnail from './VideoThumbnail';

function mosaicSpan(count: number, index: number) {
  if (count === 2) return index === 0 ? 'col-span-4' : 'col-span-2';
  if (count === 4) return index === 0 ? 'col-span-6 row-span-2' : 'col-span-2';
  if (index === 0) return 'col-span-4 row-span-2';
  if (index <= 2) return 'col-span-2';
  return index === count - 1 && count % 2 === 0 ? 'col-span-6' : 'col-span-3';
}

function mosaicRatio(count: number) {
  const rows = count === 2 ? 1 : count === 4 ? 3 : 2 + Math.ceil((count - 3) / 2);
  return count === 2 ? '2 / 1' : `16 / ${rows * 5}`;
}

interface AlbumMessageProps {
  items: MessageAttachment[];
  viewerInfo: ViewerImageInfo;
}

export default function AlbumMessage({ items, viewerInfo }: AlbumMessageProps) {
  const [imageIndex, setImageIndex] = useState<number | null>(null);
  const [videoIndex, setVideoIndex] = useState<number | null>(null);
  const video = videoIndex === null ? undefined : items[videoIndex];
  const images = items.filter(item => !isVideoAttachment(item));
  return (
    <div className="w-[24rem] max-w-full">
      <div className="grid auto-rows-fr grid-cols-6 gap-0.5 overflow-hidden rounded-2xl" style={{ aspectRatio: mosaicRatio(items.length) }}>
        {items.map((item, index) => {
          const span = mosaicSpan(items.length, index);
          const url = resolveMediaUrl(item.file_url);
          const poster = item.thumbnail_url ? resolveMediaUrl(item.thumbnail_url) : undefined;
          const key = `${item.file_url}-${index}`;
          return isVideoAttachment(item)
            ? <VideoThumbnail key={key} className={span} url={url} name={item.file_name} poster={poster} onOpen={() => setVideoIndex(index)} />
            : <button key={key} type="button" aria-label={item.file_name}
                className={`${span} group relative min-h-0 min-w-0 overflow-hidden bg-muted focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2`}
                onClick={event => { event.stopPropagation(); setImageIndex(images.indexOf(item)); }}>
                <AuthenticatedImage src={poster || url} fallbackSrc={poster ? url : undefined}
                  alt="" loading="lazy" decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
              </button>;
        })}
      </div>
      {video && <VideoViewer preview={{
        url: resolveMediaUrl(video.file_url), name: video.file_name,
        poster: video.thumbnail_url ? resolveMediaUrl(video.thumbnail_url) : undefined,
      }} onClose={() => setVideoIndex(null)} />}
      {imageIndex !== null && (
        <ImageViewer initialIndex={imageIndex} onClose={() => setImageIndex(null)}
          images={images.map(item => ({
            url: resolveMediaUrl(item.file_url),
            name: item.file_name,
            previewUrl: item.thumbnail_url ? resolveMediaUrl(item.thumbnail_url) : undefined,
            info: viewerInfo,
          }))} />
      )}
    </div>
  );
}
