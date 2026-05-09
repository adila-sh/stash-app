import { useEffect, useState } from "react";
import { Browser } from "@wailsio/runtime";
import { Copy, ExternalLink, Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGitHubAuth } from "@/hooks/useGitHubAuth";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function GitHubLoginButton() {
  const { user, loading, deviceFlow, error, login, cancelLogin, logout } = useGitHubAuth();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  // Close user menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [menuOpen]);

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="size-4 animate-spin" />
      </Button>
    );
  }

  if (user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent"
          title={user.login}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.login} className="size-6 rounded-full" />
          ) : (
            <GithubIcon className="size-4" />
          )}
          <span className="font-medium">{user.login}</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-border bg-popover p-1 shadow-md">
            <div className="px-2 py-1.5 text-xs">
              <div className="font-medium">{user.name || user.login}</div>
              {user.email && <div className="truncate text-muted-foreground">{user.email}</div>}
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
            >
              <LogOut className="size-3.5" />
              Sair
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => void login()} disabled={!!deviceFlow}>
        <GithubIcon className="size-4" />
        Entrar com GitHub
      </Button>

      {deviceFlow && (
        <DeviceFlowModal
          userCode={deviceFlow.start.userCode}
          verificationUri={deviceFlow.start.verificationUri}
          error={error}
          copied={copied}
          onCopy={() => {
            void navigator.clipboard.writeText(deviceFlow.start.userCode);
            setCopied(true);
          }}
          onOpen={() => {
            void Browser.OpenURL(deviceFlow.start.verificationUri);
          }}
          onCancel={() => void cancelLogin()}
        />
      )}
    </>
  );
}

interface DeviceFlowModalProps {
  userCode: string;
  verificationUri: string;
  error: string | null;
  copied: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onCancel: () => void;
}

function DeviceFlowModal({
  userCode,
  verificationUri,
  error,
  copied,
  onCopy,
  onOpen,
  onCancel,
}: DeviceFlowModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-[420px] rounded-lg border border-border bg-card p-6 shadow-2xl">
        <div className="mb-1 flex items-center gap-2">
          <GithubIcon className="size-5" />
          <h2 className="text-base font-semibold">Autorize o stash no GitHub</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Abrimos o GitHub no seu navegador. Cole o código abaixo para concluir o login.
        </p>

        <div className="mb-4 flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <code className="font-mono text-lg tracking-[0.3em]">{userCode}</code>
          <Button variant="ghost" size="sm" onClick={onCopy} className="shrink-0">
            <Copy className="size-3.5" />
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{verificationUri}</span>
          <Button variant="ghost" size="sm" onClick={onOpen} className="shrink-0">
            <ExternalLink className="size-3.5" />
            Abrir
          </Button>
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" />
            Aguardando autorização…
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
