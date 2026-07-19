import { beforeEach, describe, expect, it } from "vitest";

import { useRepoOrgStore } from "@/lib/repo-org-store";
import { useSettingsStore } from "@/lib/settings-store";

describe("settings store", () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  it("updates settings and applies window-related values to the document", () => {
    useSettingsStore.getState().update("windowOpacity", 1);
    useSettingsStore.getState().update("windowBlur", 8);
    useSettingsStore.getState().update("reduceMotion", true);

    expect(useSettingsStore.getState()).toMatchObject({
      windowOpacity: 1,
      windowBlur: 8,
      reduceMotion: true,
    });
    expect(document.documentElement.style.getPropertyValue("--window-bg-alpha")).toBe("1");
    expect(document.documentElement.style.getPropertyValue("--window-blur")).toBe("8px");
    expect(document.documentElement.dataset.reduceMotion).toBe("true");
  });

  it("restores all defaults", () => {
    useSettingsStore.getState().update("diffStyle", "split");
    useSettingsStore.getState().update("tabWidth", 8);
    useSettingsStore.getState().reset();

    expect(useSettingsStore.getState()).toMatchObject({ diffStyle: "unified", tabWidth: 2 });
  });
});

describe("repository organization store", () => {
  beforeEach(() => {
    useRepoOrgStore.setState({
      collections: [],
      pinned: [],
      assignments: {},
      uncategorizedCollapsed: false,
      sidebarCollapsed: false,
    });
  });

  it("creates, renames and deletes collections with their assignments", () => {
    const store = useRepoOrgStore.getState();
    const id = store.createCollection(" Work ");
    useRepoOrgStore.getState().renameCollection(id, "Projects");
    useRepoOrgStore.getState().assignToCollection("/repo", id);

    expect(useRepoOrgStore.getState().collections).toEqual([
      { id, name: "Projects", order: 0, collapsed: false },
    ]);
    expect(useRepoOrgStore.getState().assignments).toEqual({ "/repo": id });

    useRepoOrgStore.getState().deleteCollection(id);
    expect(useRepoOrgStore.getState().collections).toEqual([]);
    expect(useRepoOrgStore.getState().assignments).toEqual({});
  });

  it("pins and unpins repositories", () => {
    useRepoOrgStore.getState().togglePin("/repo");
    expect(useRepoOrgStore.getState().isPinned("/repo")).toBe(true);
    useRepoOrgStore.getState().togglePin("/repo");
    expect(useRepoOrgStore.getState().isPinned("/repo")).toBe(false);
  });

  it("reorders collections and normalizes their order", () => {
    const first = useRepoOrgStore.getState().createCollection("First");
    const second = useRepoOrgStore.getState().createCollection("Second");
    useRepoOrgStore.getState().reorderCollection(second, "up");

    expect(useRepoOrgStore.getState().collections.map(({ id, order }) => ({ id, order }))).toEqual([
      { id: second, order: 0 },
      { id: first, order: 1 },
    ]);
  });

  it("removes pins and assignments for repositories that no longer exist", () => {
    const id = useRepoOrgStore.getState().createCollection("Projects");
    useRepoOrgStore.getState().togglePin("/keep");
    useRepoOrgStore.getState().togglePin("/remove");
    useRepoOrgStore.getState().assignToCollection("/keep", id);
    useRepoOrgStore.getState().assignToCollection("/remove", id);

    useRepoOrgStore.getState().cleanupForPaths(["/keep"]);

    expect(useRepoOrgStore.getState().pinned).toEqual(["/keep"]);
    expect(useRepoOrgStore.getState().assignments).toEqual({ "/keep": id });
  });
});
