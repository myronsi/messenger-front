import { useCallback, useEffect, useState } from 'react';
import type { Drawing } from '@/shared/ui/drawing';

export interface FileDrawing {
  drawing: Drawing;
  aspect: number;
}

export type FileDrawings = ReadonlyMap<File, FileDrawing>;

export function useFileDrawings(files: readonly File[]) {
  const [drawings, setDrawings] = useState<FileDrawings>(() => new Map());
  useEffect(() => {
    setDrawings((current) => {
      const kept = [...current].filter(([file]) => files.includes(file));
      return kept.length === current.size ? current : new Map(kept);
    });
  }, [files]);
  const setDrawing = useCallback((file: File, value: FileDrawing | null) => {
    setDrawings((current) => {
      const next = new Map(current);
      if (value) next.set(file, value);
      else next.delete(file);
      return next;
    });
  }, []);
  const drawingsOf = useCallback((list: readonly File[]) => list.map((file) => drawings.get(file)?.drawing), [drawings]);
  return { drawings, setDrawing, drawingsOf };
}
