import { useEffect, useState } from 'react';
import { audioPosition, useAudioPlayer } from '@/entities/message';

export const useAudioTime = () => {
  const ticking = useAudioPlayer((player) => player.playing);
  const time = useAudioPlayer((player) => player.time);
  const [, setFrame] = useState(0);

  useEffect(() => {
    if (!ticking) return undefined;
    let frame = requestAnimationFrame(function tick() {
      setFrame((count) => count + 1);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [ticking]);

  return ticking ? audioPosition() : time;
};
