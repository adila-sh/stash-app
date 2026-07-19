import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DirtyTreeDialog } from "@/components/DirtyTreeDialog";
import { MenuItem, PopoverMenu } from "@/components/PopoverMenu";
import { StashiButton } from "@/components/StashiButton";
import { wailsMock } from "@/test/mocks/wails";
import { renderApp } from "@/test/render-app";

describe("window controls", () => {
  it("forwards minimize, maximize and close actions to Wails", async () => {
    const { user } = renderApp("/welcome");
    await screen.findByText("Nenhum repositório salvo ainda.");

    await user.click(screen.getByRole("button", { name: "Minimizar" }));
    await user.click(screen.getByRole("button", { name: "Maximizar" }));
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await user.dblClick(screen.getByText("stash", { selector: "span" }).parentElement!);

    expect(wailsMock.minimise).toHaveBeenCalledOnce();
    expect(wailsMock.toggleMaximise).toHaveBeenCalledTimes(2);
    expect(wailsMock.close).toHaveBeenCalledOnce();
  });

  it("expands the application menu and opens a repository", async () => {
    wailsMock.state.pickRepoFolder = "/workspace/menu-repo";
    const { user } = renderApp("/welcome");
    await screen.findByText("Nenhum repositório salvo ainda.");

    await user.click(screen.getByRole("menuitem", { name: "Alternar menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Arquivo" }));
    await user.click(await screen.findByRole("menuitem", { name: /abrir repositório/i }));

    await waitFor(() => {
      expect(wailsMock.byName).toHaveBeenCalledWith("main.GitService.PickRepoFolder");
      expect(wailsMock.byName).toHaveBeenCalledWith(
        "main.GitService.OpenRepo",
        "/workspace/menu-repo",
      );
    });
  });
});

describe("Stashi", () => {
  it("opens the mascot dialog and requests another joke", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    render(<StashiButton />);

    await user.click(screen.getByTitle("Falar com o Stashi"));
    expect(screen.getByText(/Por que o programador atravessou a rua/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Conta outra" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("popover menu", () => {
  it("opens, runs an action and closes", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(
      <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Menu</button>}>
        {(close) => (
          <MenuItem
            onClick={() => {
              action();
              close();
            }}
          >
            Action
          </MenuItem>
        )}
      </PopoverMenu>,
    );

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("button", { name: "Action" }));

    expect(action).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Action" })).not.toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(
      <PopoverMenu trigger={({ toggle }) => <button onClick={toggle}>Menu</button>}>
        {() => <MenuItem>Action</MenuItem>}
      </PopoverMenu>,
    );

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Action" })).not.toBeInTheDocument();
  });
});

describe("dirty tree recovery", () => {
  it("stashes changes and closes the dialog", async () => {
    const onOpenChange = vi.fn();
    const onStash = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(
      <DirtyTreeDialog
        open
        onOpenChange={onOpenChange}
        intent="trocar de branch"
        onStash={onStash}
        onDiscard={vi.fn(async () => undefined)}
      />,
    );

    await user.click(screen.getByRole("button", { name: /fazer stash e continuar/i }));

    await waitFor(() => expect(onStash).toHaveBeenCalledOnce());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog open and shows backend failures", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DirtyTreeDialog
        open
        onOpenChange={onOpenChange}
        intent="trocar de branch"
        onStash={vi.fn(async () => {
          throw new Error("stash failed");
        })}
        onDiscard={vi.fn(async () => undefined)}
      />,
    );

    await user.click(screen.getByRole("button", { name: /fazer stash e continuar/i }));

    expect(await screen.findByText("stash failed")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
