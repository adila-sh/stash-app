import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ADILA_AUTH_RETURN_URL,
  ADILA_SESSION_STORAGE_KEY,
  ADILA_SESSION_URL,
  buildAdilaAuthURL,
  clearAdilaSession,
  fetchAdilaSession,
  isAdilaSession,
  isSessionExpired,
  loadAdilaSession,
  saveAdilaSession,
  type AdilaSession,
} from "./adila-auth";

const SESSION: AdilaSession = {
  session: {
    expiresAt: "2999-01-01T00:00:00.000Z",
    token: "never-persist-this-token",
  },
  user: { id: "user-1", email: "ada@adila.co", name: "Ada" },
};

describe("adila auth session", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("builds the hosted login URL with the Stash return address", () => {
    const url = new URL(buildAdilaAuthURL());
    expect(url.origin).toBe("https://auth.adila.co");
    expect(url.pathname).toBe("/auth");
    expect(url.searchParams.get("redirect")).toBe(ADILA_AUTH_RETURN_URL);
  });

  it.each([
    [null, false],
    [{}, false],
    [{ session: {}, user: {} }, true],
  ])("validates the session shape", (value, expected) => {
    expect(isAdilaSession(value)).toBe(expected);
  });

  it("detects expired and invalid expiration dates", () => {
    expect(isSessionExpired(SESSION, Date.parse("2026-01-01"))).toBe(false);
    expect(isSessionExpired({ ...SESSION, session: { expiresAt: "2020-01-01" } }, Date.now())).toBe(
      true,
    );
    expect(isSessionExpired({ ...SESSION, session: { expiresAt: "invalid" } })).toBe(true);
    expect(isSessionExpired({ ...SESSION, session: {} })).toBe(false);
  });

  it("persists a safe snapshot and restores it without the auth token", () => {
    const saved = saveAdilaSession(SESSION);
    expect(saved.session).not.toHaveProperty("token");
    expect(loadAdilaSession()).toEqual(saved);
    expect(localStorage.getItem(ADILA_SESSION_STORAGE_KEY)).not.toContain(
      "never-persist-this-token",
    );

    clearAdilaSession();
    expect(loadAdilaSession()).toBeNull();
  });

  it.each([
    "not-json",
    JSON.stringify({ session: null, user: null }),
    JSON.stringify({ session: { expiresAt: "2020-01-01" }, user: {} }),
  ])("discards invalid stored data", (stored) => {
    localStorage.setItem(ADILA_SESSION_STORAGE_KEY, stored);
    expect(loadAdilaSession()).toBeNull();
    expect(localStorage.getItem(ADILA_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("retrieves the current session with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => SESSION });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAdilaSession()).resolves.toEqual(SESSION);
    expect(fetchMock).toHaveBeenCalledWith(
      ADILA_SESSION_URL,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("returns null for an unauthenticated response and rejects HTTP errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => null })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAdilaSession()).resolves.toBeNull();
    await expect(fetchAdilaSession()).rejects.toThrow("status 503");
  });
});
