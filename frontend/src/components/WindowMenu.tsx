import { useState } from "react";
import { Window } from "@wailsio/runtime";
import { useRouter } from "@tanstack/react-router";
import { Menu as MenuIcon } from "lucide-react";

import {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { git } from "@/lib/git";
import { useRepo } from "@/lib/repo-context";
import { useRepoOrgStore } from "@/lib/repo-org-store";
import { cn } from "@/lib/utils";

const NO_DRAG_STYLE = { "--wails-draggable": "no-drag" } as React.CSSProperties;

export function WindowMenu() {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const { addRepo, activeRepo } = useRepo();
  const toggleSidebar = useRepoOrgStore((s) => s.toggleSidebar);

  const openRepo = async () => {
    try {
      const path = await git.pickRepoFolder();
      if (path) await addRepo(path);
    } catch {
      /* ignored */
    }
  };

  return (
    <div style={NO_DRAG_STYLE} className="flex items-center">
      <Menubar className="h-6 gap-0 rounded-none border-0 bg-transparent p-0 shadow-none">
        <MenubarMenu>
          <MenubarTrigger
            onClick={(e) => {
              e.preventDefault();
              setExpanded((v) => !v);
            }}
            onPointerDown={(e) => e.preventDefault()}
            className={cn(
              // data-popup-open é o hook real do Base UI (Radix usava data-[state=open]); este
              // trigger específico não tem MenubarContent associado, então nunca fica com popup
              // aberto — mantido só por consistência com os demais triggers abaixo.
              "h-6 px-1.5 text-muted-foreground hover:text-foreground data-popup-open:bg-transparent",
              expanded && "text-foreground",
            )}
            aria-label="Alternar menu"
            aria-pressed={expanded}
          >
            <MenuIcon className="size-3.5" />
          </MenubarTrigger>
        </MenubarMenu>

        {expanded && (
          <>
            <MenubarMenu>
              <MenubarTrigger className="h-6 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground data-popup-open:text-foreground">
                Arquivo
              </MenubarTrigger>
              <MenubarContent>
                <MenubarGroup>
                  <MenubarItem onClick={openRepo}>
                    Abrir repositório <MenubarShortcut>⌘O</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem onClick={() => void router.navigate({ to: "/welcome" })}>
                    Boas-vindas <MenubarShortcut>⌘N</MenubarShortcut>
                  </MenubarItem>
                </MenubarGroup>
                <MenubarSeparator />
                <MenubarItem variant="destructive" onClick={() => void Window.Close()}>
                  Fechar janela
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger className="h-6 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground data-popup-open:text-foreground">
                Visualizar
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={toggleSidebar}>
                  Alternar sidebar <MenubarShortcut>⌘B</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarGroup>
                  <MenubarItem
                    disabled={!activeRepo}
                    onClick={() => void router.navigate({ to: "/changes" })}
                  >
                    Mudanças <MenubarShortcut>⌘1</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem
                    disabled={!activeRepo}
                    onClick={() => void router.navigate({ to: "/history" })}
                  >
                    Histórico <MenubarShortcut>⌘2</MenubarShortcut>
                  </MenubarItem>
                  <MenubarItem
                    disabled={!activeRepo}
                    onClick={() => void router.navigate({ to: "/pull-requests" })}
                  >
                    Pull Requests <MenubarShortcut>⌘3</MenubarShortcut>
                  </MenubarItem>
                </MenubarGroup>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger className="h-6 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground data-popup-open:text-foreground">
                Janela
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => void Window.Minimise()}>Minimizar</MenubarItem>
                <MenubarItem onClick={() => void Window.ToggleMaximise()}>
                  Maximizar / Restaurar
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={() => void router.navigate({ to: "/settings" })}>
                  Configurações <MenubarShortcut>⌘,</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </>
        )}
      </Menubar>
    </div>
  );
}
