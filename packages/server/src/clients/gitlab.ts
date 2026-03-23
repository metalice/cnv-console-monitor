import axios, { AxiosInstance } from 'axios';
import type { GitProvider, GitTreeEntry, GitFileContent, GitPRResult } from './git-provider';

export class GitLabProvider implements GitProvider {
  private client: AxiosInstance;
  private projectId: string;

  constructor(apiBaseUrl: string, projectId: string, token: string) {
    this.projectId = encodeURIComponent(projectId);
    this.client = axios.create({
      baseURL: apiBaseUrl,
      headers: { 'Private-Token': token },
      timeout: 30000,
    });
  }

  async fetchTree(branch: string): Promise<GitTreeEntry[]> {
    const entries: GitTreeEntry[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const res = await this.client.get(
        `/projects/${this.projectId}/repository/tree`,
        { params: { ref: branch, recursive: true, per_page: perPage, page } },
      );
      const items = res.data as Array<{ path: string; type: string; name: string }>;
      if (items.length === 0) break;
      for (const item of items) {
        entries.push({
          path: item.path,
          type: item.type === 'tree' ? 'tree' : 'blob',
          name: item.name,
        });
      }
      if (items.length < perPage) break;
      page++;
    }

    return entries;
  }

  async fetchFileContent(path: string, branch: string): Promise<GitFileContent> {
    const encodedPath = encodeURIComponent(path);
    const res = await this.client.get(
      `/projects/${this.projectId}/repository/files/${encodedPath}`,
      { params: { ref: branch } },
    );
    const data = res.data as { content: string; encoding: string; blob_id: string };
    const content = data.encoding === 'base64'
      ? Buffer.from(data.content, 'base64').toString('utf-8')
      : data.content;
    return { content, encoding: 'utf-8', sha: data.blob_id };
  }

  async createBranch(name: string, fromBranch: string): Promise<void> {
    await this.client.post(`/projects/${this.projectId}/repository/branches`, {
      branch: name,
      ref: fromBranch,
    });
  }

  async commitFile(
    branch: string,
    path: string,
    content: string,
    message: string,
  ): Promise<string> {
    const res = await this.client.post(
      `/projects/${this.projectId}/repository/commits`,
      {
        branch,
        commit_message: message,
        actions: [{ action: 'update', file_path: path, content }],
      },
    );
    return (res.data as { id: string }).id;
  }

  async createPR(params: {
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description: string;
  }): Promise<GitPRResult> {
    const res = await this.client.post(
      `/projects/${this.projectId}/merge_requests`,
      {
        source_branch: params.sourceBranch,
        target_branch: params.targetBranch,
        title: params.title,
        description: params.description,
      },
    );
    const data = res.data as { web_url: string; iid: number; title: string };
    return { url: data.web_url, number: data.iid, title: data.title };
  }
}
