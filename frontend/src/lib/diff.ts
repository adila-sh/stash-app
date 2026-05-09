// Simple line-based LCS diff. Returns a unified-style hunk list suitable for
// rendering side-by-side or inline. Good enough for v0 — replace with a real
// diff lib later if needed.

export type DiffLineKind = "context" | "add" | "del";

export interface DiffLine {
  kind: DiffLineKind;
  oldNumber: number | null;
  newNumber: number | null;
  text: string;
}

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const m = a.length;
  const n = b.length;

  // LCS table
  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from<number>({ length: n + 1 }).fill(0),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldNum = 1;
  let newNum = 1;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({
        kind: "context",
        oldNumber: oldNum++,
        newNumber: newNum++,
        text: a[i],
      });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({
        kind: "del",
        oldNumber: oldNum++,
        newNumber: null,
        text: a[i],
      });
      i++;
    } else {
      out.push({
        kind: "add",
        oldNumber: null,
        newNumber: newNum++,
        text: b[j],
      });
      j++;
    }
  }
  while (i < m) {
    out.push({ kind: "del", oldNumber: oldNum++, newNumber: null, text: a[i] });
    i++;
  }
  while (j < n) {
    out.push({ kind: "add", oldNumber: null, newNumber: newNum++, text: b[j] });
    j++;
  }
  return out;
}
