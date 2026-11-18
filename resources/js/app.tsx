import React from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import "lenis/dist/lenis.css";
import "../css/globals.css";
import "../css/shared-controls.css";
import "../css/workspace.css";
import Workspace from "./explore/workspace";
import SmoothScroll from "./smooth-scroll";
import Pwa from "./pwa";

createInertiaApp({
  resolve: (name) => {
    if (name !== "Explore") throw new Error(`Unknown page: ${name}`);
    return Workspace;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<><SmoothScroll /><Pwa /><App {...props} /></>);
  },
});
