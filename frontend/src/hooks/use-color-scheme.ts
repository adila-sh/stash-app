import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

export type ColorScheme = "light" | "dark";

function mql(): MediaQueryList | null {
  return typeof window === "undefined" ? null : window.matchMedia(QUERY);
}

function subscribe(onChange: () => void): () => void {
  const m = mql();
  if (!m) return () => {};
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}

function getSnapshot(): ColorScheme {
  return mql()?.matches ? "dark" : "light";
}

/** Reflete o esquema do SO na classe `.dark` do <html>, que o Tailwind observa. */
function apply(scheme: ColorScheme): void {
  document.documentElement.classList.toggle("dark", scheme === "dark");
}

export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, getSnapshot, () => "dark");
}

export function initColorScheme(): void {
  if (typeof document === "undefined") return;
  apply(getSnapshot());
  subscribe(() => apply(getSnapshot()));
}
