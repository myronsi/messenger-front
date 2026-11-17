import { useEffect, useState } from 'react';
import { audioPosition, useAudioPlayer } from '@/entities/message';

export const useAudioTime = () => {
  const ticking = useAudioPlayer((player) => player.playing);
  const time = useAudioPlayer((player) => player.time);
  const [smooth, setSmooth] = useState<number | null>(null);

  useEffect(() => {
    if (!ticking) {
      setSmooth(null);
      return undefined;
    }
    let frame = requestAnimationFrame(function tick() {
      setSmooth(audioPosition());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [ticking]);

  return smooth ?? time;
};
