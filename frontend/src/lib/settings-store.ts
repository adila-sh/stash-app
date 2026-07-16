import { useShallow } from "zustand/react/shallow";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DiffStyle = "unified" | "split" | "inline" | "collapsed";
export type FontSize = 12 | 13 | 14 | 15;
export type TabWidth = 2 | 4 | 8;
export type WindowOpacity = 0.5 | 0.6 | 0.7 | 0.75 | 0.8 | 0.85 | 0.9 | 0.95 | 1;
export type WindowBlur = 0 | 4 | 8 | 12 | 16 | 24 | 32 | 48;

export interface Settings {
  windowOpacity: WindowOpacity;
  windowBlur: WindowBlur;
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
  windowOpacity: 0.85,
  windowBlur: 24,
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
      version: 5,
      migrate: (persisted, fromVersion) => {
        if (!persisted || typeof persisted !== "object") return DEFAULTS;
        if (fromVersion < 5) {
          const {
            theme: _theme,
            monoFont: _monoFont,
            radius: _radius,
            accentTint: _accentTint,
            sansFont: _sansFont,
            uiFontSize: _uiFontSize,
            ...rest
          } = persisted as Record<string, unknown>;
          return { ...DEFAULTS, ...rest } as Settings;
        }
        return persisted as Settings;
      },
      partialize: (state) =>
        Object.fromEntries(Object.entries(state).filter(([k]) => k in DEFAULTS)) as Settings,
    },
  ),
);

function applySettings(s: Settings) {
  const root = document.documentElement;
  root.style.setProperty("--window-bg-alpha", String(s.windowOpacity));
  root.style.setProperty("--window-blur", `${s.windowBlur}px`);
  root.dataset.reduceMotion = s.reduceMotion ? "true" : "false";
}

if (typeof document !== "undefined") {
  applySettings(useSettingsStore.getState());
  useSettingsStore.subscribe((state) => applySettings(state));
}

export function useSettings() {
  const settings = useSettingsStore(
    useShallow((s) => ({
      windowOpacity: s.windowOpacity,
      windowBlur: s.windowBlur,
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
