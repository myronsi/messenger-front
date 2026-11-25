import { useLayoutEffect, useRef, type RefObject } from 'react';

export interface Box { left: number; right: number; top: number; bottom: number; height: number }

interface TimeLayout { width: number; below: boolean; metadataHeight: number }

export function timeLayoutFromLines(left: number, lines: Box[], metadata: Box, metadataWidth: number, available: number): TimeLayout {
  const textBottom = lines.reduce((bottom, line) => Math.max(bottom, line.bottom), -Infinity);
  const textRight = lines.reduce((right, line) => Math.max(right, line.right), left);
  const below = Number.isFinite(textBottom) && metadata.top >= textBottom - 1;
  const content = below ? Math.max(textRight - left, metadataWidth) : Math.max(textRight, metadata.right) - left;
  return { width: Math.min(available, Math.ceil(content)), below, metadataHeight: Math.ceil(metadata.height) };
}

interface Row {
  element: HTMLDivElement;
  column: HTMLElement;
  bubble: HTMLElement;
  spacer: HTMLElement;
  text: string;
  spacerHtml: string;
  visible: boolean | null;
}

interface Work { row: Row; signature: string; available: number; layout?: TimeLayout }

const MARGIN = 300;
const CACHE_LIMIT = 2000;
const layoutCache = new Map<string, TimeLayout>();
const signatures = new WeakMap<Element, string>();
const rows = new Map<Element, Row>();
const pending = new Set<Row>();
let frame = 0;
let visibilityObserver: IntersectionObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let listensForFonts = false;

const rememberTimeLayout = (signature: string, layout: TimeLayout) => {
  layoutCache.delete(signature);
  layoutCache.set(signature, layout);
  if (layoutCache.size > CACHE_LIMIT) layoutCache.delete(layoutCache.keys().next().value as string);
};

const describeRow = (row: Row) => {
  const { element, column, bubble, text } = row;
  if (!element.isConnected || !column.clientWidth) return null;
  const font = getComputedStyle(element);
  const shell = getComputedStyle(bubble);
  const available = column.clientWidth - Number.parseFloat(shell.paddingLeft) - Number.parseFloat(shell.paddingRight)
    - Number.parseFloat(shell.borderLeftWidth) - Number.parseFloat(shell.borderRightWidth);
  if (available <= 0) return null;
  const signature = JSON.stringify([text, available, font.font, font.letterSpacing, font.wordSpacing, row.spacerHtml]);
  return signature === signatures.get(element) ? null : { row, signature, available };
};

const release = ({ element, spacer }: Row) => {
  element.style.width = '';
  element.style.paddingBottom = '';
  spacer.style.display = '';
};

const measureLines = ({ element, spacer }: Row, available: number) => {
  const frame = element.getBoundingClientRect();
  const layoutWidth = Number.parseFloat(getComputedStyle(element).width);
  const scale = layoutWidth > 0 && frame.width > 0 ? frame.width / layoutWidth : 1;
  const local = (rect: DOMRect): Box => ({
    left: (rect.left - frame.left) / scale, right: (rect.right - frame.left) / scale,
    top: (rect.top - frame.top) / scale, bottom: (rect.bottom - frame.top) / scale, height: rect.height / scale,
  });
  const lines: Box[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (spacer.contains(node)) continue;
    if (node instanceof HTMLImageElement) lines.push(local(node.getBoundingClientRect()));
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) if (rect.width > 0.5) lines.push(local(rect));
  }
  const metadata = local(spacer.getBoundingClientRect());
  const metadataWidth = metadata.right - metadata.left + Number.parseFloat(getComputedStyle(spacer).marginLeft);
  return timeLayoutFromLines(0, lines, metadata, metadataWidth, available);
};

const apply = (row: Row, signature: string, { width, below, metadataHeight }: TimeLayout) => {
  signatures.set(row.element, signature);
  row.spacer.style.display = below ? 'none' : '';
  row.element.style.paddingBottom = below ? `${metadataHeight}px` : '';
  row.element.dataset.timeLayout = below ? 'below' : 'inline';
  row.element.style.width = `${width}px`;
};

const flush = () => {
  frame = 0;
  const batch = [...pending].filter((row) => rows.get(row.element) === row && row.visible !== false);
  pending.clear();
  const bottom = window.innerHeight + MARGIN;
  const work: Work[] = [];
  for (const row of batch) {
    if (row.visible === null) {
      const rect = row.element.getBoundingClientRect();
      row.visible = rect.bottom > -MARGIN && rect.top < bottom;
      if (!row.visible) continue;
    }
    const item = describeRow(row);
    if (item) work.push({ ...item, layout: layoutCache.get(item.signature) });
  }
  const misses = work.filter((item) => !item.layout);
  misses.forEach((item) => release(item.row));
  misses.forEach((item) => {
    item.layout = measureLines(item.row, item.available);
    rememberTimeLayout(item.signature, item.layout);
  });
  for (const item of work) apply(item.row, item.signature, item.layout!);
};

const schedule = (row: Row) => {
  if (row.visible === false) return;
  pending.add(row);
  if (!frame) frame = requestAnimationFrame(flush);
};

const remeasureAll = () => {
  layoutCache.clear();
  rows.forEach((row) => {
    signatures.delete(row.element);
    schedule(row);
  });
};

const observers = () => {
  if (!visibilityObserver && typeof IntersectionObserver !== 'undefined') {
    visibilityObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const row = rows.get(entry.target);
        if (!row || row.visible === entry.isIntersecting) continue;
        row.visible = entry.isIntersecting;
        schedule(row);
      }
    }, { rootMargin: `${MARGIN}px` });
  }
  if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const row = rows.get(entry.target);
        if (row) schedule(row);
      }
    });
  }
  if (!listensForFonts && document.fonts?.addEventListener) {
    document.fonts.addEventListener('loadingdone', remeasureAll);
    listensForFonts = true;
  }
};

const register = (row: Row) => {
  observers();
  rows.set(row.element, row);
  rows.set(row.column, row);
  visibilityObserver?.observe(row.element);
  resizeObserver?.observe(row.column);
  schedule(row);
};

const unregister = (row: Row) => {
  pending.delete(row);
  if (rows.get(row.element) === row) rows.delete(row.element);
  if (rows.get(row.column) === row) rows.delete(row.column);
  visibilityObserver?.unobserve?.(row.element);
  resizeObserver?.unobserve?.(row.column);
  if (rows.size === 0 && frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
};

export function useCompactMessageWidth(ref: RefObject<HTMLDivElement | null>, text: string, hasTrailing: boolean) {
  const rowRef = useRef<Row | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    const column = element?.closest<HTMLElement>('[data-message-column]');
    const bubble = element?.closest<HTMLElement>('.motion-message-bubble');
    const spacer = element?.querySelector<HTMLElement>('[data-message-time-spacer]');
    if (!element || !column || !bubble || !spacer) {
      if (element) {
        signatures.delete(element);
        element.style.width = '';
        element.style.paddingBottom = '';
        delete element.dataset.timeLayout;
      }
      return;
    }
    const row: Row = {
      element, column, bubble, spacer, text, spacerHtml: spacer.innerHTML,
      visible: typeof IntersectionObserver === 'undefined' ? true : null,
    };
    rowRef.current = row;
    register(row);
    return () => {
      unregister(row);
      if (rowRef.current === row) rowRef.current = null;
    };
  }, [ref, text, hasTrailing]);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const spacer = row?.element.querySelector<HTMLElement>('[data-message-time-spacer]');
    if (!row || !spacer) return;
    const html = spacer.innerHTML;
    if (spacer === row.spacer && html === row.spacerHtml) return;
    row.spacer = spacer;
    row.spacerHtml = html;
    schedule(row);
  });
}
