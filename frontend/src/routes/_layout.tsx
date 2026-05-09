import { Outlet, createFileRoute, Link, useLocation, useRouter } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Settings as SettingsIcon } from "lucide-react";

import { BranchSelector } from "@/components/BranchSelector";
import { GitHubLoginButton } from "@/components/GitHubLoginButton";
import { RepoSidebar } from "@/components/RepoSidebar";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WindowTitleBar } from "@/components/WindowTitleBar";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { git } from "@/lib/git";
import { RepoProvider, useRepo } from "@/lib/repo-context";
import { useRepoOrgStore } from "@/lib/repo-org-store";
import { useSettings } from "@/lib/settings-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_layout")({
  component: LayoutComponent,
});

function LayoutComponent() {
  return (
    <RepoProvider>
      <Shell />
    </RepoProvider>
  );
}

function Shell() {
  const { repos, activePath, setActivePath, addRepo, removeRepo, activeRepo, status, error } =
    useRepo();
  const location = useLocation();
  const router = useRouter();
  const toggleSidebar = useRepoOrgStore((s) => s.toggleSidebar);
  const { settings } = useSettings();

  const totalChanges = status
    ? status.staged.length + status.unstaged.length + status.untracked.length
    : 0;

  useHotkey("Mod+B", (e) => {
    e.preventDefault();
    toggleSidebar();
  });

  useHotkey("Mod+1", (e) => {
    if (!activeRepo) return;
    e.preventDefault();
    void router.navigate({ to: "/changes" });
  }, { enabled: Boolean(activeRepo) });

  useHotkey("Mod+2", (e) => {
    if (!activeRepo) return;
    e.preventDefault();
    void router.navigate({ to: "/history" });
  }, { enabled: Boolean(activeRepo) });

  useHotkey("Mod+,", (e) => {
    e.preventDefault();
    void router.navigate({ to: "/settings" });
  });

  useHotkey("Mod+O", async (e) => {
    e.preventDefault();
    try {
      const path = await git.pickRepoFolder();
      if (path) await addRepo(path);
    } catch {
      /* ignored: surfaced via context error */
    }
  });

  return (
    <MotionConfig reducedMotion={settings.reduceMotion ? "always" : "never"}>
    <div
      className="flex h-screen w-screen flex-col overflow-hidden text-foreground backdrop-blur-xl"
      style={{
        backgroundColor: `color-mix(in oklab, var(--background) ${settings.windowOpacity * 100}%, transparent)`,
      }}
    >
      <WindowTitleBar title={activeRepo ? `stash · ${activeRepo.name}` : "stash"} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <RepoSidebar
          repos={repos}
          active={activePath}
          onSelect={setActivePath}
          onAdd={addRepo}
          onRemove={removeRepo}
        />

        <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex h-10 items-center gap-3 border-b border-border bg-card px-3 text-xs">
          {activeRepo ? (
            <>
              <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
                {activeRepo.name}
              </span>
              <span className="text-muted-foreground">/</span>
              <BranchSelector />
              {error && (
                <span className="ml-2 truncate text-[11px] text-destructive" title={error}>
                  {error}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              Sem repositório ativo
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/settings"
              title="Configurações (⌘,)"
              className="flex size-7 items-center justify-center border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground" }}
            >
              <SettingsIcon className="size-3.5" />
            </Link>
            <GitHubLoginButton />
          </div>
        </header>

        {activeRepo ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <nav className="flex items-center border-b border-border bg-card text-[11px]">
              <TabLink to="/changes" shortcut="1">
                MUDANÇAS
                {totalChanges > 0 && (
                  <span className="ml-2 border border-border px-1 text-[9px] tabular-nums text-muted-foreground">
                    {totalChanges}
                  </span>
                )}
              </TabLink>
              <TabLink to="/history" shortcut="2">HISTÓRICO</TabLink>
            </nav>

            <div className="flex flex-1 overflow-hidden">
              <Outlet />
            </div>
          </div>
        ) : location.pathname === "/settings" ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex flex-1 overflow-hidden"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-1 overflow-hidden"
          >
            <WelcomeScreen />
          </motion.div>
        )}
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}

function TabLink({
  to,
  children,
  shortcut,
}: {
  to: "/changes" | "/history" | "/settings";
  children: React.ReactNode;
  shortcut?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group/tab flex h-8 items-center gap-2 border-r border-border px-3 font-medium uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
      )}
      activeProps={{
        className: "bg-background text-foreground border-b-0 -mb-px border-b-background",
      }}
    >
      <span className="flex items-center">{children}</span>
      {shortcut && (
        <KbdGroup className="opacity-0 transition-opacity group-hover/tab:opacity-100">
          <Kbd>⌘</Kbd>
          <Kbd>{shortcut}</Kbd>
        </KbdGroup>
      )}
    </Link>
  );
}
