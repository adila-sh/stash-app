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
    currentBranch: "main",
    pickRepoFolder: "",
    status: { branch: "main", staged: [], unstaged: [], untracked: [] } as {
      branch: string;
      staged: Array<{ path: string; status: string; staged: boolean }>;
      unstaged: Array<{ path: string; status: string; staged: boolean }>;
      untracked: Array<{ path: string; status: string; staged: boolean }>;
    },
    statusResponses: [] as Array<{
      branch: string;
      staged: Array<{ path: string; status: string; staged: boolean }>;
      unstaged: Array<{ path: string; status: string; staged: boolean }>;
      untracked: Array<{ path: string; status: string; staged: boolean }>;
    }>,
    commits: [] as Array<Record<string, unknown>>,
    commitDiff: null as Record<string, unknown> | null,
    aheadBehind: { ahead: 0, behind: 0 },
    branches: [
      { name: "main", hash: "abc123", isCurrent: true, upstream: "origin/main" },
    ] as Array<{
      name: string;
      hash: string;
      isCurrent: boolean;
      upstream?: string;
    }>,
  };

  const byName = vi.fn(async (method: string, ...args: unknown[]) => {
    if (method === "main.Config.Get") {
      const [key, fallback] = args;
      if (key === "repos.paths") return state.repoPaths;
      if (key === "repos.org") return null;
      return fallback;
    }

    if (method === "main.GitService.OpenRepo") {
      const path = String(args[0]);
      return {
        ...REPO,
        path,
        name: path.split("/").at(-1) || REPO.name,
        currentBranch: state.currentBranch,
      };
    }
    if (method === "main.GitService.Status") {
      return state.statusResponses.shift() ?? state.status;
    }
    if (method === "main.GitService.Log") return state.commits;
    if (method === "main.GitService.CommitDiff") return state.commitDiff;
    if (method === "main.GitService.ListBranches") return state.branches;
    if (method === "main.GitService.RemoteInfo") {
      return {
        url: "https://github.com/adila-sh/stash-app.git",
        host: "github.com",
        owner: "adila-sh",
        name: "stash-app",
        isGitHub: true,
      };
    }
    if (method === "main.GitService.AheadBehind") return state.aheadBehind;
    if (method === "main.GitService.PickRepoFolder") return state.pickRepoFolder;
    return undefined;
  });

  const reset = () => {
    state.repoPaths = [];
    state.currentBranch = "main";
    state.pickRepoFolder = "";
    state.status = { branch: "main", staged: [], unstaged: [], untracked: [] };
    state.statusResponses = [];
    state.commits = [];
    state.commitDiff = null;
    state.aheadBehind = { ahead: 0, behind: 0 };
    state.branches = [{ name: "main", hash: "abc123", isCurrent: true, upstream: "origin/main" }];
  };

  return {
    state,
    reset,
    byName,
    byId: vi.fn(async (..._args: unknown[]): Promise<unknown> => false),
    eventOn: vi.fn((_event: string, _callback: (...args: unknown[]) => void) => vi.fn()),
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
