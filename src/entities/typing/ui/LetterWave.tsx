import type { ReactNode } from 'react';
import { splitEmoji } from '@/shared/lib/customEmoji';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';

export type LetterWaveMode = 'wave' | 'ripple' | 'sweep';

type GraphemeSegmenter = new (locale?: string, options?: { granularity: 'grapheme' }) => {
  segment: (text: string) => Iterable<{ segment: string }>;
};

const Segmenter = (Intl as unknown as { Segmenter?: GraphemeSegmenter }).Segmenter;
const segmenter = Segmenter ? new Segmenter(undefined, { granularity: 'grapheme' }) : null;
const graphemes = (text: string) => (segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text));

const STEP_S = 0.08;
const SPREAD_S = 1.2;

interface LetterWaveProps {
  text: string;
  mode: LetterWaveMode;
  className?: string;
}

export const LetterWave = ({ text, mode, className }: LetterWaveProps) => {
  const units = splitEmoji(text).flatMap<ReactNode>(part => (part.kind === 'emoji'
    ? [<CustomEmoji id={part.token.id} shortcode={part.token.shortcode} />]
    : graphemes(part.text)));
  const step = Math.min(STEP_S, SPREAD_S / Math.max(units.length, 1));
  return (
    <span data-testid="typing-label" className={`letter-wave letter-wave-${mode}${className ? ` ${className}` : ''}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {units.map((unit, index) => (
          <span key={index} className="letter-wave-unit" style={{ animationDelay: `${(index * step).toFixed(2)}s` }}>{unit}</span>
        ))}
      </span>
    </span>
  );
};
