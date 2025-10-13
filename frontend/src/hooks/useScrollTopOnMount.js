import { useEffect } from "react";

export default function useScrollTopOnMount() {
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const prevHtmlAnchor =
      htmlEl && htmlEl.style ? htmlEl.style.overflowAnchor : undefined;
    const prevBodyAnchor =
      bodyEl && bodyEl.style ? bodyEl.style.overflowAnchor : undefined;
    const prevHtmlScrollBehavior =
      htmlEl && htmlEl.style ? htmlEl.style.scrollBehavior : undefined;
    const prevBodyScrollBehavior =
      bodyEl && bodyEl.style ? bodyEl.style.scrollBehavior : undefined;

    // Disable scroll anchoring and smooth behavior; ensure manual restoration later
    try {
      if (htmlEl && htmlEl.style) htmlEl.style.overflowAnchor = "none";
      if (bodyEl && bodyEl.style) bodyEl.style.overflowAnchor = "none";
      if (htmlEl && htmlEl.style) htmlEl.style.scrollBehavior = "auto";
      if (bodyEl && bodyEl.style) bodyEl.style.scrollBehavior = "auto";
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }
      // Blur any focused element that might pull the viewport down
      try {
        document.activeElement &&
          document.activeElement.blur &&
          document.activeElement.blur();
      } catch (_) {}
    } catch (_) {}

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
    const t3 = setTimeout(scrollTop, 500);
    const t4 = setTimeout(scrollTop, 900);
    const t5 = setTimeout(scrollTop, 1400);

    return () => {
      try {
        cancelAnimationFrame(rafId);
      } catch (_) {}
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      // Restore previous behaviors
      try {
        if (htmlEl && htmlEl.style)
          htmlEl.style.overflowAnchor = prevHtmlAnchor || "";
        if (bodyEl && bodyEl.style)
          bodyEl.style.overflowAnchor = prevBodyAnchor || "";
        if (htmlEl && htmlEl.style)
          htmlEl.style.scrollBehavior = prevHtmlScrollBehavior || "";
        if (bodyEl && bodyEl.style)
          bodyEl.style.scrollBehavior = prevBodyScrollBehavior || "";
      } catch (_) {}
    };
  }, []);
}
