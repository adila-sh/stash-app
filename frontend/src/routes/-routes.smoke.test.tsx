import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "@/test/render-app";
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

  it("opens a repository and navigates through changes and history", async () => {
    wailsMock.state.repoPaths = ["/workspace/stash-app"];
    const { user } = renderApp("/welcome");

    await user.click(await screen.findByRole("button", { name: /stash-app.*abrir/i }));
    await user.click(screen.getByRole("link", { name: /mudanças/i }));

    expect(await screen.findByText("Working tree limpo")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /histórico/i }));

    expect(await screen.findByText("Sem commits ainda.")).toBeInTheDocument();
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
});
