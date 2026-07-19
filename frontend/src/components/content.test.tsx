import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GithubErrorBanner } from "@/components/GithubErrorBanner";
import { Markdown } from "@/components/Markdown";
import { PullRequestCommits } from "@/components/PullRequestCommits";
import { PullRequestFiles } from "@/components/PullRequestFiles";
import type { PullRequestCommit, PullRequestFile, ReviewComment } from "@/lib/github";
import { githubMock } from "@/test/mocks/github";
import { wailsMock } from "@/test/mocks/wails";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 56,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 56,
      })),
    measureElement: vi.fn(),
  }),
}));

vi.mock("@/components/DiffViewer", () => ({
  DiffViewer: (props: {
    diff: { path: string; oldText: string; newText: string; isBinary: boolean } | null;
    comments: Array<{ id: number; side: string; line: number }>;
    marked: boolean;
    onToggleMark?: () => void;
    onCreateComment?: (comment: { line: number; side: "LEFT" | "RIGHT"; body: string }) => void;
  }) => (
    <div data-testid="diff-viewer">
      <span>{props.diff?.path ?? "no-diff"}</span>
      <span>{props.diff?.isBinary ? "binary" : props.diff?.newText}</span>
      <span>{props.comments.length} comments</span>
      <span>{props.marked ? "read" : "unread"}</span>
      <button type="button" onClick={props.onToggleMark}>
        toggle read
      </button>
      <button
        type="button"
        onClick={() => props.onCreateComment?.({ line: 12, side: "RIGHT", body: "Looks good" })}
      >
        comment
      </button>
    </div>
  ),
}));

const FILES: PullRequestFile[] = [
  {
    filename: "src/app.tsx",
    status: "modified",
    additions: 2,
    deletions: 1,
    changes: 3,
    patch: "@@ -1,2 +1,3 @@\n-old\n+new\n context",
    sha: "abc",
    previousFilename: "",
  },
  {
    filename: "assets/logo.png",
    status: "added",
    additions: 0,
    deletions: 0,
    changes: 0,
    patch: "",
    sha: "def",
    previousFilename: "",
  },
];

describe("GitHub error banner", () => {
  it("renders nothing without an error", () => {
    const { container } = render(<GithubErrorBanner error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explains OAuth restrictions and opens the remediation page", async () => {
    const user = userEvent.setup();
    render(
      <GithubErrorBanner error="The `adila-sh` organization has enabled OAuth App access restrictions" />,
    );

    expect(screen.getByText(/organização adila-sh restringe acesso/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /abrir configurações/i }));
    expect(wailsMock.openUrl).toHaveBeenCalledWith(
      "https://github.com/settings/connections/applications",
    );
  });
});

describe("Markdown", () => {
  it("does not render blank content", () => {
    const { container } = render(<Markdown> </Markdown>);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders GFM and delegates external links to Wails", async () => {
    const user = userEvent.setup();
    render(<Markdown>{"- [x] shipped\n\n[external](https://adila.co) · [local](/docs)"}</Markdown>);

    expect(screen.getByRole("checkbox")).toBeDisabled();
    await user.click(screen.getByRole("link", { name: "external" }));
    expect(wailsMock.openUrl).toHaveBeenCalledWith("https://adila.co");

    expect(screen.getByRole("link", { name: "local" })).toHaveAttribute("href", "/docs");
    expect(wailsMock.openUrl).toHaveBeenCalledTimes(1);
  });
});

describe("pull request commits", () => {
  it("shows the empty state", () => {
    render(<PullRequestCommits commits={[]} />);
    expect(screen.getByText("Sem commits neste PR.")).toBeInTheDocument();
  });

  it("renders commit metadata and opens GitHub", async () => {
    const user = userEvent.setup();
    const commit: PullRequestCommit = {
      sha: "abcdef123456",
      shortSha: "abcdef1",
      message: "feat: tests",
      subject: "feat: tests",
      authorName: "Adila",
      authorEmail: "dev@adila.co",
      authorLogin: "adila-dev",
      avatarUrl: "",
      authoredAt: new Date().toISOString(),
      htmlUrl: "https://github.com/adila-sh/stash-app/commit/abcdef1",
    };
    render(<PullRequestCommits commits={[commit]} />);

    expect(screen.getByText("feat: tests")).toBeInTheDocument();
    expect(screen.getByText("adila-dev")).toBeInTheDocument();
    await user.click(screen.getByTitle("Abrir commit no GitHub"));
    expect(wailsMock.openUrl).toHaveBeenCalledWith(commit.htmlUrl);
  });
});

describe("pull request files", () => {
  it("shows the empty state", () => {
    render(
      <PullRequestFiles
        owner="adila-sh"
        repo="stash-app"
        number={42}
        files={[]}
        reviewComments={[]}
        commitId="head"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Nenhum arquivo modificado.")).toBeInTheDocument();
  });

  it("filters files, persists read state and creates review comments", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const reviewComment = {
      id: 7,
      path: "src/app.tsx",
      line: 2,
      side: "LEFT",
      author: "reviewer",
      avatarUrl: "",
      createdAt: "2026-07-19T00:00:00Z",
      body: "Please change",
    } as ReviewComment;
    render(
      <PullRequestFiles
        owner="adila-sh"
        repo="stash-app"
        number={42}
        files={FILES}
        reviewComments={[reviewComment]}
        commitId="head-sha"
        onChange={onChange}
      />,
    );

    expect(screen.getByTestId("diff-viewer")).toHaveTextContent("src/app.tsx");
    expect(screen.getByTestId("diff-viewer")).toHaveTextContent("1 comments");
    await user.click(screen.getAllByTitle("Marcar como lido")[0]);
    expect(localStorage.getItem("stash:pr-read:adila-sh/stash-app#42")).toBe('["src/app.tsx"]');

    await user.type(screen.getByPlaceholderText("Buscar arquivo…"), "logo");
    expect(screen.getByText("assets/logo.png")).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText("Buscar arquivo…"));
    await user.click(screen.getByText("assets/logo.png"));
    expect(screen.getByTestId("diff-viewer")).toHaveTextContent("binary");

    await user.click(screen.getByRole("button", { name: "comment" }));
    expect(githubMock.github.createReviewComment).toHaveBeenCalledWith(
      "adila-sh",
      "stash-app",
      42,
      "head-sha",
      "assets/logo.png",
      12,
      "RIGHT",
      "Looks good",
    );
    expect(onChange).toHaveBeenCalledOnce();
  });
});
