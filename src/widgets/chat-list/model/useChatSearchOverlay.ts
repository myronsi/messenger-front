import { useRef, useState } from 'react';

const ANIM_DURATION = 120; // ms

// Drives the expanding-circle reveal animation for the search overlay:
// tracks overlay/circle visibility and computes the circle's geometry from
// the search button's bounding rect relative to the list container.
export function useChatSearchOverlay() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [circleActive, setCircleActive] = useState(false);
  const [circleStyle, setCircleStyle] = useState<{ left: number; top: number; size: number } | null>(null);

  const handleOpenSearch = (btnRect: DOMRect) => {
    const container = containerRef.current;
    if (!container) {
      // fallback: simple show
      setOverlayVisible(true);
      setShowSearch(true);
      setTimeout(() => {
        // focus first input inside overlay after it's visible
        const input = document.querySelector('#search-overlay input, #search-overlay textarea') as HTMLInputElement | null;
        input?.focus();
      }, 100);
      return;
    }

    const contRect = container.getBoundingClientRect();

    // compute button center relative to container
    const centerX = (btnRect.left + btnRect.right) / 2 - contRect.left;
    const centerY = (btnRect.top + btnRect.bottom) / 2 - contRect.top;

    // compute max distance to container corners
    const distances = [
      Math.hypot(centerX - 0, centerY - 0),
      Math.hypot(centerX - contRect.width, centerY - 0),
      Math.hypot(centerX - 0, centerY - contRect.height),
      Math.hypot(centerX - contRect.width, centerY - contRect.height),
    ];
    const R = Math.ceil(Math.max(...distances));
    const size = R * 2;

    setCircleStyle({ left: Math.round(centerX - R), top: Math.round(centerY - R), size });
    // show the overlay container and animate the circle
    setOverlayVisible(true);
    // small delay to ensure DOM paint
    requestAnimationFrame(() => {
      setCircleActive(true);
    });

    // after animation end, reveal inner content and focus input
    setTimeout(() => {
      setShowSearch(true);
      const input = document.querySelector('#search-overlay input, #search-overlay textarea') as HTMLInputElement | null;
      input?.focus();
    }, ANIM_DURATION - 50);
  };

  const handleCloseSearch = () => {
    // reverse animation
    setShowSearch(false);
    setCircleActive(false);
    // after animation finished, hide overlay
    setTimeout(() => {
      setOverlayVisible(false);
      setCircleStyle(null);
    }, ANIM_DURATION + 20);
  };

  return {
    containerRef,
    showSearch,
    overlayVisible,
    circleActive,
    circleStyle,
    handleOpenSearch,
    handleCloseSearch,
  };
}
