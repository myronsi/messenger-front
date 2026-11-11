import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import { LINE_HEIGHT, MAX_DRAWING_TEXT, textLines } from './model';
import type { TextGrabHandlers } from './useTextGrab';

const CARET_WIDTH = 1;

interface InlineTextEditorProps {
  x: number;
  y: number;
  value: string;
  color: string;
  fontSize: number;
  zoom: number;
  label: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  fieldRef?: RefObject<HTMLTextAreaElement | null>;
  grab?: TextGrabHandlers;
}

export function InlineTextEditor({ x, y, value, color, fontSize, zoom, label, onChange, onCommit, onCancel, fieldRef: outerRef, grab }: InlineTextEditorProps) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const fieldRef = outerRef ?? innerRef;
  const [caret, setCaret] = useState<number | null>(value.length);
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  }, [fieldRef]);
  const lines = textLines(value);
  const longest = Math.max(1, ...lines.map((line) => [...line].length));
  const trackCaret = () => {
    const field = fieldRef.current;
    setCaret(field && document.activeElement === field && field.selectionStart === field.selectionEnd ? field.selectionStart : null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };
  const text: CSSProperties = {
    left: `${x * 100}%`, top: `${y * 100}%`, fontSize, lineHeight: LINE_HEIGHT, width: `${longest * 0.62 + 0.6}em`,
    marginTop: `${-(LINE_HEIGHT - 1) / 2}em`,
  };
  return (
    <>
      <textarea ref={fieldRef} data-testid="drawing-text-field" aria-label={label} value={value} maxLength={MAX_DRAWING_TEXT}
        rows={lines.length} wrap="off" spellCheck={false}
        onChange={(event) => { onChange(event.target.value); trackCaret(); }} onKeyDown={onKeyDown}
        onSelect={trackCaret} onKeyUp={trackCaret} onFocus={trackCaret} onBlur={() => setCaret(null)}
        onPointerDown={(event) => event.stopPropagation()} {...grab}
        className="absolute m-0 resize-none overflow-hidden whitespace-pre border-0 bg-transparent p-0 font-semibold outline-none"
        style={{ ...text, color: 'transparent', caretColor: 'transparent', touchAction: grab ? 'none' : undefined }} />
      {caret !== null && (
        <div aria-hidden="true" className="pointer-events-none absolute whitespace-pre font-semibold text-transparent" style={text}>
          {value.slice(0, caret)}
          <span key={`${caret}:${value.length}`} data-testid="drawing-caret" className="motion-drawing-caret inline-block align-top"
            style={{ width: CARET_WIDTH / zoom, height: '1em', marginInline: -CARET_WIDTH / zoom / 2, marginTop: `${(LINE_HEIGHT - 1) / 2}em`, backgroundColor: color,
              boxShadow: `0 0 0 ${0.5 / zoom}px rgba(0,0,0,0.25)` }} />
        </div>
      )}
    </>
  );
}
