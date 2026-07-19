import { vi } from "vitest";

export const githubMock = (() => {
  const state = {
    authenticated: false,
    user: null as Record<string, unknown> | null,
    deviceFlow: {
      userCode: "ABCD-EFGH",
      verificationUri: "https://github.com/login/device",
      deviceCode: "device-code",
      interval: 5,
      expiresIn: 900,
    },
    repos: [] as Array<Record<string, unknown>>,
    cloneDirectory: "",
    clonePath: "",
    pullRequests: [] as Array<Record<string, unknown>>,
    pullRequestDetail: null as Record<string, unknown> | null,
    issueComments: [] as Array<Record<string, unknown>>,
    reviews: [] as Array<Record<string, unknown>>,
    reviewComments: [] as Array<Record<string, unknown>>,
    pullRequestFiles: [] as Array<Record<string, unknown>>,
    pullRequestCommits: [] as Array<Record<string, unknown>>,
  };

  const github = {
    isAuthenticated: vi.fn(async () => state.authenticated),
    getUser: vi.fn(async () => state.user),
    logout: vi.fn(async (): Promise<void> => undefined),
    startDeviceFlow: vi.fn(async () => state.deviceFlow),
    pollDeviceToken: vi.fn(async (): Promise<void> => undefined),
    cancelDeviceFlow: vi.fn(async (): Promise<void> => undefined),
    listMyRepos: vi.fn(async () => state.repos),
    pickCloneDirectory: vi.fn(async () => state.cloneDirectory),
    cloneRepo: vi.fn(async () => state.clonePath),
    createPullRequest: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
    listPullRequests: vi.fn(async () => state.pullRequests),
    getPullRequest: vi.fn(async () => state.pullRequestDetail),
    mergePullRequest: vi.fn(async () => undefined),
    listIssueComments: vi.fn(async () => state.issueComments),
    createIssueComment: vi.fn(async () => null),
    listReviews: vi.fn(async () => state.reviews),
    listReviewComments: vi.fn(async () => state.reviewComments),
    listPullRequestFiles: vi.fn(async () => state.pullRequestFiles),
    listPullRequestCommits: vi.fn(async () => state.pullRequestCommits),
    createReview: vi.fn(async () => null),
    createReviewComment: vi.fn(async () => null),
    replyToReviewComment: vi.fn(async () => null),
  };

  const reset = () => {
    state.authenticated = false;
    state.user = null;
    state.deviceFlow = {
      userCode: "ABCD-EFGH",
      verificationUri: "https://github.com/login/device",
      deviceCode: "device-code",
      interval: 5,
      expiresIn: 900,
    };
    state.repos = [];
    state.cloneDirectory = "";
    state.clonePath = "";
    state.pullRequests = [];
    state.pullRequestDetail = null;
    state.issueComments = [];
    state.reviews = [];
    state.reviewComments = [];
    state.pullRequestFiles = [];
    state.pullRequestCommits = [];
  };

  return { github, reset, state };
})();

vi.doMock("@/lib/github", () => ({
  github: githubMock.github,
}));
