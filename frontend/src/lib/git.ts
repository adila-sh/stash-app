import { Call } from "@wailsio/runtime";

export function extractErrorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error && e.message) return e.message;
  if (e && typeof e === "object") {
    const obj = e as { message?: unknown; cause?: { message?: unknown } };
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (obj.cause && typeof obj.cause.message === "string") return obj.cause.message;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

export interface RepoInfo {
  path: string;
  name: string;
  currentBranch: string;
  head: string;
  hasChanges: boolean;
}

export interface FileChange {
  path: string;
  status: string;
  staged: boolean;
  oldPath?: string;
}

export interface StatusResult {
  branch: string;
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: FileChange[];
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  subject: string;
  body: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  parentHashes: string[];
}

export interface DiffResult {
  path: string;
  oldText: string;
  newText: string;
  status: string;
  isBinary: boolean;
}

export interface CommitFileDiff {
  path: string;
  oldPath?: string;
  oldText: string;
  newText: string;
  status: string;
  isBinary: boolean;
}

export interface CommitDiffResult {
  hash: string;
  parent?: string;
  subject: string;
  files: CommitFileDiff[];
}

export interface BranchInfo {
  name: string;
  hash: string;
  isCurrent: boolean;
  upstream?: string;
}

export interface RemoteInfo {
  url: string;
  host: string;
  owner: string;
  name: string;
  isGitHub: boolean;
}

const SERVICE = "main.GitService";

function call<T>(method: string, ...args: unknown[]): Promise<T> {
  return Call.ByName(`${SERVICE}.${method}`, ...args) as Promise<T>;
}

export const git = {
  openRepo: (path: string) => call<RepoInfo>("OpenRepo", path),
  closeRepo: (path: string) => call<void>("CloseRepo", path),
  status: (path: string) => call<StatusResult>("Status", path),
  stage: (repoPath: string, file: string) => call<void>("StageFile", repoPath, file),
  unstage: (repoPath: string, file: string) => call<void>("UnstageFile", repoPath, file),
  commit: (repoPath: string, message: string, name = "", email = "") =>
    call<string>("Commit", repoPath, message, name, email),
  log: (repoPath: string, limit = 100) => call<CommitInfo[]>("Log", repoPath, limit),
  branches: (repoPath: string) => call<BranchInfo[]>("ListBranches", repoPath),
  fileDiff: (repoPath: string, file: string, staged: boolean) =>
    call<DiffResult>("FileDiff", repoPath, file, staged),
  commitDiff: (repoPath: string, hash: string) =>
    call<CommitDiffResult>("CommitDiff", repoPath, hash),
  pickRepoFolder: () => call<string>("PickRepoFolder"),
  checkout: (repoPath: string, branch: string) =>
    call<void>("Checkout", repoPath, branch),
  createBranch: (repoPath: string, name: string, checkout: boolean) =>
    call<void>("CreateBranch", repoPath, name, checkout),
  push: (repoPath: string, branch: string) => call<void>("Push", repoPath, branch),
  remoteInfo: (repoPath: string) => call<RemoteInfo>("RemoteInfo", repoPath),
};
