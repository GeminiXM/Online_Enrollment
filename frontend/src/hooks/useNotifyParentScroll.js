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
      window.parent &&
        window.parent !== window &&
        window.parent.postMessage(message, "*");
    } catch (_) {
      // no-op
    }
  }, [anchor]);
}
