import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "@/test/render-app";
import { useRepoOrgStore } from "@/lib/repo-org-store";
import { githubMock } from "@/test/mocks/github";
import { wailsMock } from "@/test/mocks/wails";

describe("application routes", () => {
  it("renders the welcome screen without saved repositories", async () => {
    renderApp("/welcome");

    expect(await screen.findByText("Nenhum repositório salvo ainda.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /selecionar pasta/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /clonar do github/i })).toBeEnabled();
  });

  it("renders settings and switches to the diff section", async () => {
    const { user } = renderApp("/settings");

    expect(await screen.findByText("Janela e movimento da interface.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Diff" }));

    expect(await screen.findByText("Como o diff é renderizado.")).toBeInTheDocument();
    expect(screen.getByText("Largura do tab")).toBeInTheDocument();
  });

  it("persists appearance settings selected by the user", async () => {
    const { user } = renderApp("/settings");

    await screen.findByText("Translucência da janela");
    await user.click(screen.getByRole("button", { name: "100%" }));

    await waitFor(() => {
      const persisted = JSON.parse(localStorage.getItem("stash:settings") ?? "null") as {
        state?: { windowOpacity?: number };
      } | null;
      expect(persisted?.state?.windowOpacity).toBe(1);
    });
  });

  it("adds a repository selected through the native folder picker", async () => {
    wailsMock.state.pickRepoFolder = "/workspace/new-repo";
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /selecionar pasta/i }));

    await waitFor(() => {
      expect(wailsMock.byName).toHaveBeenCalledWith("main.GitService.PickRepoFolder");
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.OpenRepo",
        "/workspace/new-repo",
      );
    });
    expect(await screen.findByText("stash · new-repo")).toBeInTheDocument();
  });

  it("lists, filters and clones an authenticated GitHub repository", async () => {
    githubMock.state.authenticated = true;
    githubMock.state.user = { login: "adila-dev", name: "Adila Dev", avatarUrl: "" };
    githubMock.state.repos = [
      {
        name: "stash-app",
        fullName: "adila-sh/stash-app",
        description: "Git client",
        htmlUrl: "https://github.com/adila-sh/stash-app",
        cloneUrl: "https://github.com/adila-sh/stash-app.git",
        language: "TypeScript",
        stars: 12,
        forks: 1,
        updatedAt: "2026-07-19T12:00:00Z",
        private: false,
        fork: false,
        archived: false,
      },
    ];
    githubMock.state.cloneDirectory = "/workspace";
    githubMock.state.clonePath = "/workspace/stash-app";
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /clonar do github/i }));
    expect(await screen.findByText("adila-sh/stash-app")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Buscar repositório…"), "stash");
    await user.click(screen.getAllByRole("button", { name: /^Clonar$/ }).at(-1)!);

    await waitFor(() => {
      expect(githubMock.github.cloneRepo).toHaveBeenCalledWith(
        "https://github.com/adila-sh/stash-app.git",
        "/workspace",
        "stash-app",
      );
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.OpenRepo",
        "/workspace/stash-app",
      );
    });
  });

  it("opens a repository and navigates through changes and history", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await user.click(screen.getByRole("link", { name: /mudanças/i }));

    expect(await screen.findByText("Working tree limpo")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /histórico/i }));

    expect(await screen.findByText("Sem commits ainda.")).toBeInTheDocument();
  });

  it("checks out an existing branch and creates a new branch", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    wailsMock.state.branches = [
      { name: "main", hash: "abc123", isCurrent: true, upstream: "origin/main" },
      { name: "feature/tests", hash: "def456", isCurrent: false, upstream: "origin/feature/tests" },
    ];
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await user.click(screen.getAllByRole("button", { name: /^main$/ })[0]);
    await user.click(await screen.findByRole("button", { name: /feature\/tests/i }));
    await waitFor(() => {
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.Checkout",
        "/workspace/stash-app",
        "feature/tests",
      );
    });

    await user.click(screen.getAllByRole("button", { name: /^main$/ })[0]);
    await user.click(await screen.findByText("Criar nova branch"));
    await user.type(screen.getByPlaceholderText("feature/minha-branch"), "feature/coverage");
    await user.click(screen.getByRole("button", { name: /criar e checkout/i }));
    await waitFor(() => {
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.CreateBranch",
        "/workspace/stash-app",
        "feature/coverage",
        true,
      );
    });
  });

  it("organizes repositories into collections, pins them and collapses the sidebar", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app", "/workspace/design-system"];
    const { user } = renderApp("/welcome");

    await screen.findAllByText("stash-app");
    await user.click(screen.getByRole("button", { name: "Nova coleção" }));
    await user.type(screen.getByPlaceholderText("Nome da coleção"), "Projects{Enter}");
    expect(await screen.findByText("Projects")).toBeInTheDocument();

    const repoName = screen.getAllByText("stash-app").find((element) => element.closest("aside"))!;
    const repoRow = repoName.closest("li")!;
    const menuTrigger = repoRow.querySelectorAll("button")[1];
    await user.click(menuTrigger);
    await user.click(screen.getByRole("button", { name: "Projects" }));
    expect(useRepoOrgStore.getState().assignments["/workspace/stash-app"]).toBe(
      useRepoOrgStore.getState().collections[0].id,
    );

    const movedRepoRow = screen
      .getAllByText("stash-app")
      .find((element) => element.closest("aside"))!
      .closest("li")!;
    await user.click(movedRepoRow.querySelectorAll("button")[1]);
    await user.click(screen.getByRole("button", { name: "Fixar" }));
    expect(useRepoOrgStore.getState().isPinned("/workspace/stash-app")).toBe(true);

    await user.click(screen.getByTitle("Recolher sidebar"));
    expect(screen.getByTitle("Expandir sidebar")).toBeInTheDocument();
    await user.click(screen.getByTitle("Expandir sidebar"));
    expect(screen.getByTitle("Recolher sidebar")).toBeInTheDocument();
  });

  it("stages a file and commits the staged change", async () => {
    const unstaged = { path: "src/app.tsx", status: "modified", staged: false };
    const staged = { ...unstaged, staged: true };
    const empty = { branch: "main", staged: [], unstaged: [], untracked: [] };
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    wailsMock.state.statusResponses = [
      { ...empty, unstaged: [unstaged] },
      { ...empty, staged: [staged] },
      empty,
    ];
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await user.click(screen.getByRole("link", { name: /mudanças/i }));
    await screen.findByText("src/app.tsx");
    await user.click(screen.getByTitle("Stage"));

    await waitFor(() => {
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.StageFile",
        "/workspace/stash-app",
        "src/app.tsx",
      );
    });

    await user.type(screen.getByPlaceholderText("Mensagem do commit"), "test: cover workflow");
    const commit = screen.getByTitle("Commit (⌘↵)");
    await waitFor(() => expect(commit).toBeEnabled());
    await user.click(commit);

    await waitFor(() => {
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.Commit",
        "/workspace/stash-app",
        "test: cover workflow",
        "",
        "",
      );
    });
  });

  it("discards an untracked file only after confirmation", async () => {
    const untracked = { path: "scratch.txt", status: "untracked", staged: false };
    const empty = { branch: "main", staged: [], unstaged: [], untracked: [] };
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    wailsMock.state.statusResponses = [{ ...empty, untracked: [untracked] }, empty];
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await user.click(screen.getByRole("link", { name: /mudanças/i }));
    await screen.findByText("scratch.txt");
    await user.click(screen.getAllByTitle("Descartar").at(-1)!);

    expect(
      screen.getByText(
        "Arquivos untracked serão removidos do disco. Mudanças locais serão revertidas.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Descartar" }).at(-1)!);

    await waitFor(() => {
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.DiscardFile",
        "/workspace/stash-app",
        "scratch.txt",
        true,
      );
    });
  });

  it("pushes local commits when the current branch is ahead", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    wailsMock.state.aheadBehind = { ahead: 2, behind: 0 };
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await user.click(screen.getByRole("link", { name: /mudanças/i }));
    const push = await screen.findByTitle("Push (⌘↵)");
    await user.click(push);

    await waitFor(() => {
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.Push",
        "/workspace/stash-app",
        "main",
      );
    });
  });

  it("validates and creates a pull request from the current branch", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    wailsMock.state.currentBranch = "feature/tests";
    wailsMock.state.status.branch = "feature/tests";
    wailsMock.state.branches = [
      { name: "main", hash: "abc123", isCurrent: false, upstream: "origin/main" },
      {
        name: "feature/tests",
        hash: "def456",
        isCurrent: true,
        upstream: "origin/feature/tests",
      },
    ];
    wailsMock.state.aheadBehind = { ahead: 2, behind: 1 };
    wailsMock.state.commits = [
      {
        hash: "def456",
        shortHash: "def456",
        subject: "test: cover pull request creation",
        body: "Adds integration coverage",
        authorName: "Adila",
        authorEmail: "dev@adila.co",
        authoredAt: "2026-07-19T12:00:00Z",
        parentHashes: ["abc123"],
      },
    ];
    githubMock.state.authenticated = true;
    githubMock.state.user = { login: "adila-dev", name: "Adila Dev", avatarUrl: "" };
    githubMock.github.createPullRequest.mockResolvedValueOnce({
      number: 51,
      htmlUrl: "https://github.com/adila-sh/stash-app/pull/51",
      title: "test: cover pull request creation",
      state: "open",
      head: "feature/tests",
      base: "main",
    });
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await user.click(await screen.findByTitle("Criar pull request"));
    expect(await screen.findByText(/está 2 commits à frente de/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Criar pull request" }));

    await waitFor(() => {
      expect(githubMock.github.createPullRequest).toHaveBeenCalledWith(
        "adila-sh",
        "stash-app",
        "main",
        "feature/tests",
        "test: cover pull request creation",
        "Adds integration coverage",
      );
    });
    expect(await screen.findByText("#51")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir no github/i })).toHaveAttribute(
      "href",
      "https://github.com/adila-sh/stash-app/pull/51",
    );
  });

  it("loads a commit and its changed files from history", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    wailsMock.state.commits = [
      {
        hash: "abc123def456",
        shortHash: "abc123d",
        subject: "Add frontend tests",
        body: "",
        authorName: "Adila",
        authorEmail: "dev@adila.co",
        authoredAt: "2026-07-19T12:00:00Z",
        parentHashes: ["parent123"],
      },
    ];
    wailsMock.state.commitDiff = {
      hash: "abc123def456",
      parent: "parent123",
      subject: "Add frontend tests",
      files: [
        {
          path: "frontend/src/app.tsx",
          oldText: "old",
          newText: "new",
          status: "modified",
          isBinary: false,
        },
      ],
    };
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await user.click(screen.getByRole("link", { name: /histórico/i }));
    await user.keyboard("j");

    expect(await screen.findByText("frontend/src/app.tsx")).toBeInTheDocument();
    expect(wailsMock.byName).toHaveBeenCalledWith(
      "main.GitService.CommitDiff",
      "/workspace/stash-app",
      "abc123def456",
    );
  });

  it("renders the unauthenticated pull request screens", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    const { router, user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await user.click(screen.getByRole("link", { name: /pull requests/i }));

    expect(
      await screen.findByText(/faça login no github no canto superior direito para listar prs/i),
    ).toBeInTheDocument();

    await router.navigate({ to: "/pull-requests/$number", params: { number: 42 } });

    expect(await screen.findByText("Faça login no GitHub para ver este PR.")).toBeInTheDocument();
  });

  it("loads pull requests for an authenticated GitHub user", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    githubMock.state.authenticated = true;
    githubMock.state.user = {
      login: "adila-dev",
      name: "Adila Dev",
      avatarUrl: "",
    };
    githubMock.state.pullRequests = [
      {
        number: 42,
        htmlUrl: "https://github.com/adila-sh/stash-app/pull/42",
        title: "Add Vitest coverage",
        state: "open",
        head: "tests/vitest",
        base: "main",
        author: "adila-dev",
        avatarUrl: "",
        updatedAt: "2026-07-19T12:00:00Z",
        draft: false,
        body: "",
      },
    ];
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await user.click(screen.getByRole("link", { name: /pull requests/i }));

    expect(await screen.findByText("Add Vitest coverage")).toBeInTheDocument();
    expect(githubMock.github.listPullRequests).toHaveBeenCalledWith(
      "adila-sh",
      "stash-app",
      "open",
    );
  });

  it("loads a pull request conversation, comments, merges and switches tabs", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    githubMock.state.authenticated = true;
    githubMock.state.user = { login: "adila-dev", name: "Adila Dev", avatarUrl: "" };
    githubMock.state.pullRequestDetail = {
      number: 42,
      htmlUrl: "https://github.com/adila-sh/stash-app/pull/42",
      title: "Full PR coverage",
      state: "open",
      head: "feature/tests",
      base: "main",
      author: "contributor",
      avatarUrl: "",
      updatedAt: "2026-07-19T12:00:00Z",
      draft: false,
      body: "PR description",
      headSha: "head-sha",
      baseSha: "base-sha",
      headRepoFullName: "adila-sh/stash-app",
      merged: false,
      mergeable: true,
      mergeableState: "clean",
      commentsCount: 0,
      reviewCommentsCount: 0,
      commits: 0,
      additions: 10,
      deletions: 2,
      changedFiles: 0,
      createdAt: "2026-07-19T11:00:00Z",
    };
    const { router, user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await router.navigate({ to: "/pull-requests/$number", params: { number: 42 } });
    expect(await screen.findByText("Full PR coverage")).toBeInTheDocument();
    expect(screen.getByText("PR description")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Deixe um comentário ou review…"), "Nice work");
    await user.click(screen.getByRole("button", { name: "Comentar" }));
    expect(githubMock.github.createIssueComment).toHaveBeenCalledWith(
      "adila-sh",
      "stash-app",
      42,
      "Nice work",
    );

    await user.click(screen.getByRole("button", { name: "Mesclar" }));
    await waitFor(() => {
      expect(githubMock.github.mergePullRequest).toHaveBeenCalledWith(
        "adila-sh",
        "stash-app",
        42,
        "merge",
      );
    });

    await user.click(screen.getByRole("button", { name: /Commits/ }));
    expect(screen.getByText("Sem commits neste PR.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Arquivos/ }));
    expect(screen.getByText("Nenhum arquivo modificado.")).toBeInTheDocument();
  });
});
