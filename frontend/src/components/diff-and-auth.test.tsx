import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DiffViewer } from "@/components/DiffViewer";
import { GitHubLoginButton } from "@/components/GitHubLoginButton";
import type { DiffResult } from "@/lib/git";
import { useSettingsStore } from "@/lib/settings-store";
import { githubMock } from "@/test/mocks/github";
import { wailsMock } from "@/test/mocks/wails";

vi.mock("@git-diff-view/file", () => ({
  generateDiffFile: vi.fn(() => ({
    additionLength: 1,
    deletionLength: 1,
    initTheme: vi.fn(),
    init: vi.fn(),
    buildSplitDiffLines: vi.fn(),
    buildUnifiedDiffLines: vi.fn(),
  })),
}));

vi.mock("@git-diff-view/react", () => ({
  DiffModeEnum: { Split: "split", Unified: "unified" },
  SplitSide: { old: "old", new: "new" },
  DiffView: () => <div data-testid="rendered-diff">rendered diff</div>,
}));

const TEXT_DIFF: DiffResult = {
  path: "src/app.ts",
  oldText: "const oldValue = 1;",
  newText: "const newValue = 2;",
  status: "modified",
  isBinary: false,
};

describe("DiffViewer", () => {
  it("covers loading, empty, lockfile and binary states", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { rerender } = render(<DiffViewer diff={null} loading />);
    expect(screen.getByText("Carregando diff…")).toBeInTheDocument();

    rerender(<DiffViewer diff={null} loading={false} />);
    expect(screen.getByText("Nada selecionado. Stashie está de boa.")).toBeInTheDocument();

    rerender(
      <DiffViewer
        loading={false}
        diff={{ ...TEXT_DIFF, path: "bun.lock", oldText: "", newText: "" }}
      />,
    );
    expect(
      screen.getByText("Arquivo .lock — Stashie não vai abrir essa caixa."),
    ).toBeInTheDocument();

    rerender(
      <DiffViewer loading={false} diff={{ ...TEXT_DIFF, path: "archive.zip", isBinary: true }} />,
    );
    expect(
      screen.getByText("Arquivo binário — Stashie não consegue ler isso."),
    ).toBeInTheDocument();
  });

  it("renders added, removed and compared images", () => {
    const added = {
      ...TEXT_DIFF,
      path: "new.png",
      isBinary: true,
      newImage: "data:image/png;base64,new",
    };
    const { rerender } = render(<DiffViewer diff={added} loading={false} />);
    expect(screen.getByRole("img", { name: "Adicionado" })).toHaveAttribute("src", added.newImage);

    rerender(
      <DiffViewer
        loading={false}
        diff={{
          ...added,
          status: "deleted",
          oldImage: "data:image/png;base64,old",
          newImage: undefined,
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Removido" })).toBeInTheDocument();

    rerender(
      <DiffViewer
        loading={false}
        diff={{
          ...added,
          status: "renamed",
          oldImage: "data:image/png;base64,old",
          newImage: "data:image/png;base64,new",
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Antes" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Depois (renomeado)" })).toBeInTheDocument();
  });

  it("renders a text diff using current settings and toggles its read state", async () => {
    const user = userEvent.setup();
    const onToggleMark = vi.fn();
    useSettingsStore.getState().update("diffStyle", "unified");
    useSettingsStore.getState().update("showFileHeader", true);
    render(
      <DiffViewer diff={TEXT_DIFF} loading={false} marked={false} onToggleMark={onToggleMark} />,
    );

    expect(screen.getByText("src/app.ts")).toBeInTheDocument();
    expect(screen.getByText("modified")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Marcar visto" }));
    expect(onToggleMark).toHaveBeenCalledOnce();
  });
});

describe("GitHubLoginButton", () => {
  it("opens, copies and cancels the device authorization flow", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    let releasePoll!: () => void;
    githubMock.github.pollDeviceToken.mockImplementationOnce(
      () => new Promise<undefined>((resolve) => (releasePoll = () => resolve(undefined))),
    );
    render(<GitHubLoginButton />);

    await user.click(await screen.findByRole("button", { name: /entrar com github/i }));
    expect(await screen.findByText("ABCD-EFGH")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copiar" }));
    expect(writeText).toHaveBeenCalledWith("ABCD-EFGH");
    expect(screen.getByRole("button", { name: "Copiado" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(wailsMock.openUrl).toHaveBeenCalledWith("https://github.com/login/device");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(githubMock.github.cancelDeviceFlow).toHaveBeenCalledOnce();
    act(() => releasePoll());
  });

  it("opens the user menu and logs out", async () => {
    githubMock.state.authenticated = true;
    githubMock.state.user = {
      login: "adila-dev",
      name: "Adila Dev",
      avatarUrl: "",
      email: "dev@adila.co",
    };
    const user = userEvent.setup();
    render(<GitHubLoginButton />);

    await user.click(await screen.findByTitle("adila-dev"));
    expect(screen.getByText("dev@adila.co")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sair" }));
    await waitFor(() => expect(githubMock.github.logout).toHaveBeenCalledOnce());
  });
});
