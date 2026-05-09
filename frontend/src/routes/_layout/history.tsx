import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { AnimatePresence, motion } from "framer-motion";
import { FileDiff, GitCommit, Loader2, Search, X } from "lucide-react";

import { DiffViewer } from "@/components/DiffViewer";
import { HistoryPanel } from "@/components/HistoryPanel";
import { Mascot } from "@/components/Mascot";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const EMPTY_COMMIT_MESSAGES = [
  "Selecione um commit para ver detalhes.",
  "Stashie ama um bom histórico.",
  "Escolhe um commit aí, vai.",
  "Sem commit, sem fofoca.",
  "Cadê o commit, hein?",
];

function pickMsg<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
import { useRepo } from "@/lib/repo-context";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CommitFileDiff } from "@/lib/git";

export const Route = createFileRoute("/_layout/history")({
  component: HistoryView,
});

function HistoryView() {
  const {
    commits,
    logBusy,
    selectedCommit,
    setSelectedCommit,
    commitDiff,
    commitDiffBusy,
  } = useRepo();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileQuery, setFileQuery] = useState("");

  const filteredFiles = useMemo(() => {
    if (!commitDiff) return [];
    const q = fileQuery.trim().toLowerCase();
    if (!q) return commitDiff.files;
    return commitDiff.files.filter((f) => f.path.toLowerCase().includes(q));
  }, [commitDiff, fileQuery]);

  const moveCommit = (delta: 1 | -1) => {
    if (commits.length === 0) return;
    const idx = selectedCommit
      ? commits.findIndex((c) => c.hash === selectedCommit.hash)
      : -1;
    const next = idx === -1 ? 0 : Math.min(commits.length - 1, Math.max(0, idx + delta));
    if (next === idx) return;
    setSelectedCommit(commits[next]);
    setSelectedPath(null);
    setFileQuery("");
  };

  useHotkey("J", (e) => {
    e.preventDefault();
    moveCommit(1);
  });
  useHotkey("K", (e) => {
    e.preventDefault();
    moveCommit(-1);
  });

  const selectedFile = useMemo<CommitFileDiff | null>(
    () => commitDiff?.files.find((f) => f.path === selectedPath) ?? null,
    [commitDiff, selectedPath],
  );

  const diffForViewer = useMemo(
    () =>
      selectedFile
        ? {
            path: selectedFile.path,
            oldText: selectedFile.oldText,
            newText: selectedFile.newText,
            status: selectedFile.status,
            isBinary: selectedFile.isBinary,
          }
        : null,
    [selectedFile],
  );

  return (
    <>
      <HistoryPanel
        commits={commits}
        selected={selectedCommit}
        onSelect={(c) => {
          setSelectedCommit(c);
          setSelectedPath(null);
          setFileQuery("");
        }}
        loading={logBusy}
      />

      <AnimatePresence mode="wait" initial={false}>
        {selectedCommit ? (
          <motion.div
            key={selectedCommit.hash}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-background"
          >
            <div className="flex h-12 shrink-0 items-center gap-2 px-3 text-sm font-semibold">
              <GitCommit className="size-4 text-muted-foreground" />
              <span className="font-mono text-xs">{selectedCommit.shortHash}</span>
              <AnimatePresence>
                {commitDiffBusy && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <Separator />

            <div className="shrink-0 px-3 py-2 text-xs">
              <div className="text-sm font-medium text-foreground">{selectedCommit.subject}</div>
              <div className="mt-1 text-muted-foreground">
                {selectedCommit.authorName} · {relativeTime(selectedCommit.authoredAt)}
              </div>
              {selectedCommit.body && (
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-foreground">
                  {selectedCommit.body}
                </pre>
              )}
            </div>
            <Separator />

            {commitDiff && commitDiff.files.length > 0 && (
              <div className="shrink-0 border-b border-border px-2 py-1.5">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-2 size-3 text-muted-foreground" />
                  <Input
                    value={fileQuery}
                    onChange={(e) => setFileQuery(e.target.value)}
                    placeholder="Buscar arquivo…"
                    className="h-7 pl-7 pr-7 text-[11px]"
                  />
                  {fileQuery && (
                    <button
                      type="button"
                      onClick={() => setFileQuery("")}
                      className="absolute right-1 flex size-5 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Limpar busca"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              {commitDiff && commitDiff.files.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhum arquivo alterado.
                </div>
              )}
              {commitDiff && commitDiff.files.length > 0 && filteredFiles.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhum arquivo corresponde a “{fileQuery}”.
                </div>
              )}
              <ul>
                {filteredFiles.map((f, i) => (
                  <motion.li
                    key={f.path}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16, delay: Math.min(i * 0.012, 0.18), ease: "easeOut" }}
                  >
                    <button
                      onClick={() => setSelectedPath(f.path)}
                      className={cn(
                        "flex w-full items-center gap-2 border-b border-border/50 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                        selectedPath === f.path && "bg-accent",
                      )}
                    >
                      <FileDiff className="size-3 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate font-mono">{f.path}</span>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                        {f.status}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </ScrollArea>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="flex flex-1 items-center justify-center"
          >
            <Mascot message={pickMsg(EMPTY_COMMIT_MESSAGES)} />
          </motion.div>
        )}
      </AnimatePresence>

      {selectedCommit && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selectedFile?.path ?? "none"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="flex flex-1 overflow-hidden"
          >
            <DiffViewer diff={diffForViewer} loading={commitDiffBusy && !commitDiff} />
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
