interface Point { x: number; y: number }

const distance = (points: Map<number, Point>) => {
  const [a, b] = [...points.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
};

export const createPinchTracker = () => {
  const points = new Map<number, Point>();
  let last = 0;
  return {
    down(id: number, x: number, y: number) {
      if (points.size >= 2) return;
      points.set(id, { x, y });
      if (points.size === 2) last = distance(points);
    },
    move(id: number, x: number, y: number): number | null {
      if (!points.has(id)) return null;
      points.set(id, { x, y });
      if (points.size < 2 || !last) return null;
      const next = distance(points);
      const factor = next / last;
      last = next;
      return Number.isFinite(factor) && factor > 0 ? factor : null;
    },
    up(id: number) {
      points.delete(id);
      if (points.size < 2) last = 0;
    },
    get pinching() {
      return points.size >= 2;
    },
  };
};

export type PinchTracker = ReturnType<typeof createPinchTracker>;
