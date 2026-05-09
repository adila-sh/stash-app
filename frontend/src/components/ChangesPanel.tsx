import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FileChange, StatusResult } from "@/lib/git";

interface Props {
  status: StatusResult | null;
  selected: FileChange | null;
  onSelect: (f: FileChange) => void;
  onStage: (f: FileChange) => Promise<void>;
  onUnstage: (f: FileChange) => Promise<void>;
  onCommit: (message: string) => Promise<void>;
  busy: boolean;
}

export function ChangesPanel({
  status,
  selected,
  onSelect,
  onStage,
  onUnstage,
  onCommit,
  busy,
}: Props) {
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);

  const stagedCount = status?.staged.length ?? 0;
  const unstagedCount = (status?.unstaged.length ?? 0) + (status?.untracked.length ?? 0);
  const total = stagedCount + unstagedCount;

  async function submit() {
    if (!message.trim() || stagedCount === 0) return;
    setCommitting(true);
    try {
      await onCommit(message.trim());
      setMessage("");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-background">
      <div className="flex h-10 items-center gap-2 border-b border-border px-3 text-[11px] font-medium uppercase tracking-[0.1em]">
        Mudanças
        {busy && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        <span className="ml-auto text-muted-foreground tabular-nums">{total}</span>
      </div>

      <ScrollArea className="flex-1">
        <div>
          {stagedCount > 0 && (
            <FileGroup
              label="Stage"
              files={status?.staged ?? []}
              selected={selected}
              onSelect={onSelect}
              action="unstage"
              onAction={onUnstage}
            />
          )}
          <FileGroup
            label="Unstaged"
            files={status?.unstaged ?? []}
            selected={selected}
            onSelect={onSelect}
            action="stage"
            onAction={onStage}
          />
          <FileGroup
            label="Untracked"
            files={status?.untracked ?? []}
            selected={selected}
            onSelect={onSelect}
            action="stage"
            onAction={onStage}
          />
          {total === 0 && status && (
            <p className="px-3 py-8 text-center text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Working tree limpo
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-2">
        <Textarea
          placeholder="Mensagem do commit"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          rows={3}
          className="resize-none border-border text-[12px]"
        />
        <button
          type="button"
          disabled={!message.trim() || stagedCount === 0 || committing}
          onClick={() => void submit()}
          title="Commit (⌘↵)"
          className="mt-2 flex h-8 w-full items-center justify-center gap-2 border border-border bg-foreground text-[11px] font-medium uppercase tracking-[0.1em] text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {committing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              Commit
              {status?.branch && (
                <span className="font-mono opacity-60">→ {status.branch}</span>
              )}
              <KbdGroup className="ml-auto opacity-70">
                <Kbd className="bg-background/20 text-background">⌘</Kbd>
                <Kbd className="bg-background/20 text-background">↵</Kbd>
              </KbdGroup>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface GroupProps {
  label: string;
  files: FileChange[];
  selected: FileChange | null;
  onSelect: (f: FileChange) => void;
  action: "stage" | "unstage";
  onAction: (f: FileChange) => Promise<void>;
}

function FileGroup({ label, files, selected, onSelect, action, onAction }: GroupProps) {
  if (files.length === 0) return null;
  return (
    <div>
      <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{files.length}</span>
      </div>
      <ul>
        {files.map((f) => (
          <li key={`${f.staged ? "s" : "u"}:${f.path}`}>
            <button
              onClick={() => onSelect(f)}
              className={cn(
                "group relative flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors hover:bg-accent",
                selected?.path === f.path && selected.staged === f.staged && "bg-accent",
              )}
            >
              {selected?.path === f.path && selected.staged === f.staged && (
                <span className="absolute inset-y-0 left-0 w-0.5 bg-foreground" />
              )}
              <StatusBadge status={f.status} />
              <span className="flex-1 truncate font-mono">{f.path}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  void onAction(f);
                }}
                className="hidden border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-muted-foreground hover:bg-background hover:text-foreground group-hover:inline-block"
              >
                {action === "stage" ? "+" : "−"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { char: string; color: string }> = {
    added: { char: "A", color: "var(--added)" },
    modified: { char: "M", color: "var(--modified)" },
    deleted: { char: "D", color: "var(--deleted)" },
    untracked: { char: "?", color: "var(--untracked)" },
    conflict: { char: "!", color: "var(--destructive)" },
    renamed: { char: "R", color: "var(--modified)" },
  };
  const it = map[status] ?? { char: "·", color: "var(--muted-foreground)" };
  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center text-[10px] font-bold tabular-nums"
      style={{ color: it.color }}
    >
      {it.char}
    </span>
  );
}
