/* oxlint-disable react/iframe-missing-sandbox -- The trusted hosted login needs scripts and its own origin for Better Auth and OAuth providers. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwiseIcon, LockKeyIcon } from "@phosphor-icons/react";

import { WindowTitleBar } from "@/components/WindowTitleBar";
import {
  buildAdilaAuthURL,
  fetchAdilaSession,
  loadAdilaSession,
  saveAdilaSession,
  type AdilaSession,
} from "@/lib/adila-auth";

const SESSION_POLL_INTERVAL = 1_500;

type AuthState =
  | { status: "checking"; session: null }
  | { status: "signed-out"; session: null }
  | { status: "signed-in"; session: AdilaSession };

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const session = loadAdilaSession();
    return session ? { status: "signed-in", session } : { status: "checking", session: null };
  });
  const [connectionError, setConnectionError] = useState(false);
  const checkingRef = useRef(false);
  const authURL = useMemo(buildAdilaAuthURL, []);

  const checkSession = useCallback(async (signal?: AbortSignal) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const session = await fetchAdilaSession(signal);
      if (signal?.aborted) return;
      if (session) {
        setState({ status: "signed-in", session: saveAdilaSession(session) });
        setConnectionError(false);
      } else {
        setState((current) =>
          current.status === "signed-in" ? current : { status: "signed-out", session: null },
        );
      }
    } catch {
      if (signal?.aborted) return;
      setConnectionError(true);
      setState((current) =>
        current.status === "checking" ? { status: "signed-out", session: null } : current,
      );
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (state.status === "signed-in") return;
    const controller = new AbortController();
    void checkSession(controller.signal);
    const poll = window.setInterval(
      () => void checkSession(controller.signal),
      SESSION_POLL_INTERVAL,
    );
    return () => {
      controller.abort();
      window.clearInterval(poll);
    };
  }, [checkSession, state.status]);

  if (state.status === "signed-in") return children;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-background">
      <WindowTitleBar title="autenticação" />
      <div className="relative min-h-0 flex-1 bg-muted">
        {state.status === "checking" && (
          <div
            role="status"
            className="absolute inset-0 z-10 flex items-center justify-center bg-background"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LockKeyIcon className="size-4" />
              Verificando sua sessão…
            </div>
          </div>
        )}
        <iframe
          title="Entrar na Adila.co"
          src={authURL}
          className="h-full w-full border-0 bg-background"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="clipboard-read; clipboard-write"
          onLoad={() => void checkSession()}
        />
        {connectionError && state.status === "signed-out" && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg">
            <span>Não foi possível confirmar a sessão.</span>
            <button
              type="button"
              className="flex items-center gap-1.5 font-medium text-primary hover:underline"
              onClick={() => void checkSession()}
            >
              <ArrowClockwiseIcon className="size-4" />
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
