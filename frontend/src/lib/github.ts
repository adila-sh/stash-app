import { GitHub as GitHubAPI } from "../../bindings/changeme";

export interface DeviceFlowStart {
  userCode: string;
  verificationUri: string;
  deviceCode: string;
  interval: number;
  expiresIn: number;
}

export interface GitHubUser {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string;
  company: string;
  location: string;
  blog: string;
  email: string;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
}

export interface CloneProgress {
  cloneUrl: string;
  phase: string;
  percent: number;
  done: boolean;
  error?: string;
}

export interface PullRequestInfo {
  number: number;
  htmlUrl: string;
  title: string;
  state: string;
  head: string;
  base: string;
}

export interface GitHubUserRepo {
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  cloneUrl: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
}

export const github = {
  isAuthenticated: () => GitHubAPI.IsAuthenticated() as unknown as Promise<boolean>,
  logout: () => GitHubAPI.Logout() as unknown as Promise<void>,
  getUser: () => GitHubAPI.GetUser() as unknown as Promise<GitHubUser>,
  startDeviceFlow: () => GitHubAPI.StartDeviceFlow() as unknown as Promise<DeviceFlowStart>,
  pollDeviceToken: (deviceCode: string, interval: number) =>
    GitHubAPI.PollDeviceToken(deviceCode, interval) as unknown as Promise<void>,
  cancelDeviceFlow: () => GitHubAPI.CancelDeviceFlow() as unknown as Promise<void>,
  listMyRepos: (limit: number) =>
    GitHubAPI.ListMyRepos(limit) as unknown as Promise<GitHubUserRepo[]>,
  pickCloneDirectory: () => GitHubAPI.PickCloneDirectory() as unknown as Promise<string>,
  cloneRepo: (cloneURL: string, parentDir: string, name: string) =>
    GitHubAPI.CloneRepo(cloneURL, parentDir, name) as unknown as Promise<string>,
  createPullRequest: (
    owner: string,
    repo: string,
    base: string,
    head: string,
    title: string,
    body: string,
  ) =>
    GitHubAPI.CreatePullRequest(owner, repo, base, head, title, body) as unknown as Promise<
      PullRequestInfo
    >,
};
