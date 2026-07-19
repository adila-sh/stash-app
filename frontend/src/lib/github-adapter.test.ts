import { beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/github");

import { github } from "@/lib/github";
import { wailsMock } from "@/test/mocks/wails";

describe("GitHub Wails adapter", () => {
  beforeEach(() => {
    wailsMock.byId.mockClear();
  });

  it.each([
    ["isAuthenticated", () => github.isAuthenticated(), [], false],
    ["logout", () => github.logout(), [], undefined],
    ["getUser", () => github.getUser(), [], {}],
    ["startDeviceFlow", () => github.startDeviceFlow(), [], {}],
    ["pollDeviceToken", () => github.pollDeviceToken("device", 5), ["device", 5], undefined],
    ["cancelDeviceFlow", () => github.cancelDeviceFlow(), [], undefined],
    ["listMyRepos", () => github.listMyRepos(100), [100], []],
    ["pickCloneDirectory", () => github.pickCloneDirectory(), [], "/workspace"],
    [
      "cloneRepo",
      () => github.cloneRepo("url", "/workspace", "repo"),
      ["url", "/workspace", "repo"],
      "/workspace/repo",
    ],
    [
      "createPullRequest",
      () => github.createPullRequest("owner", "repo", "main", "head", "title", "body"),
      ["owner", "repo", "main", "head", "title", "body"],
      null,
    ],
    [
      "listPullRequests",
      () => github.listPullRequests("owner", "repo", "closed"),
      ["owner", "repo", "closed"],
      [],
    ],
    [
      "getPullRequest",
      () => github.getPullRequest("owner", "repo", 42),
      ["owner", "repo", 42],
      null,
    ],
    [
      "mergePullRequest",
      () => github.mergePullRequest("owner", "repo", 42, "squash"),
      ["owner", "repo", 42, "squash"],
      undefined,
    ],
    [
      "listIssueComments",
      () => github.listIssueComments("owner", "repo", 42),
      ["owner", "repo", 42],
      [],
    ],
    [
      "createIssueComment",
      () => github.createIssueComment("owner", "repo", 42, "body"),
      ["owner", "repo", 42, "body"],
      null,
    ],
    ["listReviews", () => github.listReviews("owner", "repo", 42), ["owner", "repo", 42], []],
    [
      "listReviewComments",
      () => github.listReviewComments("owner", "repo", 42),
      ["owner", "repo", 42],
      [],
    ],
    [
      "listPullRequestFiles",
      () => github.listPullRequestFiles("owner", "repo", 42),
      ["owner", "repo", 42],
      [],
    ],
    [
      "listPullRequestCommits",
      () => github.listPullRequestCommits("owner", "repo", 42),
      ["owner", "repo", 42],
      [],
    ],
    [
      "createReview",
      () => github.createReview("owner", "repo", 42, "APPROVE", "body", []),
      ["owner", "repo", 42, "APPROVE", "body", []],
      null,
    ],
    [
      "createReviewComment",
      () => github.createReviewComment("owner", "repo", 42, "sha", "app.ts", 10, "RIGHT", "body"),
      ["owner", "repo", 42, "sha", "app.ts", 10, "RIGHT", "body"],
      null,
    ],
    [
      "replyToReviewComment",
      () => github.replyToReviewComment("owner", "repo", 42, 7, "reply"),
      ["owner", "repo", 42, 7, "reply"],
      null,
    ],
  ])("maps github.%s to the generated Wails binding", async (_name, invoke, args, result) => {
    wailsMock.byId.mockResolvedValueOnce(result);
    await invoke();

    expect(wailsMock.byId).toHaveBeenCalledOnce();
    const [bindingId, ...receivedArgs] = wailsMock.byId.mock.calls[0];
    expect(bindingId).toEqual(expect.any(Number));
    expect(receivedArgs).toEqual(args);
  });

  it("applies defaults for pull-request listing and merge", async () => {
    wailsMock.byId.mockResolvedValueOnce([]);
    await github.listPullRequests("owner", "repo");
    expect(wailsMock.byId.mock.calls[0].slice(1)).toEqual(["owner", "repo", "open"]);

    wailsMock.byId.mockResolvedValueOnce(undefined);
    await github.mergePullRequest("owner", "repo", 42);
    expect(wailsMock.byId.mock.calls[1].slice(1)).toEqual(["owner", "repo", 42, "merge"]);
  });
});
