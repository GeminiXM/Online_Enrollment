import { useEffect } from "react";

export default function useScrollTopOnMount() {
  useEffect(() => {
    const scrollTop = () => {
      try {
        window.scrollTo(0, 0);
      } catch (_) {}
    };

    // Initial attempt immediately on mount
    scrollTop();
    // Try again on next paint to override any auto-focus scroll
    const rafId = requestAnimationFrame(scrollTop);
    // And again shortly after to beat late layout/iframe content shifts
    const t1 = setTimeout(scrollTop, 50);
    const t2 = setTimeout(scrollTop, 200);

    return () => {
      try {
        cancelAnimationFrame(rafId);
      } catch (_) {}
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
}
