export type GitTreeEntry = {
  path: string;
  type: 'blob' | 'tree';
  name: string;
};

export type GitFileContent = {
  content: string;
  encoding: string;
  sha: string;
};

export type GitPRResult = {
  url: string;
  number: number;
  title: string;
};

export type GitProvider = {
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
};

export const createGitProvider = async (
  provider: 'gitlab' | 'github',
  apiBaseUrl: string,
  projectId: string,
  token: string,
): Promise<GitProvider> => {
  if (provider === 'gitlab') {
    const { GitLabProvider } = await import('./gitlab');
    return new GitLabProvider(apiBaseUrl, projectId, token);
  }
  const { GitHubProvider } = await import('./github-repo');
  return new GitHubProvider(apiBaseUrl, projectId, token);
};
