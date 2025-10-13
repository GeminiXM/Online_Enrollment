import { useEffect } from "react";

// Notify parent window (embedding page) to scroll the iframe into view
// Cross-origin safe via postMessage; parent must add a listener to act.
export default function useNotifyParentScroll(anchor = "") {
  useEffect(() => {
    try {
      const message = {
        type: "ENROLLMENT_SCROLL_TO",
        anchor,
        path: window.location?.pathname || "",
      };
      const post = () =>
        window.parent &&
        window.parent !== window &&
        window.parent.postMessage(message, "*");

      try {
        console.log("[NotifyParent] postMessage ENROLLMENT_SCROLL_TO", message);
      } catch (_) {}
      // Fire multiple times to overcome parent load timing and lazy iframe paints
      post();
      requestAnimationFrame(post);
      setTimeout(post, 150);
      setTimeout(post, 400);
      setTimeout(post, 800);
    } catch (_) {
      // no-op
    }
  }, [anchor]);
}
