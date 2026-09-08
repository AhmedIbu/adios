import { useRef, useState } from "react";

const THRESHOLD = 64;
const MAX_PULL = 90;

/**
 * Pull-to-refresh for a page that scrolls the window itself (this app has
 * no inner scroll container) — only starts tracking when already scrolled
 * to the top, so it never fights normal scrolling.
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    if (window.scrollY > 0 || refreshing) return;
    startY.current = e.clientY;
    pulling.current = true;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pulling.current || startY.current === null) return;
    const dy = e.clientY - startY.current;
    if (dy <= 0 || window.scrollY > 0) {
      pulling.current = false;
      setPullY(0);
      return;
    }
    setPullY(Math.min(MAX_PULL, dy * 0.5));
  }

  async function onPointerUp() {
    if (!pulling.current) return;
    pulling.current = false;
    startY.current = null;
    setPullY((y) => {
      if (y >= THRESHOLD) {
        setRefreshing(true);
        onRefresh().finally(() => {
          setRefreshing(false);
          setPullY(0);
        });
        return THRESHOLD;
      }
      return 0;
    });
  }

  return {
    pullY,
    refreshing,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp
    }
  };
}
