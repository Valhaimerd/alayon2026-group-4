"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/** Smooth the document, while map gestures and nested panels stay native. */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      anchors: true,
      syncTouch: false,
      respectReducedMotion: true,
      stopInertiaOnNavigate: true,
      autoToggle: true,
      prevent: (node) =>
        Boolean(
          node.closest(
            ".workspace, dialog, [role='dialog'], [data-lenis-prevent]",
          ),
        ),
    });

    return () => lenis.destroy();
  }, []);

  return null;
}
