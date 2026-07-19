import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { routeTree } from "@/routeTree.gen";

export function renderApp(initialEntry: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    defaultPreload: "intent",
  });

  return {
    router,
    user: userEvent.setup(),
    ...render(
      <HotkeysProvider>
        <RouterProvider router={router} />
      </HotkeysProvider>,
    ),
  };
}
