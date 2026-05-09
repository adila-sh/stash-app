import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Collection {
  id: string;
  name: string;
  order: number;
  collapsed: boolean;
}

interface RepoOrgState {
  collections: Collection[];
  pinned: string[];
  assignments: Record<string, string>;
  uncategorizedCollapsed: boolean;
  sidebarCollapsed: boolean;

  togglePin: (path: string) => void;
  isPinned: (path: string) => boolean;

  createCollection: (name: string) => string;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  toggleCollapsed: (id: string | null) => void;
  reorderCollection: (id: string, dir: "up" | "down") => void;

  assignToCollection: (path: string, collectionId: string | null) => void;
  cleanupForPaths: (existingPaths: string[]) => void;

  toggleSidebar: () => void;
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const useRepoOrgStore = create<RepoOrgState>()(
  persist(
    (set, get) => ({
      collections: [],
      pinned: [],
      assignments: {},
      uncategorizedCollapsed: false,
      sidebarCollapsed: false,

      togglePin: (path) =>
        set((s) => ({
          pinned: s.pinned.includes(path)
            ? s.pinned.filter((p) => p !== path)
            : [...s.pinned, path],
        })),

      isPinned: (path) => get().pinned.includes(path),

      createCollection: (name) => {
        const id = genId();
        set((s) => ({
          collections: [
            ...s.collections,
            { id, name: name.trim(), order: s.collections.length, collapsed: false },
          ],
        }));
        return id;
      },

      renameCollection: (id, name) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, name: name.trim() } : c,
          ),
        })),

      deleteCollection: (id) =>
        set((s) => {
          const nextAssignments = { ...s.assignments };
          for (const [path, cid] of Object.entries(nextAssignments)) {
            if (cid === id) delete nextAssignments[path];
          }
          return {
            collections: s.collections
              .filter((c) => c.id !== id)
              .map((c, i) => ({ ...c, order: i })),
            assignments: nextAssignments,
          };
        }),

      toggleCollapsed: (id) =>
        set((s) => {
          if (id === null) {
            return { uncategorizedCollapsed: !s.uncategorizedCollapsed };
          }
          return {
            collections: s.collections.map((c) =>
              c.id === id ? { ...c, collapsed: !c.collapsed } : c,
            ),
          };
        }),

      reorderCollection: (id, dir) =>
        set((s) => {
          const sorted = [...s.collections].sort((a, b) => a.order - b.order);
          const idx = sorted.findIndex((c) => c.id === id);
          if (idx < 0) return {};
          const swap = dir === "up" ? idx - 1 : idx + 1;
          if (swap < 0 || swap >= sorted.length) return {};
          [sorted[idx], sorted[swap]] = [sorted[swap], sorted[idx]];
          return { collections: sorted.map((c, i) => ({ ...c, order: i })) };
        }),

      assignToCollection: (path, collectionId) =>
        set((s) => {
          const next = { ...s.assignments };
          if (collectionId === null) {
            delete next[path];
          } else {
            next[path] = collectionId;
          }
          return { assignments: next };
        }),

      cleanupForPaths: (existingPaths) =>
        set((s) => {
          const known = new Set(existingPaths);
          const nextAssignments: Record<string, string> = {};
          for (const [path, cid] of Object.entries(s.assignments)) {
            if (known.has(path)) nextAssignments[path] = cid;
          }
          return {
            assignments: nextAssignments,
            pinned: s.pinned.filter((p) => known.has(p)),
          };
        }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "stash:repo-org",
      version: 1,
      partialize: (s) => ({
        collections: s.collections,
        pinned: s.pinned,
        assignments: s.assignments,
        uncategorizedCollapsed: s.uncategorizedCollapsed,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);
