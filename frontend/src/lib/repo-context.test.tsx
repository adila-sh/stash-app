import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { RepoProvider, useRepo } from "@/lib/repo-context";
import { wailsMock } from "@/test/mocks/wails";

const FILE = { path: "src/app.ts", status: "modified", staged: false };
const STAGED = { ...FILE, staged: true };
const UNTRACKED = { path: "scratch.txt", status: "untracked", staged: false };

function RepoHarness() {
  const repo = useRepo();
  if (!repo.hydrated) return <span>loading</span>;
  return (
    <div>
      <span>{repo.activeRepo ? `active:${repo.activeRepo.name}` : "inactive"}</span>
      <button onClick={() => repo.setActivePath(repo.repos[0]?.path ?? null)}>activate</button>
      <button onClick={() => void repo.refreshBranches()}>refresh branches</button>
      <button onClick={() => void repo.unstage(STAGED)}>unstage</button>
      <button onClick={() => void repo.stageMany([FILE, UNTRACKED])}>stage many</button>
      <button onClick={() => void repo.unstageMany([STAGED])}>unstage many</button>
      <button onClick={() => void repo.discardMany([FILE, UNTRACKED])}>discard many</button>
      <button onClick={() => void repo.stashChanges("test stash")}>stash</button>
      <button onClick={() => void repo.discardChanges()}>discard all</button>
      <button onClick={() => repo.setSelectedFile(FILE)}>select file</button>
      <button onClick={() => repo.setSelectedCommit(repo.commits[0] ?? null)}>select commit</button>
      <button onClick={() => repo.removeRepo(repo.repos[0]?.path ?? "")}>remove</button>
    </div>
  );
}

describe("repository context commands", () => {
  it("runs every bulk and recovery operation against the active repository", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    const user = userEvent.setup();
    render(
      <RepoProvider>
        <RepoHarness />
      </RepoProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "activate" }));
    expect(await screen.findByText("active:stash-app")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "refresh branches" }));
    await waitFor(() =>
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.ListBranches",
        "/workspace/stash-app",
      ),
    );

    await user.click(screen.getByRole("button", { name: "unstage" }));
    await waitFor(() =>
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.UnstageFile",
        "/workspace/stash-app",
        "src/app.ts",
      ),
    );

    await user.click(screen.getByRole("button", { name: "stage many" }));
    await waitFor(() =>
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.StageFiles",
        "/workspace/stash-app",
        ["src/app.ts", "scratch.txt"],
      ),
    );

    await user.click(screen.getByRole("button", { name: "unstage many" }));
    await waitFor(() =>
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.UnstageFiles",
        "/workspace/stash-app",
        ["src/app.ts"],
      ),
    );

    await user.click(screen.getByRole("button", { name: "discard many" }));
    await waitFor(() =>
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.DiscardFiles",
        "/workspace/stash-app",
        ["src/app.ts"],
        ["scratch.txt"],
      ),
    );

    await user.click(screen.getByRole("button", { name: "stash" }));
    await waitFor(() =>
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.StashPush",
        "/workspace/stash-app",
        "test stash",
      ),
    );

    await user.click(screen.getByRole("button", { name: "discard all" }));
    await waitFor(() =>
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.DiscardLocalChanges",
        "/workspace/stash-app",
      ),
    );
  });

  it("loads selected file and commit diffs, then closes a removed repository", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    wailsMock.state.commits = [
      {
        hash: "abc123",
        shortHash: "abc123",
        subject: "Commit",
        body: "",
        authorName: "Adila",
        authorEmail: "dev@adila.co",
        authoredAt: "2026-07-19T12:00:00Z",
        parentHashes: [],
      },
    ];
    const user = userEvent.setup();
    render(
      <RepoProvider>
        <RepoHarness />
      </RepoProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "activate" }));
    await screen.findByText("active:stash-app");
    await user.click(screen.getByRole("button", { name: "select file" }));
    await waitFor(() =>
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.FileDiff",
        "/workspace/stash-app",
        "src/app.ts",
        false,
      ),
    );

    await user.click(screen.getByRole("button", { name: "select commit" }));
    await waitFor(() =>
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.CommitDiff",
        "/workspace/stash-app",
        "abc123",
      ),
    );

    await user.click(screen.getByRole("button", { name: "remove" }));
    await waitFor(() =>
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.CloseRepo",
        "/workspace/stash-app",
      ),
    );
    expect(screen.getByText("inactive")).toBeInTheDocument();
  });
});
