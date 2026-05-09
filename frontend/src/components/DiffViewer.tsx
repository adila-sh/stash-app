import { useMemo } from "react";
import { FileText } from "lucide-react";
import { DiffView, DiffModeEnum } from "@git-diff-view/react";
import { generateDiffFile } from "@git-diff-view/file";

import { Mascot } from "@/components/Mascot";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/lib/settings-store";
import type { DiffResult } from "@/lib/git";

const EMPTY_MESSAGES = [
  "Nada selecionado. Stashie está de boa.",
  "Selecione um arquivo para ver o diff.",
  "Quietinho aqui... cadê o diff?",
  "Aguardando ordens, capitão.",
  "Pode escolher um arquivo, sem pressa.",
];

const BINARY_MESSAGES = [
  "Arquivo binário — Stashie não consegue ler isso.",
  "Bytes demais, letras de menos.",
  "Diff binário não vai rolar dessa vez.",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Props {
  diff: DiffResult | null;
  loading: boolean;
}

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  go: "go",
  rs: "rust",
  py: "python",
  json: "json",
  jsonc: "json",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  ini: "ini",
  md: "markdown",
  mdx: "markdown",
  html: "xml",
  htm: "xml",
  xml: "xml",
  svg: "xml",
  css: "css",
  scss: "scss",
  sass: "scss",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  sql: "sql",
  diff: "diff",
  patch: "diff",
  dockerfile: "dockerfile",
};

function inferLang(path: string): string {
  const base = path.split("/").pop() ?? path;
  if (base.toLowerCase() === "dockerfile") return "dockerfile";
  const ext = base.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

export function DiffViewer({ diff, loading }: Props) {
  const { settings } = useSettings();

  const diffFile = useMemo(() => {
    if (!diff || diff.isBinary) return null;
    const lang = inferLang(diff.path);
    const file = generateDiffFile(
      diff.path,
      diff.oldText,
      diff.path,
      diff.newText,
      lang,
      lang,
    );
    file.initTheme(settings.theme === "ultra-dark" ? "dark" : "light");
    file.init();
    if (settings.diffStyle === "split") file.buildSplitDiffLines();
    else file.buildUnifiedDiffLines();
    return file;
  }, [diff, settings.theme, settings.diffStyle]);

  const headerHeight = settings.compactMode ? "h-8" : "h-12";
  const diffStyle = {
    tabSize: settings.tabWidth,
    MozTabSize: settings.tabWidth,
  } as React.CSSProperties;

  return (
    <div
      className="flex h-full flex-1 flex-col bg-background"
      data-line-numbers={settings.showLineNumbers ? "on" : "off"}
      style={diffStyle}
    >
      {settings.showFileHeader && (
        <>
          <div className={`${headerHeight} flex items-center gap-2 px-3 text-sm font-semibold`}>
            <FileText className="size-4 text-muted-foreground" />
            {diff ? <span className="font-mono text-xs">{diff.path}</span> : "Diff"}
            {diff && (
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase text-muted-foreground">
                {diff.status}
              </span>
            )}
          </div>
          <Separator />
        </>
      )}

      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Carregando diff…
          </div>
        )}
        {!loading && !diff && (
          <div className="flex h-full items-center justify-center">
            <Mascot message={pick(EMPTY_MESSAGES)} />
          </div>
        )}
        {!loading && diff && diff.isBinary && (
          <div className="flex h-full items-center justify-center">
            <Mascot message={pick(BINARY_MESSAGES)} />
          </div>
        )}
        {!loading && diffFile && (
          <DiffView
            diffFile={diffFile}
            diffViewMode={settings.diffStyle === "split" ? DiffModeEnum.Split : DiffModeEnum.Unified}
            diffViewTheme={settings.theme === "ultra-dark" ? "dark" : "light"}
            diffViewFontSize={settings.diffFontSize}
            diffViewHighlight={settings.syntaxHighlight}
            diffViewWrap={settings.wrapLines}
          />
        )}
      </div>
    </div>
  );
}
