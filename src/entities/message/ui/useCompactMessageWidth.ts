import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';

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

export function useCompactMessageWidth(ref: RefObject<HTMLDivElement | null>, text: string, trailing: ReactNode) {
  const previous = useRef('');
  useLayoutEffect(() => {
    const element = ref.current;
    const column = element?.closest<HTMLElement>('[data-message-column]');
    const bubble = element?.closest<HTMLElement>('.motion-message-bubble');
    const spacer = element?.querySelector<HTMLElement>('[data-message-time-spacer]');
    if (!element || !column || !bubble || !spacer) {
      previous.current = '';
      if (element) {
        element.style.width = '';
        element.style.paddingBottom = '';
        delete element.dataset.timeLayout;
      }
      return;
    }
    let mounted = true;
    const measure = () => {
      if (!mounted || !column.clientWidth) return;
      const font = getComputedStyle(element);
      const shell = getComputedStyle(bubble);
      const available = column.clientWidth - parseFloat(shell.paddingLeft) - parseFloat(shell.paddingRight)
        - parseFloat(shell.borderLeftWidth) - parseFloat(shell.borderRightWidth);
      if (available <= 0) return;
      const signature = JSON.stringify([text, available, font.font, font.letterSpacing, font.wordSpacing, spacer.innerHTML]);
      if (signature === previous.current) return;
      previous.current = signature;
      const probe = element.cloneNode(true) as HTMLDivElement;
      probe.removeAttribute('data-message-text-body');
      probe.setAttribute('aria-hidden', 'true');
      Object.assign(probe.style, {
        position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden', pointerEvents: 'none',
        display: 'block', width: 'max-content', maxWidth: 'none', minWidth: '0', height: 'auto', padding: '0',
        font: font.font, letterSpacing: font.letterSpacing, wordSpacing: font.wordSpacing,
        fontFeatureSettings: font.fontFeatureSettings, fontVariationSettings: font.fontVariationSettings, tabSize: font.tabSize,
        whiteSpace: font.whiteSpace, overflowWrap: font.overflowWrap, contain: 'layout style paint',
      });
      const probeSpacer = probe.querySelector<HTMLElement>('[data-message-time-spacer]')!;
      probeSpacer.style.display = 'inline-block';
      document.body.append(probe);
      try {
        const max = Math.min(available, probe.getBoundingClientRect().width);
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
        const width = compactMessageWidth(max, metadataWidth, (candidate) => layoutAt(candidate).height);
        const { below, metadataHeight } = layoutAt(width);
        spacer.style.display = below ? 'none' : '';
        element.style.paddingBottom = below ? `${metadataHeight}px` : '';
        element.dataset.timeLayout = below ? 'below' : 'inline';
        element.style.width = `${width}px`;
      } finally { probe.remove(); }
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(column);
    observer?.observe(element);
    observer?.observe(spacer);
    const fontsChanged = () => { previous.current = ''; measure(); };
    document.fonts?.addEventListener('loadingdone', fontsChanged);
    window.addEventListener('resize', measure);
    return () => { mounted = false; observer?.disconnect(); document.fonts?.removeEventListener('loadingdone', fontsChanged); window.removeEventListener('resize', measure); };
  }, [ref, text, trailing]);
}
