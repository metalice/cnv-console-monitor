import { createGitProvider } from '../clients/git-provider';
import { type Repository } from '../db/entities/Repository';
import { logger } from '../logger';

import { discoverStdTemplate, type GenerateInput, type RepoContext } from './DocGenerationService';

const log = logger.child({ module: 'DocGenHelpers' });

export const runWithConcurrency = async <T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> => {
  const results: PromiseSettledResult<T>[] = [];
  const executing = new Set<Promise<boolean>>();
  for (const task of tasks) {
    const promise = task().then(
      value => {
        results.push({ status: 'fulfilled', value });
        return true;
      },
      (reason: unknown) => {
        results.push({ reason, status: 'rejected' });
        return true;
      },
    );
    void promise.finally(() => executing.delete(promise));
    executing.add(promise);
    if (executing.size >= limit) {
      // eslint-disable-next-line no-await-in-loop -- sequential: must wait before adding more
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
};

const resolveToken = async (repo: Repository): Promise<string> => {
  const { getSetting } = await import('../db/store');
  let token = await getSetting(repo.global_token_key);
  if (!token) {
    const altKeys = [`${repo.provider}.token`, `${repo.provider}Token`];
    for (const key of altKeys) {
      if (key !== repo.global_token_key) {
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered fallback
        token = await getSetting(key);
        if (token) {
          break;
        }
      }
    }
  }
  if (!token) {
    const { AppDataSource } = await import('../db/data-source');
    const { decryptValue } = await import('../db/crypto');
    const rows: { encrypted_token: string }[] = await AppDataSource.query(
      `SELECT encrypted_token FROM user_tokens WHERE provider = $1 AND is_valid = true LIMIT 1`,
      [repo.provider],
    );
    if (rows.length > 0) {
      token = decryptValue(rows[0].encrypted_token);
    }
  }
  if (!token) {
    throw new Error(`No ${repo.provider} access token found for repository ${repo.name}`);
  }
  return token;
};

type GenerateResultFailed = { filePath: string; error: string }[];

export const initRepoContexts = async (
  repoGroups: Map<string, GenerateInput[]>,
  failed: GenerateResultFailed,
): Promise<Map<string, RepoContext>> => {
  const repoCache = new Map<string, RepoContext>();

  for (const [key, group] of repoGroups) {
    const { branch, repoId } = group[0];
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential: setup per repo
      const { getRepositoryById } = await import('../db/store');
      // eslint-disable-next-line no-await-in-loop -- sequential: setup per repo
      const repo = await getRepositoryById(repoId);
      if (!repo) {
        for (const entry of group) {
          failed.push({ error: `Repository ${repoId} not found`, filePath: entry.filePath });
        }
        continue;
      }
      // eslint-disable-next-line no-await-in-loop -- sequential: setup per repo
      const token = await resolveToken(repo);
      // eslint-disable-next-line no-await-in-loop -- sequential: setup per repo
      const provider = await createGitProvider(
        repo.provider as 'gitlab' | 'github',
        repo.api_base_url,
        repo.project_id,
        token,
      );
      // eslint-disable-next-line no-await-in-loop -- sequential: setup per repo
      const tree = await provider.fetchTree(branch);
      repoCache.set(key, { provider, repo, tree });

      // eslint-disable-next-line no-await-in-loop -- sequential: setup per repo
      await discoverStdTemplate(provider, tree, branch, `${repoId}:${branch}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize repo';
      log.error({ err, repoId }, 'Repo init failed for doc generation');
      for (const entry of group) {
        failed.push({ error: msg, filePath: entry.filePath });
      }
    }
  }

  return repoCache;
};
