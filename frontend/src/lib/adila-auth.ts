export const ADILA_AUTH_URL = "https://auth.adila.co/auth";
export const ADILA_SESSION_URL = "https://identity.adila.co/api/auth/get-session";
export const ADILA_AUTH_RETURN_URL = "https://stash.adila.co/desktop-auth-complete";
export const ADILA_SESSION_STORAGE_KEY = "stash:adila-session";

export type AdilaUser = {
  id?: string;
  name?: string;
  email?: string;
  image?: string | null;
  [key: string]: unknown;
};

export type AdilaSession = {
  session: {
    expiresAt?: string;
    [key: string]: unknown;
  };
  user: AdilaUser;
};

export function buildAdilaAuthURL(): string {
  const url = new URL(ADILA_AUTH_URL);
  url.searchParams.set("redirect", ADILA_AUTH_RETURN_URL);
  return url.toString();
}

export function isAdilaSession(value: unknown): value is AdilaSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AdilaSession>;
  return Boolean(
    candidate.session &&
    typeof candidate.session === "object" &&
    candidate.user &&
    typeof candidate.user === "object",
  );
}

export function isSessionExpired(session: AdilaSession, now = Date.now()): boolean {
  const expiresAt = session.session.expiresAt;
  if (!expiresAt) return false;
  const timestamp = Date.parse(expiresAt);
  return Number.isNaN(timestamp) || timestamp <= now;
}

export function loadAdilaSession(): AdilaSession | null {
  try {
    const raw = localStorage.getItem(ADILA_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isAdilaSession(parsed) || isSessionExpired(parsed)) {
      clearAdilaSession();
      return null;
    }
    return parsed;
  } catch {
    clearAdilaSession();
    return null;
  }
}

export function saveAdilaSession(session: AdilaSession): AdilaSession {
  // Better Auth mantém o token real em cookie HttpOnly. Não duplicamos esse
  // segredo no localStorage; o snapshot serve para restaurar a UI localmente.
  const { token: _token, ...safeSession } = session.session;
  const snapshot = { ...session, session: safeSession };
  localStorage.setItem(ADILA_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function clearAdilaSession(): void {
  localStorage.removeItem(ADILA_SESSION_STORAGE_KEY);
}

export async function fetchAdilaSession(signal?: AbortSignal): Promise<AdilaSession | null> {
  const response = await fetch(ADILA_SESSION_URL, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`Adila auth respondeu com status ${response.status}`);
  const data: unknown = await response.json();
  return isAdilaSession(data) && !isSessionExpired(data) ? data : null;
}
