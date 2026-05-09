import { useEffect, useState } from "react";
import { ExternalLink, GitPullRequest, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGitHubAuth } from "@/hooks/useGitHubAuth";
import { extractErrorMessage } from "@/lib/git";
import { github, type PullRequestInfo } from "@/lib/github";
import { useRepo } from "@/lib/repo-context";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreatePullRequestDialog({ open, onClose }: Props) {
  const { activeRepo, remote, branches, commits } = useRepo();
  const { isAuthenticated, login } = useGitHubAuth();

  const currentBranch = branches.find((b) => b.isCurrent) ?? null;
  const headName = currentBranch?.name ?? activeRepo?.currentBranch ?? "";
  const defaultBase = branches.find((b) => b.name === "main")
    ? "main"
    : branches.find((b) => b.name === "master")
      ? "master"
      : branches.find((b) => !b.isCurrent)?.name ?? "";

  const [base, setBase] = useState(defaultBase);
  const [title, setTitle] = useState(commits[0]?.subject ?? "");
  const [body, setBody] = useState(commits[0]?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PullRequestInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    setBase(defaultBase);
    setTitle(commits[0]?.subject ?? "");
    setBody(commits[0]?.body ?? "");
    setError(null);
    setCreated(null);
  }, [open, defaultBase, commits]);

  if (!open) return null;

  async function handleSubmit() {
    if (!remote?.isGitHub) return;
    if (!base.trim() || !headName.trim() || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const pr = await github.createPullRequest(
        remote.owner,
        remote.name,
        base.trim(),
        headName.trim(),
        title.trim(),
        body,
      );
      setCreated(pr);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex w-[520px] flex-col rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <GitPullRequest className="size-4" />
            <h2 className="text-sm font-semibold">Criar pull request</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {!remote?.isGitHub ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Este repositório não está hospedado no GitHub.
          </div>
        ) : !isAuthenticated ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-xs text-muted-foreground">
              Conecte-se ao GitHub para criar pull requests.
            </p>
            <Button size="sm" onClick={() => void login()}>
              Entrar com GitHub
            </Button>
          </div>
        ) : created ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-xs">
              Pull request <span className="font-mono">#{created.number}</span> criado com sucesso.
            </p>
            <a
              href={created.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
            >
              Abrir no GitHub <ExternalLink className="size-3" />
            </a>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Repositório">
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {remote.owner}/{remote.name}
                  </div>
                </Field>
                <Field label="Head">
                  <div className="font-mono text-[11px]">{headName}</div>
                </Field>
              </div>

              <Field label="Base">
                <Input
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  placeholder="main"
                  className="h-8 font-mono text-xs"
                />
              </Field>

              <Field label="Título">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Resumo da mudança"
                  className="h-8 text-xs"
                />
              </Field>

              <Field label="Descrição">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Detalhes opcionais"
                  rows={6}
                  className="text-xs"
                />
              </Field>

              {error && (
                <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSubmit()}
                disabled={submitting || !base.trim() || !headName.trim() || !title.trim()}
              >
                {submitting ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <GitPullRequest className="size-3" />
                )}
                Criar pull request
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
