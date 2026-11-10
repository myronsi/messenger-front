import { useLayoutEffect, useRef, type RefObject } from 'react';

// Find the smallest width that retains the height available at full width.
// The browser measurement includes both text wrapping and timestamp placement.
export function compactMessageWidth(max: number, min: number, heightAt: (width: number) => number) {
  const height = heightAt(max);
  let low = Math.min(min, max);
  let high = max;
  for (let step = 0; step < 12 && high - low > 0.25; step++) {
    const mid = (low + high) / 2;
    if (heightAt(mid) <= height + 0.1) high = mid;
    else low = mid;
  }
  return Math.min(max, Math.ceil(high));
}

const FRAME_BUDGET_MS = 8;
const MAX_SEARCHED_LINES = 6;

interface TimeLayout { width: number; below: boolean; metadataHeight: number }

interface Row {
  element: HTMLDivElement;
  column: HTMLElement;
  bubble: HTMLElement;
  spacer: HTMLElement;
  text: string;
  spacerHtml: string;
  visible: boolean | null;
}

const MARGIN = 300;
const CACHE_LIMIT = 2000;
const layoutCache = new Map<string, TimeLayout>();
const signatures = new WeakMap<Element, string>();
const rows = new Map<Element, Row>();
const pending = new Set<Row>();
let frame = 0;
let visibilityObserver: IntersectionObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let probeHost: HTMLDivElement | null = null;
let listensForFonts = false;

const rememberTimeLayout = (signature: string, layout: TimeLayout) => {
  layoutCache.delete(signature);
  layoutCache.set(signature, layout);
  if (layoutCache.size > CACHE_LIMIT) layoutCache.delete(layoutCache.keys().next().value as string);
};

const getProbeHost = () => {
  if (probeHost?.isConnected) return probeHost;
  probeHost = document.createElement('div');
  probeHost.setAttribute('aria-hidden', 'true');
  Object.assign(probeHost.style, {
    position: 'fixed', left: '-10000px', top: '0', width: '0', height: '0', overflow: 'hidden',
    visibility: 'hidden', pointerEvents: 'none', contain: 'strict',
  });
  document.body.append(probeHost);
  return probeHost;
};

const probeLayout = (element: HTMLDivElement, font: CSSStyleDeclaration, available: number): TimeLayout => {
  const probe = element.cloneNode(true) as HTMLDivElement;
  probe.removeAttribute('data-message-text-body');
  Object.assign(probe.style, {
    position: 'absolute', left: '0', top: '0', visibility: 'hidden', pointerEvents: 'none',
    display: 'block', width: 'max-content', maxWidth: 'none', minWidth: '0', height: 'auto', padding: '0',
    font: font.font, letterSpacing: font.letterSpacing, wordSpacing: font.wordSpacing,
    fontFeatureSettings: font.fontFeatureSettings, fontVariationSettings: font.fontVariationSettings, tabSize: font.tabSize,
    whiteSpace: font.whiteSpace, overflowWrap: font.overflowWrap, contain: 'layout style paint',
  });
  const probeSpacer = probe.querySelector<HTMLElement>('[data-message-time-spacer]')!;
  probeSpacer.style.display = 'inline-block';
  getProbeHost().append(probe);
  try {
    const natural = probe.getBoundingClientRect();
    const max = Math.min(available, natural.width);
    const metadataWidth = probeSpacer.offsetWidth + parseFloat(getComputedStyle(probeSpacer).marginLeft);
    const walker = document.createTreeWalker(probe, NodeFilter.SHOW_TEXT);
    const ranges: Range[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('[data-message-time-spacer]') || !node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      ranges.push(range);
    }
    const layouts = new Map<number, { height: number; below: boolean; metadataHeight: number }>();
    const layoutAt = (width: number) => {
      const cached = layouts.get(width);
      if (cached) return cached;
      probe.style.width = `${width}px`;
      let height = probe.getBoundingClientRect().height;
      let lastTextBottom = -Infinity;
      for (const range of ranges) {
        for (const rect of range.getClientRects()) if (rect.width > 0.5) lastTextBottom = Math.max(lastTextBottom, rect.bottom);
      }
      const metadata = probeSpacer.getBoundingClientRect();
      const below = Number.isFinite(lastTextBottom) && metadata.top >= lastTextBottom - 1;
      const metadataHeight = Math.ceil(metadata.height);
      if (below) {
        probeSpacer.style.display = 'none';
        probe.style.paddingBottom = `${metadataHeight}px`;
        height = probe.getBoundingClientRect().height;
        probeSpacer.style.display = 'inline-block';
        probe.style.paddingBottom = '0';
      }
      const layout = { height, below, metadataHeight };
      layouts.set(width, layout);
      return layout;
    };
    if (natural.width <= available) {
      const { below, metadataHeight } = layoutAt(max);
      return { width: max, below, metadataHeight };
    }
    const lines = Math.max(1, Math.round(layoutAt(max).height / Math.max(1, natural.height)));
    if (lines > MAX_SEARCHED_LINES) {
      const { below, metadataHeight } = layoutAt(max);
      return { width: max, below, metadataHeight };
    }
    const width = compactMessageWidth(max, metadataWidth, (candidate) => layoutAt(candidate).height);
    const { below, metadataHeight } = layoutAt(width);
    return { width, below, metadataHeight };
  } finally { probe.remove(); }
};

const measure = (row: Row) => {
  const { element, column, bubble, text } = row;
  if (!element.isConnected || !column.clientWidth) return null;
  const font = getComputedStyle(element);
  const shell = getComputedStyle(bubble);
  const available = column.clientWidth - parseFloat(shell.paddingLeft) - parseFloat(shell.paddingRight)
    - parseFloat(shell.borderLeftWidth) - parseFloat(shell.borderRightWidth);
  if (available <= 0) return null;
  const signature = JSON.stringify([text, available, font.font, font.letterSpacing, font.wordSpacing, row.spacerHtml]);
  if (signature === signatures.get(element)) return null;
  const known = layoutCache.get(signature);
  const layout = known ?? probeLayout(element, font, available);
  if (!known) rememberTimeLayout(signature, layout);
  return { signature, layout };
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
  const started = performance.now();
  const batch = [...pending].filter((row) => rows.get(row.element) === row);
  pending.clear();
  const bottom = window.innerHeight + MARGIN;
  const middle = window.innerHeight / 2;
  const distance = new Map<Row, number>();
  for (const row of batch) {
    if (row.visible === false) continue;
    const rect = row.element.getBoundingClientRect();
    if (row.visible === null) row.visible = rect.bottom > -MARGIN && rect.top < bottom;
    if (row.visible) distance.set(row, Math.abs(rect.top + rect.height / 2 - middle));
  }
  const queue = [...distance.keys()].sort((a, b) => distance.get(a)! - distance.get(b)!);
  const results: (readonly [Row, ReturnType<typeof measure>])[] = [];
  for (const row of queue) {
    if (results.length > 0 && performance.now() - started > FRAME_BUDGET_MS) pending.add(row);
    else results.push([row, measure(row)] as const);
  }
  for (const [row, result] of results) if (result) apply(row, result.signature, result.layout);
  if (pending.size && !frame) frame = requestAnimationFrame(flush);
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
