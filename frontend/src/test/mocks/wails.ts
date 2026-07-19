import { vi } from "vitest";

const REPO = {
  path: "/workspace/stash-app",
  name: "stash-app",
  currentBranch: "main",
  head: "abc123",
  hasChanges: false,
};

const identity = (value: unknown) => value;

export const wailsMock = (() => {
  const state = {
    repoPaths: [] as string[],
  };

  const byName = vi.fn(async (method: string, ...args: unknown[]) => {
    if (method === "main.Config.Get") {
      const [key, fallback] = args;
      if (key === "repos.paths") return state.repoPaths;
      if (key === "repos.org") return null;
      return fallback;
    }

    if (method === "main.GitService.OpenRepo") return REPO;
    if (method === "main.GitService.Status") {
      return { branch: "main", staged: [], unstaged: [], untracked: [] };
    }
    if (method === "main.GitService.Log") return [];
    if (method === "main.GitService.ListBranches") {
      return [{ name: "main", hash: "abc123", isCurrent: true, upstream: "origin/main" }];
    }
    if (method === "main.GitService.RemoteInfo") {
      return {
        url: "https://github.com/adila-sh/stash-app.git",
        host: "github.com",
        owner: "adila-sh",
        name: "stash-app",
        isGitHub: true,
      };
    }
    if (method === "main.GitService.AheadBehind") return { ahead: 0, behind: 0 };
    if (method === "main.GitService.PickRepoFolder") return "";
    return undefined;
  });

  return {
    state,
    byName,
    byId: vi.fn(async () => false),
    eventOn: vi.fn(() => vi.fn()),
    openUrl: vi.fn(async () => undefined),
    isMaximised: vi.fn(async () => false),
    minimise: vi.fn(async () => undefined),
    toggleMaximise: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
})();

vi.doMock("@wailsio/runtime", () => {
  return {
    Create: {
      Any: identity,
      Array: (create: (value: unknown) => unknown) => (values: unknown[]) => values.map(create),
      Nullable: (create: (value: unknown) => unknown) => (value: unknown) =>
        value == null ? value : create(value),
      Events: identity,
    },
    Call: {
      ByName: wailsMock.byName,
      ByID: wailsMock.byId,
    },
    Events: {
      On: wailsMock.eventOn,
    },
    Browser: {
      OpenURL: wailsMock.openUrl,
    },
    Window: {
      IsMaximised: wailsMock.isMaximised,
      Minimise: wailsMock.minimise,
      ToggleMaximise: wailsMock.toggleMaximise,
      Close: wailsMock.close,
    },
  };
});
