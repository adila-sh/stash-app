import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isDirtyTreeError } from "@/components/DirtyTreeDialog";
import { diffLines } from "@/lib/diff";
import { relativeTime } from "@/lib/format";
import { extractErrorMessage } from "@/lib/git";
import { describeGithubError, translatePrCreateError } from "@/lib/github-errors";
import { lineDiffCounts } from "@/lib/line-diff";

describe("core formatting and diff helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["2026-07-19T14:59:30Z", "30s atrás"],
    ["2026-07-19T14:55:00Z", "5min atrás"],
    ["2026-07-19T12:00:00Z", "3h atrás"],
    ["2026-07-17T15:00:00Z", "2d atrás"],
  ])("formats %s as %s", (iso, expected) => {
    expect(relativeTime(iso)).toBe(expected);
  });

  it("clamps future dates and ignores invalid dates", () => {
    expect(relativeTime("2026-07-19T16:00:00Z")).toBe("0s atrás");
    expect(relativeTime("not-a-date")).toBe("");
  });

  it("produces correctly numbered add, delete and context lines", () => {
    expect(diffLines("one\ntwo", "one\nthree")).toEqual([
      { kind: "context", oldNumber: 1, newNumber: 1, text: "one" },
      { kind: "del", oldNumber: 2, newNumber: null, text: "two" },
      { kind: "add", oldNumber: null, newNumber: 2, text: "three" },
    ]);
  });

  it("counts changed lines with duplicate content", () => {
    expect(lineDiffCounts("same\nsame\nold", "same\nnew\nsame")).toEqual({ add: 1, del: 1 });
  });

  it("uses the bounded fallback for very large files", () => {
    const oldText = Array.from({ length: 1300 }, (_, index) => `line-${index}`).join("\n");
    const newText = `${oldText}\nextra`;
    expect(lineDiffCounts(oldText, newText)).toEqual({ add: 1, del: 0 });
  });
});

describe("error translation", () => {
  it("extracts messages from common backend error shapes", () => {
    expect(extractErrorMessage("plain error")).toBe("plain error");
    expect(extractErrorMessage(new Error("failure"))).toBe("failure");
    expect(extractErrorMessage({ cause: { message: "nested" } })).toBe("nested");
  });

  it("recognizes dirty working tree errors", () => {
    expect(isDirtyTreeError(new Error("A árvore de trabalho tem alterações não commitadas"))).toBe(
      true,
    );
    expect(isDirtyTreeError(new Error("network error"))).toBe(false);
  });

  it.each([
    ["Bad credentials", "Credenciais inválidas"],
    ["API rate limit exceeded", "Limite de requisições"],
    ["404 Not Found", "Recurso não encontrado"],
  ])("translates GitHub error %s", (raw, expected) => {
    expect(describeGithubError(new Error(raw)).message).toContain(expected);
  });

  it("provides actionable pull request validation messages", () => {
    expect(translatePrCreateError("no commits between base and head", "main", "feature")).toBe(
      "Sem commits entre main e feature. Faça um commit novo (ou troque a base) antes de abrir o PR.",
    );
    expect(translatePrCreateError("A pull request already exists", "main", "feature")).toContain(
      "Já existe um pull request",
    );
    expect(translatePrCreateError("head sha can't be blank", "main", "feature")).toContain(
      "Faça push",
    );
  });
});
