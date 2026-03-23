export interface GitTreeEntry {
  path: string;
  type: 'blob' | 'tree';
  name: string;
}

export interface GitFileContent {
  content: string;
  encoding: string;
  sha: string;
}

export interface GitPRResult {
  url: string;
  number: number;
  title: string;
}

export interface GitProvider {
  fetchTree(branch: string): Promise<GitTreeEntry[]>;
  fetchFileContent(path: string, branch: string): Promise<GitFileContent>;
  createBranch(name: string, fromBranch: string): Promise<void>;
  commitFile(branch: string, path: string, content: string, message: string): Promise<string>;
  createPR(params: {
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description: string;
  }): Promise<GitPRResult>;
}

export const createGitProvider = (
  provider: 'gitlab' | 'github',
  apiBaseUrl: string,
  projectId: string,
  token: string,
): GitProvider => {
  if (provider === 'gitlab') {
    const { GitLabProvider } = require('./gitlab');
    return new GitLabProvider(apiBaseUrl, projectId, token);
  }
  const { GitHubProvider } = require('./github-repo');
  return new GitHubProvider(apiBaseUrl, projectId, token);
};
