import React, { useEffect, useRef, useState } from 'react';

const STEP_MS = 90;
const BAR_PITCH = 5;
const SILENT = 0.12;

type AudioContextWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

interface Bar {
  id: number;
  level: number;
}

const LiveWaveform: React.FC<{ stream: MediaStream | null; paused?: boolean }> = ({ stream, paused = false }) => {
  const [bars, setBars] = useState<Bar[]>([]);
  const nextIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const capacityRef = useRef(64);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const measure = () => { capacityRef.current = Math.max(8, Math.ceil(element.clientWidth / BAR_PITCH) + 1); };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!stream) return undefined;
    const Context = window.AudioContext || (window as AudioContextWindow).webkitAudioContext;
    if (!Context) return undefined;
    const context = new Context();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128));
      const level = Math.max(SILENT, Math.min(1, peak / 48));
      const id = nextIdRef.current++;
      setBars((current) => [...current, { id, level }].slice(-capacityRef.current));
    }, STEP_MS);
    return () => {
      window.clearInterval(timer);
      source.disconnect();
      void context.close().catch(() => undefined);
    };
  }, [stream]);

  const newest = bars[bars.length - 1]?.id;
  return (
    <div ref={containerRef} data-testid="live-waveform" aria-hidden="true" className="relative h-6 min-w-0 flex-1 overflow-hidden">
      <div key={newest} className="motion-wave-shift absolute inset-y-0 right-0 flex items-center gap-[2px]">
        {bars.map((bar) => (
          <span
            key={bar.id}
            className={`w-[3px] shrink-0 rounded-full bg-destructive ${bar.id === newest ? 'motion-wave-bar' : ''}`}
            style={{ height: `${Math.round(bar.level * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export default LiveWaveform;
