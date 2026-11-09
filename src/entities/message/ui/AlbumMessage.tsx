import { useMemo, useState } from 'react';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { ImageViewer, type ViewerImage, type ViewerImageInfo } from '@/shared/ui/image-viewer';
import type { MessageAttachment } from '../model/types';
import { isVideoAttachment } from '../model/videoAttachment';
import MediaTile from './MediaTile';

const ROW_SIZES: Record<number, number[]> = {
  2: [2], 3: [1, 2], 4: [1, 3], 5: [2, 3], 6: [3, 3], 7: [1, 3, 3], 8: [2, 3, 3], 9: [3, 3, 3], 10: [1, 3, 3, 3],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ratioOf = (item: MessageAttachment) => (
  item.image_width && item.image_height ? clamp(item.image_width / item.image_height, 0.6, 1.9) : 1
);

function albumRows<T>(items: T[]): T[][] {
  const sizes = ROW_SIZES[items.length] ?? Array.from({ length: Math.ceil(items.length / 3) }, () => 3);
  let start = 0;
  return sizes.map((size) => items.slice(start, (start += size))).filter((row) => row.length);
}

const rowAspect = (ratios: number[]) => {
  const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
  return ratios.length === 1 ? clamp(total, 1.25, 2) : clamp(total, Math.max(1.2, ratios.length * 0.8), ratios.length * 1.8);
};

interface AlbumMessageProps {
  items: MessageAttachment[];
  viewerInfo: ViewerImageInfo;
}

export default function AlbumMessage({ items, viewerInfo }: AlbumMessageProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const media = useMemo(() => items.map((item, index) => ({
    index,
    ratio: ratioOf(item),
    isVideo: isVideoAttachment(item),
    url: resolveMediaUrl(item.file_url),
    poster: item.thumbnail_url ? resolveMediaUrl(item.thumbnail_url) : undefined,
    name: item.file_name,
  })), [items]);
  const viewerItems = useMemo<ViewerImage[]>(() => media.map((item) => ({
    url: item.url, name: item.name, previewUrl: item.poster, isVideo: item.isVideo, info: viewerInfo,
  })), [media, viewerInfo]);

  return (
    <div data-testid="message-album" className="flex w-[20rem] max-w-full flex-col gap-0.5 overflow-hidden rounded-2xl">
      {albumRows(media).map((row) => (
        <div key={row[0].index} className="flex gap-0.5" style={{ aspectRatio: rowAspect(row.map((item) => item.ratio)) }}>
          {row.map((item) => (
            <MediaTile key={`${item.url}-${item.index}`} url={item.url} poster={item.poster} name={item.name} isVideo={item.isVideo}
              badge={row.length > 2 ? 'sm' : 'md'} className="h-full" style={{ flex: `${item.ratio} 1 0%` }}
              onOpen={() => setOpenIndex(item.index)} />
          ))}
        </div>
      ))}
      {openIndex !== null && <ImageViewer images={viewerItems} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />}
    </div>
  );
}
