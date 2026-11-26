import React, { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/utils';
import type { VideoFeed } from '../model/videoStore';

interface VideoViewProps {
  feed: VideoFeed;
  fit?: 'cover' | 'contain';
  className?: string;
}

const VideoView: React.FC<VideoViewProps> = ({ feed, fit = 'cover', className }) => {
  const element = useRef<HTMLVideoElement | null>(null);
  const { handle } = feed;

  useEffect(() => {
    const video = element.current;
    if (!video) return undefined;
    handle.attach(video);
    return () => { handle.detach(video); };
  }, [handle]);

  return (
    <video ref={element} autoPlay playsInline muted data-video-source={feed.source} data-local={feed.local || undefined}
      className={cn('h-full w-full bg-black', fit === 'cover' ? 'object-cover' : 'object-contain', feed.mirrored && '-scale-x-100', className)} />
  );
};

export default VideoView;
