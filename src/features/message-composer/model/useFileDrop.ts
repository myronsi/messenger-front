import { RefObject, useEffect, useRef, useState } from 'react';

const hasFiles = (event: DragEvent) => !!event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files');

export const pastedFiles = (data: DataTransfer | null): File[] => {
  if (!data || Array.from(data.types).includes('text/plain')) return [];
  const fromItems = Array.from(data.items ?? []).filter((item) => item.kind === 'file').map((item) => item.getAsFile()).filter((file): file is File => !!file);
  return fromItems.length ? fromItems : Array.from(data.files ?? []);
};

export const useFileDrop = (anchorRef: RefObject<HTMLElement | null>, onFiles: (files: File[]) => void) => {
  const [zone, setZone] = useState<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const depthRef = useRef(0);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  useEffect(() => {
    const target = anchorRef.current?.closest<HTMLElement>('[data-chat-drop-zone]') || null;
    setZone(target);
    if (!target) return undefined;
    const reset = () => {
      depthRef.current = 0;
      setIsDragging(false);
    };
    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depthRef.current += 1;
      setIsDragging(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) setIsDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      reset();
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length) onFilesRef.current(files);
    };
    target.addEventListener('dragenter', onDragEnter);
    target.addEventListener('dragover', onDragOver);
    target.addEventListener('dragleave', onDragLeave);
    target.addEventListener('drop', onDrop);
    window.addEventListener('dragend', reset);
    return () => {
      target.removeEventListener('dragenter', onDragEnter);
      target.removeEventListener('dragover', onDragOver);
      target.removeEventListener('dragleave', onDragLeave);
      target.removeEventListener('drop', onDrop);
      window.removeEventListener('dragend', reset);
    };
  }, [anchorRef]);

  useEffect(() => {
    const composer = anchorRef.current;
    if (!composer) return undefined;
    const onPaste = (event: ClipboardEvent) => {
      const files = pastedFiles(event.clipboardData);
      if (!files.length) return;
      event.preventDefault();
      onFilesRef.current(files);
    };
    composer.addEventListener('paste', onPaste);
    return () => composer.removeEventListener('paste', onPaste);
  }, [anchorRef]);

  return { zone, isDragging };
};
