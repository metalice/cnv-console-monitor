import axios, { type AxiosInstance } from 'axios';

import type { GitFileContent, GitProvider, GitPRResult, GitTreeEntry } from './git-provider';

export class GitHubProvider implements GitProvider {
  private client: AxiosInstance;
  private owner: string;
  private repo: string;

  constructor(apiBaseUrl: string, projectId: string, token: string) {
    const [owner, repo] = projectId.split('/');
    this.owner = owner;
    this.repo = repo;
    this.client = axios.create({
      baseURL: apiBaseUrl || 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000,
    });
  }

  async commitFile(
    branch: string,
    path: string,
    content: string,
    message: string,
  ): Promise<string> {
    let existingSha: string | undefined;
    try {
      const existing = await this.client.get(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
        params: { ref: branch },
      });
      existingSha = (existing.data as { sha: string }).sha;
    } catch {
      // File doesn't exist yet
    }

    const res = await this.client.put(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
      branch,
      content: Buffer.from(content).toString('base64'),
      message,
      ...(existingSha ? { sha: existingSha } : {}),
    });
    return (res.data as { commit: { sha: string } }).commit.sha;
  }

  async createBranch(name: string, fromBranch: string): Promise<void> {
    const refRes = await this.client.get(
      `/repos/${this.owner}/${this.repo}/git/ref/heads/${fromBranch}`,
    );
    const { sha } = (refRes.data as { object: { sha: string } }).object;
    try {
      await this.client.post(`/repos/${this.owner}/${this.repo}/git/refs`, {
        ref: `refs/heads/${name}`,
        sha,
      });
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status !== 422) throw err;
    }
  }

  async createPR(params: {
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description: string;
  }): Promise<GitPRResult> {
    const res = await this.client.post(`/repos/${this.owner}/${this.repo}/pulls`, {
      base: params.targetBranch,
      body: params.description,
      head: params.sourceBranch,
      title: params.title,
    });
    const data = res.data as { html_url: string; number: number; title: string };
    return { number: data.number, title: data.title, url: data.html_url };
  }

  async fetchFileContent(path: string, branch: string): Promise<GitFileContent> {
    const res = await this.client.get(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
      params: { ref: branch },
    });
    const data = res.data as { content: string; encoding: string; sha: string };
    const content =
      data.encoding === 'base64'
        ? Buffer.from(data.content, 'base64').toString('utf-8')
        : data.content;
    return { content, encoding: 'utf-8', sha: data.sha };
  }

  async fetchTree(branch: string): Promise<GitTreeEntry[]> {
    const res = await this.client.get(`/repos/${this.owner}/${this.repo}/git/trees/${branch}`, {
      params: { recursive: '1' },
    });
    const data = res.data as { tree: { path: string; type: string }[] };
    return data.tree.map(item => ({
      name: item.path.split('/').pop() || item.path,
      path: item.path,
      type: item.type === 'tree' ? ('tree' as const) : ('blob' as const),
    }));
  }
}
