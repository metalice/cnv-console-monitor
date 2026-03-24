import https from 'https';

import axios, { type AxiosInstance } from 'axios';

import type { GitFileContent, GitProvider, GitPRResult, GitTreeEntry } from './git-provider';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export class GitLabProvider implements GitProvider {
  private client: AxiosInstance;
  private projectId: string;

  constructor(apiBaseUrl: string, projectId: string, token: string) {
    this.projectId = encodeURIComponent(projectId);
    this.client = axios.create({
      baseURL: apiBaseUrl,
      headers: { 'Private-Token': token },
      httpsAgent,
      timeout: 30000,
    });
  }

  async commitFile(
    branch: string,
    path: string,
    content: string,
    message: string,
  ): Promise<string> {
    const res = await this.client.post(`/projects/${this.projectId}/repository/commits`, {
      actions: [{ action: 'update', content, file_path: path }],
      branch,
      commit_message: message,
    });
    return (res.data as { id: string }).id;
  }

  async createBranch(name: string, fromBranch: string): Promise<void> {
    await this.client.post(`/projects/${this.projectId}/repository/branches`, {
      branch: name,
      ref: fromBranch,
    });
  }

  async createPR(params: {
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description: string;
  }): Promise<GitPRResult> {
    const res = await this.client.post(`/projects/${this.projectId}/merge_requests`, {
      description: params.description,
      source_branch: params.sourceBranch,
      target_branch: params.targetBranch,
      title: params.title,
    });
    const data = res.data as { web_url: string; iid: number; title: string };
    return { number: data.iid, title: data.title, url: data.web_url };
  }

  async fetchFileContent(path: string, branch: string): Promise<GitFileContent> {
    const encodedPath = encodeURIComponent(path);
    const res = await this.client.get(
      `/projects/${this.projectId}/repository/files/${encodedPath}`,
      { params: { ref: branch } },
    );
    const data = res.data as { content: string; encoding: string; blob_id: string };
    const content =
      data.encoding === 'base64'
        ? Buffer.from(data.content, 'base64').toString('utf-8')
        : data.content;
    return { content, encoding: 'utf-8', sha: data.blob_id };
  }

  async fetchTree(branch: string): Promise<GitTreeEntry[]> {
    const entries: GitTreeEntry[] = [];
    let page = 1;
    const perPage = 100;

    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      const res = await this.client.get(`/projects/${this.projectId}/repository/tree`, {
        params: { page, per_page: perPage, recursive: true, ref: branch },
      });
      const items = res.data as { path: string; type: string; name: string }[];
      if (items.length === 0) {
        break;
      }
      for (const item of items) {
        entries.push({
          name: item.name,
          path: item.path,
          type: item.type === 'tree' ? 'tree' : 'blob',
        });
      }
      if (items.length < perPage) {
        break;
      }
      page++;
    }

    return entries;
  }
}
