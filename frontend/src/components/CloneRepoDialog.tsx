import { useEffect, useMemo, useState } from "react";
import { Events } from "@wailsio/runtime";
import { Check, Folder, GitFork, Loader2, Lock, Search, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGitHubAuth } from "@/hooks/useGitHubAuth";
import { github, type CloneProgress, type GitHubUserRepo } from "@/lib/github";
import { relativeTime } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  onCloned: (path: string) => Promise<void> | void;
}

interface CloneState {
  phase: string;
  percent: number;
  done: boolean;
  success?: boolean;
  error?: string;
}

export function CloneRepoDialog({ open, onClose, onCloned }: Props) {
  const { isAuthenticated, login } = useGitHubAuth();
  const [repos, setRepos] = useState<GitHubUserRepo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [clones, setClones] = useState<Record<string, CloneState>>({});

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    github
      .listMyRepos(100)
      .then((rs) => setRepos(rs))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [open, isAuthenticated]);

  useEffect(() => {
    if (open) return;
    setQuery("");
    setError(null);
  }, [open]);

  // Wails3 emite os argumentos como `data: any[]`; o payload do backend é o
  // primeiro elemento. Ver runtime_compat.go::emit.
  useEffect(() => {
    const off = Events.On("github:clone-progress", (event: { data: unknown }) => {
      const payload = Array.isArray(event.data) ? event.data[0] : event.data;
      const p = payload as CloneProgress | undefined;
      if (!p?.cloneUrl) return;
      setClones((prev) => ({
        ...prev,
        [p.cloneUrl]: {
          phase: p.phase,
          percent: p.percent,
          done: p.done,
          success: p.done && !p.error ? true : prev[p.cloneUrl]?.success,
          error: p.error,
        },
      }));
    });
    return () => {
      off();
    };
  }, []);

  const filtered = useMemo(() => {
    if (!repos) return [];
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [repos, query]);

  async function handleClone(repo: GitHubUserRepo) {
    setError(null);
    let parent: string;
    try {
      parent = await github.pickCloneDirectory();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    if (!parent) return;

    setClones((prev) => ({
      ...prev,
      [repo.cloneUrl]: { phase: "Iniciando", percent: 0, done: false },
    }));
    try {
      const path = await github.cloneRepo(repo.cloneUrl, parent, repo.name);
      await onCloned(path);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setClones((prev) => ({
        ...prev,
        [repo.cloneUrl]: { phase: "Erro", percent: 0, done: true, error: msg },
      }));
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex h-[600px] w-[560px] flex-col rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Clonar repositório do GitHub</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Conecte-se ao GitHub para listar e clonar seus repositórios.
            </p>
            <Button size="sm" onClick={() => void login()}>
              Entrar com GitHub
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar repositório…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loading && (
                <div className="flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Carregando repositórios…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {query ? "Nenhum repositório encontrado." : "Você não tem repositórios."}
                </div>
              )}
              <ul className="divide-y divide-border">
                {filtered.map((r) => {
                  const state = clones[r.cloneUrl];
                  const inProgress = state && !state.done;
                  return (
                    <li key={r.fullName} className="px-4 py-3 hover:bg-accent/40">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{r.name}</span>
                            {r.private && (
                              <Lock className="size-3 text-muted-foreground" aria-label="privado" />
                            )}
                            {r.fork && (
                              <GitFork className="size-3 text-muted-foreground" aria-label="fork" />
                            )}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {r.fullName}
                          </div>
                          {r.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {r.description}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                            {r.language && <span>{r.language}</span>}
                            {r.stars > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Star className="size-3" />
                                {r.stars}
                              </span>
                            )}
                            {r.updatedAt && <span>atualizado {relativeTime(r.updatedAt)}</span>}
                          </div>
                          {state && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span
                                  className={
                                    state.error
                                      ? "text-destructive"
                                      : state.success
                                        ? "text-emerald-500"
                                        : "text-muted-foreground"
                                  }
                                >
                                  {state.error
                                    ? `Erro: ${state.error}`
                                    : `${state.phase} ${state.percent}%`}
                                </span>
                              </div>
                              {!state.error && (
                                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full transition-all ${
                                      state.success ? "bg-emerald-500" : "bg-primary"
                                    }`}
                                    style={{ width: `${state.percent}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleClone(r)}
                          disabled={inProgress || state?.success}
                          className="shrink-0"
                        >
                          {inProgress ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              Clonando…
                            </>
                          ) : state?.success ? (
                            <>
                              <Check className="size-3" />
                              Clonado
                            </>
                          ) : (
                            <>
                              <Folder className="size-3" />
                              {state?.error ? "Tentar novamente" : "Clonar"}
                            </>
                          )}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </>
        )}

        {error && (
          <div className="border-t border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
