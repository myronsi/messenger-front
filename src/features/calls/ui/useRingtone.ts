import { useEffect } from 'react';

const RING_INTERVAL_MS = 3000;
let context: AudioContext | null = null;

const audioContext = () => {
  if (!context && typeof window !== 'undefined' && 'AudioContext' in window) context = new AudioContext();
  return context;
};

const ringOnce = (audio: AudioContext) => {
  [0, 0.45].forEach((offset) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + offset;
    oscillator.frequency.value = 480;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.4);
  });
};

export const useRingtone = (ringing: boolean) => {
  useEffect(() => {
    if (!ringing) return undefined;
    const resume = () => { void audioContext()?.resume().catch(() => undefined); };
    const ring = () => {
      const audio = audioContext();
      if (!audio || document.visibilityState !== 'visible') return;
      if (audio.state === 'suspended') resume();
      if (audio.state === 'running') ringOnce(audio);
    };
    ring();
    const timer = window.setInterval(ring, RING_INTERVAL_MS);
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, [ringing]);
};
