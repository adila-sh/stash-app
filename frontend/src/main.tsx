import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { HotkeysProvider } from "@tanstack/react-hotkeys";

import { router } from "./router";
import "./lib/settings-store";
import "./globals.css";
import "@git-diff-view/react/styles/diff-view.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("missing #root");
}

createRoot(rootEl).render(
  <StrictMode>
    <HotkeysProvider>
      <RouterProvider router={router} />
    </HotkeysProvider>
  </StrictMode>,
);
