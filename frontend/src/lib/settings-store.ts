import { useShallow } from "zustand/react/shallow";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "ultra-dark" | "ultra-white";
export type MonoFont = "google" | "jetbrains" | "fira" | "ibm" | "system";
export type SansFont = "google" | "inter" | "geist" | "system";
export type DiffStyle = "unified" | "split";
export type FontSize = 12 | 13 | 14 | 15;
export type TabWidth = 2 | 4 | 8;
export type UiFontSize = 12 | 13 | 14;
export type WindowOpacity = 0.85 | 0.9 | 0.95 | 1;
export type Radius = 0 | 2 | 4 | 6;
export type AccentTint = "neutral" | "cool" | "warm" | "violet";

export interface Settings {
  theme: Theme;
  monoFont: MonoFont;
  sansFont: SansFont;
  uiFontSize: UiFontSize;
  windowOpacity: WindowOpacity;
  radius: Radius;
  accentTint: AccentTint;
  reduceMotion: boolean;
  diffFontSize: FontSize;
  diffStyle: DiffStyle;
  showLineNumbers: boolean;
  wrapLines: boolean;
  syntaxHighlight: boolean;
  tabWidth: TabWidth;
  showFileHeader: boolean;
  compactMode: boolean;
}

const DEFAULTS: Settings = {
  theme: "ultra-dark",
  monoFont: "google",
  sansFont: "google",
  uiFontSize: 13,
  windowOpacity: 0.85,
  radius: 0,
  accentTint: "neutral",
  reduceMotion: false,
  diffFontSize: 12,
  diffStyle: "unified",
  showLineNumbers: true,
  wrapLines: false,
  syntaxHighlight: true,
  tabWidth: 2,
  showFileHeader: true,
  compactMode: false,
};

const MONO_STACKS: Record<MonoFont, string> = {
  google: '"Google Sans Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  jetbrains: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  fira: '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
  ibm: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  system: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

const SANS_STACKS: Record<SansFont, string> = {
  google: '"Google Sans Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  inter: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  geist: '"Geist", ui-sans-serif, system-ui, -apple-system, sans-serif',
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

export const MONO_FONT_LABELS: Record<MonoFont, string> = {
  google: "Google Sans Code",
  jetbrains: "JetBrains Mono",
  fira: "Fira Code",
  ibm: "IBM Plex Mono",
  system: "Sistema",
};

export const SANS_FONT_LABELS: Record<SansFont, string> = {
  google: "Google Sans Code",
  inter: "Inter",
  geist: "Geist",
  system: "Sistema",
};

interface SettingsState extends Settings {
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      update: (key, value) => set({ [key]: value } as Pick<Settings, typeof key>),
      reset: () => set(DEFAULTS),
    }),
    {
      name: "stash:settings",
      version: 3,
      migrate: (persisted, fromVersion) => {
        if (fromVersion < 2 && persisted && typeof persisted === "object") {
          return { ...DEFAULTS, ...(persisted as Partial<Settings>), monoFont: "google", sansFont: "google" };
        }
        if (fromVersion < 3 && persisted && typeof persisted === "object") {
          return { ...DEFAULTS, ...(persisted as Partial<Settings>) };
        }
        return persisted as Settings;
      },
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([k]) => k in DEFAULTS),
        ) as Settings,
    },
  ),
);

const ACCENT_TINTS: Record<AccentTint, { hue: number; chroma: number }> = {
  neutral: { hue: 0, chroma: 0 },
  cool: { hue: 240, chroma: 0.04 },
  warm: { hue: 50, chroma: 0.04 },
  violet: { hue: 300, chroma: 0.05 },
};

function applySettings(s: Settings) {
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.style.setProperty("--font-mono", MONO_STACKS[s.monoFont]);
  root.style.setProperty("--font-sans", SANS_STACKS[s.sansFont]);
  root.style.setProperty("--ui-font-size", `${s.uiFontSize}px`);
  root.style.setProperty("--window-bg-alpha", String(s.windowOpacity));
  root.style.setProperty("--radius", `${s.radius}px`);

  const tint = ACCENT_TINTS[s.accentTint];
  const isDark = s.theme === "ultra-dark";
  if (tint.chroma === 0) {
    root.style.setProperty("--accent", isDark ? "oklch(0.14 0 0)" : "oklch(0.93 0 0)");
  } else {
    const l = isDark ? 0.16 : 0.91;
    root.style.setProperty("--accent", `oklch(${l} ${tint.chroma} ${tint.hue})`);
  }

  root.dataset.reduceMotion = s.reduceMotion ? "true" : "false";
  document.body.style.fontSize = `${s.uiFontSize}px`;
}

if (typeof document !== "undefined") {
  applySettings(useSettingsStore.getState());
  useSettingsStore.subscribe((state) => applySettings(state));
}

export function useSettings() {
  const settings = useSettingsStore(
    useShallow((s) => ({
      theme: s.theme,
      monoFont: s.monoFont,
      sansFont: s.sansFont,
      uiFontSize: s.uiFontSize,
      windowOpacity: s.windowOpacity,
      radius: s.radius,
      accentTint: s.accentTint,
      reduceMotion: s.reduceMotion,
      diffFontSize: s.diffFontSize,
      diffStyle: s.diffStyle,
      showLineNumbers: s.showLineNumbers,
      wrapLines: s.wrapLines,
      syntaxHighlight: s.syntaxHighlight,
      tabWidth: s.tabWidth,
      showFileHeader: s.showFileHeader,
      compactMode: s.compactMode,
    })),
  );
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);
  return { settings, update, reset };
}
