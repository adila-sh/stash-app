import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGate } from "./AuthGate";
import { ADILA_SESSION_STORAGE_KEY } from "@/lib/adila-auth";

vi.mock("@/components/WindowTitleBar", () => ({
  WindowTitleBar: ({ title }: { title: string }) => <header>{title}</header>,
}));

const SESSION = {
  session: { expiresAt: "2999-01-01T00:00:00.000Z", token: "secret" },
  user: { id: "user-1", email: "ada@adila.co" },
};

describe("AuthGate", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("opens the app immediately from a valid local session", () => {
    localStorage.setItem(ADILA_SESSION_STORAGE_KEY, JSON.stringify(SESSION));
    render(
      <AuthGate>
        <main>Aplicativo Stash</main>
      </AuthGate>,
    );

    expect(screen.getByText("Aplicativo Stash")).toBeInTheDocument();
    expect(screen.queryByTitle("Entrar na Adila.co")).not.toBeInTheDocument();
  });

  it("renders auth.adila.co when there is no active session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => null }));
    render(
      <AuthGate>
        <main>Aplicativo Stash</main>
      </AuthGate>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Verificando sua sessão");
    const frame = await screen.findByTitle<HTMLIFrameElement>("Entrar na Adila.co");
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(frame.src).toContain("https://auth.adila.co/auth?redirect=");
    expect(screen.queryByText("Aplicativo Stash")).not.toBeInTheDocument();
  });

  it("saves the remote session and enters the app after login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => SESSION }));
    render(
      <AuthGate>
        <main>Aplicativo Stash</main>
      </AuthGate>,
    );

    expect(await screen.findByText("Aplicativo Stash")).toBeInTheDocument();
    const stored = localStorage.getItem(ADILA_SESSION_STORAGE_KEY);
    expect(stored).toContain("ada@adila.co");
    expect(stored).not.toContain("secret");
  });

  it("offers a retry when session verification fails", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ok: true, json: async () => SESSION });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <AuthGate>
        <main>Aplicativo Stash</main>
      </AuthGate>,
    );

    const retry = await screen.findByRole("button", { name: "Tentar novamente" });
    fireEvent.click(retry);
    expect(await screen.findByText("Aplicativo Stash")).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
