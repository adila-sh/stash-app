import { beforeEach, describe, expect, it } from "vitest";

import { config, CONFIG_KEYS } from "@/lib/config";
import { git } from "@/lib/git";
import { wailsMock } from "@/test/mocks/wails";

describe("Wails adapters", () => {
  beforeEach(() => {
    wailsMock.byName.mockClear();
  });

  it.each([
    ["get", () => config.get("key", "fallback"), "Get", ["key", "fallback"]],
    ["set", () => config.set("key", { enabled: true }), "Set", ["key", { enabled: true }]],
    ["reset", () => config.reset("key"), "Reset", ["key"]],
  ])("maps config.%s to its backend method", async (_name, invoke, method, args) => {
    await invoke();
    expect(wailsMock.byName).toHaveBeenLastCalledWith(`main.Config.${method}`, ...args);
  });

  it("exposes the persisted configuration keys", () => {
    expect(CONFIG_KEYS).toEqual({ repoPaths: "repos.paths", repoOrg: "repos.org" });
  });

  it.each([
    ["openRepo", () => git.openRepo("/repo"), "OpenRepo", ["/repo"]],
    ["closeRepo", () => git.closeRepo("/repo"), "CloseRepo", ["/repo"]],
    ["status", () => git.status("/repo"), "Status", ["/repo"]],
    ["stage", () => git.stage("/repo", "a.ts"), "StageFile", ["/repo", "a.ts"]],
    ["unstage", () => git.unstage("/repo", "a.ts"), "UnstageFile", ["/repo", "a.ts"]],
    ["stageFiles", () => git.stageFiles("/repo", ["a", "b"]), "StageFiles", ["/repo", ["a", "b"]]],
    [
      "unstageFiles",
      () => git.unstageFiles("/repo", ["a", "b"]),
      "UnstageFiles",
      ["/repo", ["a", "b"]],
    ],
    [
      "discardFiles",
      () => git.discardFiles("/repo", ["a"], ["b"]),
      "DiscardFiles",
      ["/repo", ["a"], ["b"]],
    ],
    [
      "commit",
      () => git.commit("/repo", "message", "Dev", "dev@example.com"),
      "Commit",
      ["/repo", "message", "Dev", "dev@example.com"],
    ],
    ["log", () => git.log("/repo", 25), "Log", ["/repo", 25]],
    ["branches", () => git.branches("/repo"), "ListBranches", ["/repo"]],
    ["fileDiff", () => git.fileDiff("/repo", "a.ts", true), "FileDiff", ["/repo", "a.ts", true]],
    ["commitDiff", () => git.commitDiff("/repo", "abc"), "CommitDiff", ["/repo", "abc"]],
    ["pickRepoFolder", () => git.pickRepoFolder(), "PickRepoFolder", []],
    ["checkout", () => git.checkout("/repo", "dev"), "Checkout", ["/repo", "dev"]],
    [
      "createBranch",
      () => git.createBranch("/repo", "dev", true),
      "CreateBranch",
      ["/repo", "dev", true],
    ],
    ["push", () => git.push("/repo", "dev"), "Push", ["/repo", "dev"]],
    ["stashPush", () => git.stashPush("/repo", "wip"), "StashPush", ["/repo", "wip"]],
    ["stashPop", () => git.stashPop("/repo"), "StashPop", ["/repo"]],
    [
      "discardLocalChanges",
      () => git.discardLocalChanges("/repo"),
      "DiscardLocalChanges",
      ["/repo"],
    ],
    [
      "discardFile",
      () => git.discardFile("/repo", "a.ts", false),
      "DiscardFile",
      ["/repo", "a.ts", false],
    ],
    ["remoteInfo", () => git.remoteInfo("/repo"), "RemoteInfo", ["/repo"]],
    [
      "aheadBehind",
      () => git.aheadBehind("/repo", "main", "dev"),
      "AheadBehind",
      ["/repo", "main", "dev"],
    ],
  ])("maps git.%s to its backend method", async (_name, invoke, method, args) => {
    await invoke();
    expect(wailsMock.byName).toHaveBeenLastCalledWith(`main.GitService.${method}`, ...args);
  });

  it("applies defaults used by commit, log and stash", async () => {
    await git.commit("/repo", "message");
    expect(wailsMock.byName).toHaveBeenLastCalledWith(
      "main.GitService.Commit",
      "/repo",
      "message",
      "",
      "",
    );

    await git.log("/repo");
    expect(wailsMock.byName).toHaveBeenLastCalledWith("main.GitService.Log", "/repo", 100);

    await git.stashPush("/repo");
    expect(wailsMock.byName).toHaveBeenLastCalledWith("main.GitService.StashPush", "/repo", "");
  });
});
