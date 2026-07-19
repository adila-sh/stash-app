import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { githubMock } from "./mocks/github";
import { wailsMock } from "./mocks/wails";

const TEST_ADILA_SESSION = {
  session: { expiresAt: "2999-01-01T00:00:00.000Z" },
  user: { id: "test-user", email: "test@adila.co", name: "Test User" },
};

vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtools: () => null,
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const components = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motionProps = new Set([
    "animate",
    "exit",
    "initial",
    "layout",
    "layoutId",
    "transition",
    "whileHover",
    "whileTap",
  ]);
  const motion = new Proxy(
    {},
    {
      get: (_, tag: string) => {
        if (!components.has(tag)) {
          components.set(
            tag,
            React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
              const domProps = Object.fromEntries(
                Object.entries(props).filter(([key]) => !motionProps.has(key)),
              );
              return React.createElement(tag, { ...domProps, ref });
            }),
          );
        }
        return components.get(tag);
      },
    },
  );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    MotionConfig: ({ children }: { children: React.ReactNode }) => children,
    motion,
  };
});

class ResizeObserverMock implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "ResizeObserver", {
  configurable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(Element.prototype, "getAnimations", {
  configurable: true,
  value: vi.fn(() => []),
});

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  value: vi.fn(),
});

beforeEach(async () => {
  githubMock.reset();
  wailsMock.reset();
  const [{ useRepoOrgStore }, { useSettingsStore }] = await Promise.all([
    import("@/lib/repo-org-store"),
    import("@/lib/settings-store"),
  ]);
  useSettingsStore.getState().reset();
  useRepoOrgStore.setState({
    collections: [],
    pinned: [],
    assignments: {},
    uncategorizedCollapsed: false,
    sidebarCollapsed: false,
  });
  localStorage.clear();
  localStorage.setItem("stash:adila-session", JSON.stringify(TEST_ADILA_SESSION));
});

afterEach(() => {
  cleanup();
});
