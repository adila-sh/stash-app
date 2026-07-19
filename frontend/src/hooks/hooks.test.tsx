import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { initColorScheme, useColorScheme } from "@/hooks/use-color-scheme";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGitHubAuth } from "@/hooks/useGitHubAuth";
import { githubMock } from "@/test/mocks/github";
import { wailsMock } from "@/test/mocks/wails";

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const mediaQuery = {
    get matches() {
      return matches;
    },
    media: "test",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_event: string, listener: () => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_event: string, listener: () => void) =>
      listeners.delete(listener),
    ),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  const matchMedia = vi.fn(() => mediaQuery);
  Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });

  return {
    matchMedia,
    mediaQuery,
    change(nextMatches: boolean) {
      matches = nextMatches;
      listeners.forEach((listener) => listener());
    },
  };
}

const USER = {
  login: "adila-dev",
  name: "Adila Dev",
  avatarUrl: "",
  bio: "",
  company: "Adila",
  location: "São Paulo",
  blog: "",
  email: "dev@adila.co",
  htmlUrl: "https://github.com/adila-dev",
  publicRepos: 10,
  followers: 5,
  following: 2,
  createdAt: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("color scheme", () => {
  it("tracks operating-system color scheme changes", () => {
    const media = installMatchMedia(false);
    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe("light");
    act(() => media.change(true));
    expect(result.current).toBe("dark");
  });

  it("initializes and updates the dark class on the document", () => {
    const media = installMatchMedia(true);
    initColorScheme();
    expect(document.documentElement).toHaveClass("dark");

    act(() => media.change(false));
    expect(document.documentElement).not.toHaveClass("dark");
  });
});

describe("mobile layout", () => {
  it.each([
    [767, true],
    [768, false],
  ])("reports width %i as mobile=%s", async (width, expected) => {
    installMatchMedia(expected);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    const { result } = renderHook(() => useIsMobile());
    await waitFor(() => expect(result.current).toBe(expected));
  });

  it("reacts to breakpoint changes", async () => {
    const media = installMatchMedia(false);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
    const { result } = renderHook(() => useIsMobile());
    await waitFor(() => expect(result.current).toBe(false));

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 500 });
    act(() => media.change(true));
    expect(result.current).toBe(true);
  });
});

describe("GitHub authentication", () => {
  it("loads the authenticated user and refreshes on backend events", async () => {
    githubMock.state.authenticated = true;
    githubMock.state.user = USER;
    const { result } = renderHook(() => useGitHubAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(USER);
    expect(result.current.isAuthenticated).toBe(true);

    githubMock.state.authenticated = false;
    const changed = wailsMock.eventOn.mock.calls.find(([event]) => event === "github.changed")?.[1];
    act(() => changed?.({}));
    await waitFor(() => expect(result.current.user).toBeNull());
  });

  it("completes device login and can log out", async () => {
    githubMock.github.pollDeviceToken.mockImplementationOnce(async () => {
      githubMock.state.authenticated = true;
      githubMock.state.user = USER;
    });
    const { result } = renderHook(() => useGitHubAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.login());
    expect(githubMock.github.startDeviceFlow).toHaveBeenCalledOnce();
    expect(githubMock.github.pollDeviceToken).toHaveBeenCalledWith("device-code", 5);
    expect(result.current.user).toEqual(USER);
    expect(result.current.deviceFlow).toBeNull();

    await act(() => result.current.logout());
    expect(githubMock.github.logout).toHaveBeenCalledOnce();
    expect(result.current.user).toBeNull();
  });

  it("exposes login, polling and logout failures", async () => {
    const { result } = renderHook(() => useGitHubAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    githubMock.github.startDeviceFlow.mockRejectedValueOnce(new Error("device flow failed"));
    await act(() => result.current.login());
    expect(result.current.error).toBe("device flow failed");

    githubMock.github.pollDeviceToken.mockRejectedValueOnce("authorization denied");
    await act(() => result.current.login());
    expect(result.current.error).toBe("authorization denied");

    githubMock.github.logout.mockRejectedValueOnce(new Error("logout failed"));
    await act(() => result.current.logout());
    expect(result.current.error).toBe("logout failed");
  });

  it("cancels an active login even when backend cancellation fails", async () => {
    let releasePoll!: () => void;
    githubMock.github.pollDeviceToken.mockImplementationOnce(
      () => new Promise<undefined>((resolve) => (releasePoll = () => resolve(undefined))),
    );
    githubMock.github.cancelDeviceFlow.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useGitHubAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      void result.current.login();
    });
    await waitFor(() => expect(result.current.deviceFlow).not.toBeNull());
    await act(() => result.current.cancelLogin());
    expect(result.current.deviceFlow).toBeNull();

    await act(async () => releasePoll());
    expect(githubMock.github.cancelDeviceFlow).toHaveBeenCalledOnce();
  });
});
