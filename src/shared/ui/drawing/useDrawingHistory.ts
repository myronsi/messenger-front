import { useCallback, useState } from 'react';
import type { DrawingItem } from './model';

interface History {
  past: DrawingItem[][];
  present: DrawingItem[];
  future: DrawingItem[][];
}

export function useDrawingHistory(initial: readonly DrawingItem[] = []) {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: [...initial], future: [] }));
  const commit = useCallback((next: DrawingItem[]) => {
    setHistory((current) => (next === current.present ? current : { past: [...current.past, current.present], present: next, future: [] }));
  }, []);
  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past[current.past.length - 1];
      if (!previous) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
    });
  }, []);
  const redo = useCallback(() => {
    setHistory((current) => {
      const [next, ...rest] = current.future;
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: rest };
    });
  }, []);
  return {
    items: history.present,
    commit,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
