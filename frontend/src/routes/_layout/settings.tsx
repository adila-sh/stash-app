import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { AsciiGlitch } from "@/components/AsciiGlitch";
import { Logo } from "@/components/Logo";
import {
  useSettings,
  type DiffStyle,
  type FontSize,
  type TabWidth,
  type WindowBlur,
  type WindowOpacity,
} from "@/lib/settings-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_layout/settings")({
  component: SettingsView,
});

type Section = "appearance" | "diff" | "about";

const NAV: { id: Section; label: string }[] = [
  { id: "appearance", label: "Aparência" },
  { id: "diff", label: "Diff" },
  { id: "about", label: "Sobre" },
];

function SettingsView() {
  const { settings, update, reset } = useSettings();
  const [section, setSection] = useState<Section>("appearance");

  return (
    <div className="font-mono flex flex-1 overflow-hidden">
      <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex h-10 items-center border-b border-border px-3 text-[11px] font-medium uppercase tracking-[0.1em]">
          Configurações
        </div>
        <nav className="flex-1 p-1.5">
          {NAV.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "relative flex w-full items-center px-3 py-2 text-left text-[12px] transition-colors hover:bg-accent",
                  active && "bg-accent text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="settings-nav-indicator"
                    className="absolute inset-y-1 left-0 w-0.5 bg-foreground"
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  />
                )}
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={reset}
            className="flex h-8 w-full items-center justify-center gap-1.5 border border-border text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowCounterClockwiseIcon className="size-3" />
            Restaurar padrões
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mx-auto w-full max-w-2xl p-8"
          >
            {section === "appearance" && (
              <>
                <SectionHeader title="Aparência" description="Janela e movimento da interface." />

                <Field label="Translucência da janela">
                  <OptionGrid<WindowOpacity>
                    value={settings.windowOpacity}
                    onChange={(v) => update("windowOpacity", v)}
                    options={[
                      { value: 0.5, label: "50%" },
                      { value: 0.6, label: "60%" },
                      { value: 0.7, label: "70%" },
                      { value: 0.75, label: "75%" },
                      { value: 0.8, label: "80%" },
                      { value: 0.85, label: "85%" },
                      { value: 0.9, label: "90%" },
                      { value: 0.95, label: "95%" },
                      { value: 1, label: "100%" },
                    ]}
                    cols={3}
                  />
                </Field>

                <Field label="Desfoque do fundo">
                  <OptionGrid<WindowBlur>
                    value={settings.windowBlur}
                    onChange={(v) => update("windowBlur", v)}
                    options={[
                      { value: 0, label: "Nenhum" },
                      { value: 4, label: "4px" },
                      { value: 8, label: "8px" },
                      { value: 12, label: "12px" },
                      { value: 16, label: "16px" },
                      { value: 24, label: "24px" },
                      { value: 32, label: "32px" },
                      { value: 48, label: "48px" },
                    ]}
                    cols={4}
                  />
                </Field>

                <div>
                  <Toggle
                    checked={settings.reduceMotion}
                    onChange={(v) => update("reduceMotion", v)}
                    label="Reduzir movimento"
                    hint="Desabilita transições e animações da interface"
                  />
                </div>
              </>
            )}

            {section === "diff" && (
              <>
                <SectionHeader title="Diff" description="Como o diff é renderizado." />

                <Field label="Estilo">
                  <OptionGrid<DiffStyle>
                    value={settings.diffStyle}
                    onChange={(v) => update("diffStyle", v)}
                    options={[
                      { value: "unified", label: "Unificado" },
                      { value: "split", label: "Lado a lado" },
                      { value: "inline", label: "Inline" },
                      { value: "collapsed", label: "Compacto" },
                    ]}
                    cols={2}
                  />
                </Field>

                <Field label="Tamanho da fonte">
                  <OptionGrid<FontSize>
                    value={settings.diffFontSize}
                    onChange={(v) => update("diffFontSize", v)}
                    options={[
                      { value: 12, label: "12" },
                      { value: 13, label: "13" },
                      { value: 14, label: "14" },
                      { value: 15, label: "15" },
                    ]}
                    cols={4}
                  />
                </Field>

                <Field label="Largura do tab">
                  <OptionGrid<TabWidth>
                    value={settings.tabWidth}
                    onChange={(v) => update("tabWidth", v)}
                    options={[
                      { value: 2, label: "2" },
                      { value: 4, label: "4" },
                      { value: 8, label: "8" },
                    ]}
                    cols={3}
                  />
                </Field>

                <div className="space-y-2">
                  <Toggle
                    checked={settings.showLineNumbers}
                    onChange={(v) => update("showLineNumbers", v)}
                    label="Números de linha"
                    hint="Exibir contador à esquerda das linhas"
                  />
                  <Toggle
                    checked={settings.syntaxHighlight}
                    onChange={(v) => update("syntaxHighlight", v)}
                    label="Realce de sintaxe"
                    hint="Colorir o código de acordo com a linguagem"
                  />
                  <Toggle
                    checked={settings.wrapLines}
                    onChange={(v) => update("wrapLines", v)}
                    label="Quebra de linha"
                    hint="Quebrar linhas longas em vez de rolagem horizontal"
                  />
                  <Toggle
                    checked={settings.showFileHeader}
                    onChange={(v) => update("showFileHeader", v)}
                    label="Cabeçalho do arquivo"
                    hint="Mostrar o caminho e status acima do diff"
                  />
                  <Toggle
                    checked={settings.compactMode}
                    onChange={(v) => update("compactMode", v)}
                    label="Modo compacto"
                    hint="Reduzir o espaçamento do cabeçalho"
                  />
                </div>
              </>
            )}

            {section === "about" && (
              <>
                <SectionHeader title="Sobre" description="O que é o stash." />

                <div className="mb-6 flex flex-col items-center gap-4 border border-border bg-card p-6">
                  <Logo className="h-20 w-auto" />
                  <AsciiGlitch />
                  <div className="text-center">
                    <p className="text-[12px] text-foreground">
                      Cliente Git desktop minimalista, focado em commits rápidos e leitura clara de
                      diffs.
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Sem nuvem, sem telemetria — apenas você e seus repositórios locais.
                    </p>
                  </div>
                </div>

                <Field label="Versão">
                  <div className="border border-border bg-card">
                    <Row k="Versão" v={__APP_VERSION__} />
                  </div>
                </Field>

                <Field label="Créditos">
                  <a
                    href="https://stash.adila.co"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[12px] text-foreground transition-colors hover:text-muted-foreground"
                  >
                    stash.adila.co
                  </a>
                </Field>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {section === "diff" ? (
          <motion.aside
            key="diff-preview"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="hidden h-full w-[420px] shrink-0 flex-col border-l border-border bg-background/40 lg:flex"
          >
            <div className="flex h-10 shrink-0 items-center border-b border-border px-4 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Pré-visualização
            </div>
            <div className="flex flex-1 items-center justify-center overflow-y-auto px-8 py-10">
              <div className="w-full max-w-[300px]">
                <DiffPreview
                  fontSize={settings.diffFontSize}
                  showLineNumbers={settings.showLineNumbers}
                  style={settings.diffStyle}
                  tabWidth={settings.tabWidth}
                  wrapLines={settings.wrapLines}
                  compact={settings.compactMode}
                />
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-8 border-b border-border pb-4">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-[12px] text-muted-foreground">{description}</p>
    </header>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-7">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

interface Option<T> {
  value: T;
  label: string;
}

function OptionGrid<T extends string | number>({
  value,
  onChange,
  options,
  cols = 2,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  cols?: 2 | 3 | 4;
}) {
  const colsClass = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[cols];
  return (
    <div className={cn("grid gap-px border border-border bg-border", colsClass)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex h-9 items-center justify-center bg-card px-3 text-[11px] transition-colors hover:bg-accent",
              active && "bg-accent text-foreground",
            )}
          >
            <span>{opt.label}</span>
            {active && (
              <motion.span
                layoutId={`option-${String(options[0].value)}`}
                className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground"
                transition={{ duration: 0.18, ease: "easeOut" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 border border-border bg-card px-3 py-2.5 text-[12px] transition-colors hover:bg-accent">
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <span
        role="switch"
        aria-checked={checked}
        className={cn(
          "relative inline-flex h-4 w-7 shrink-0 items-center border transition-colors",
          checked ? "border-foreground bg-foreground" : "border-border bg-background",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 700, damping: 36 }}
          className={cn(
            "ml-0.5 block size-2.5",
            checked ? "ml-auto mr-0.5 bg-background" : "bg-foreground",
          )}
        />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[12px] last:border-b-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}

const SAMPLE_OLD = ["function greet(name) {", "\treturn 'Hi ' + name;", "}"];
const SAMPLE_NEW = [
  "function greet(name: string) {",
  "\treturn `Hello, ${name.trim()}! Welcome to stash, the minimal git client.`;",
  "}",
];

function DiffPreview({
  fontSize,
  showLineNumbers,
  style,
  tabWidth,
  wrapLines,
  compact,
}: {
  fontSize: FontSize;
  showLineNumbers: boolean;
  style: DiffStyle;
  tabWidth: TabWidth;
  wrapLines: boolean;
  compact: boolean;
}) {
  const previewStyle: React.CSSProperties = {
    fontSize,
    tabSize: tabWidth,
    MozTabSize: tabWidth,
    whiteSpace: wrapLines ? "pre-wrap" : "pre",
    lineHeight: compact ? 1.2 : 1.5,
  };
  if (style === "split") {
    return (
      <div
        className="grid grid-cols-2 overflow-hidden border border-border font-mono"
        style={previewStyle}
      >
        <div className="border-r border-border">
          {SAMPLE_OLD.map((line, i) => (
            <DiffLine
              key={`o${i}`}
              ln={i + 1}
              text={line}
              kind={i === 0 ? "del" : "ctx"}
              showLineNumbers={showLineNumbers}
            />
          ))}
        </div>
        <div>
          {SAMPLE_NEW.map((line, i) => (
            <DiffLine
              key={`n${i}`}
              ln={i + 1}
              text={line}
              kind={i === 0 || i === 1 ? "add" : "ctx"}
              showLineNumbers={showLineNumbers}
            />
          ))}
        </div>
      </div>
    );
  }

  const variant: "inline" | "collapsed" | "default" =
    style === "inline" ? "inline" : style === "collapsed" ? "collapsed" : "default";

  return (
    <div className="overflow-hidden border border-border font-mono" style={previewStyle}>
      <DiffLine
        ln={1}
        text={SAMPLE_OLD[0]}
        kind="del"
        showLineNumbers={showLineNumbers}
        variant={variant}
      />
      <DiffLine
        ln={1}
        text={SAMPLE_NEW[0]}
        kind="add"
        showLineNumbers={showLineNumbers}
        variant={variant}
      />
      <DiffLine
        ln={2}
        text={SAMPLE_OLD[1]}
        kind="del"
        showLineNumbers={showLineNumbers}
        variant={variant}
      />
      <DiffLine
        ln={2}
        text={SAMPLE_NEW[1]}
        kind="add"
        showLineNumbers={showLineNumbers}
        variant={variant}
      />
      {variant !== "collapsed" && (
        <DiffLine
          ln={3}
          text={SAMPLE_OLD[2]}
          kind="ctx"
          showLineNumbers={showLineNumbers}
          variant={variant}
        />
      )}
    </div>
  );
}

function DiffLine({
  ln,
  text,
  kind,
  showLineNumbers,
  variant = "default",
}: {
  ln: number;
  text: string;
  kind: "add" | "del" | "ctx";
  showLineNumbers: boolean;
  variant?: "default" | "inline" | "collapsed";
}) {
  const bg =
    kind === "add"
      ? "bg-[color:var(--added)]/15"
      : kind === "del"
        ? "bg-[color:var(--deleted)]/15"
        : "";
  const sign = kind === "add" ? "+" : kind === "del" ? "−" : " ";
  const signColor =
    kind === "add"
      ? "text-[color:var(--added)]"
      : kind === "del"
        ? "text-[color:var(--deleted)]"
        : "text-muted-foreground";
  const inline = variant === "inline";
  const accent =
    inline && kind === "add"
      ? "border-l-2 border-[color:var(--added)]"
      : inline && kind === "del"
        ? "border-l-2 border-[color:var(--deleted)]"
        : inline
          ? "border-l-2 border-transparent"
          : "";
  return (
    <div className={cn("flex items-start", bg, accent)}>
      {showLineNumbers && (
        <span className="w-7 shrink-0 select-none border-r border-border px-1 text-right text-muted-foreground">
          {ln}
        </span>
      )}
      {!inline && (
        <span className={cn("w-4 shrink-0 select-none px-1 text-center", signColor)}>{sign}</span>
      )}
      <span className="min-w-0 flex-1 overflow-hidden px-2">{text}</span>
    </div>
  );
}
