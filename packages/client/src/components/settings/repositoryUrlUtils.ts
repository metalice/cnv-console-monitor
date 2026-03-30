const stripTrailingSlashes = (str: string): string => {
  let trimmed = str;
  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
};

export const cleanRepoUrl = (repoUrl: string): { repoRoot: string; subPath: string } => {
  const gitlabSep = repoUrl.indexOf('/-/');
  if (gitlabSep !== -1) {
    const root = repoUrl.slice(0, gitlabSep);
    const rest = repoUrl.slice(gitlabSep + 3);
    const pathMatch = /^(?:tree|blob)\/[^/]+\/([^/?#\s]+)\/?\s*$/.exec(rest);
    return { repoRoot: root, subPath: pathMatch?.[1] || '' };
  }
  const githubMatch =
    /^(https:\/\/github\.com\/[^/]+\/[^/]+)(?:\/tree\/[^/]+\/([^/?#\s]+)\/?\s*)?$/.exec(repoUrl);
  if (githubMatch) {
    return { repoRoot: githubMatch[1], subPath: githubMatch[2] || '' };
  }
  return { repoRoot: stripTrailingSlashes(repoUrl), subPath: '' };
};

export const deriveApiUrl = (provider: string, repoUrl: string): string => {
  if (provider === 'github') {
    return 'https://api.github.com';
  }
  if (!repoUrl) {
    return '';
  }
  try {
    const { repoRoot } = cleanRepoUrl(repoUrl);
    const parsed = new URL(repoRoot);
    return `${parsed.origin}/api/v4`;
  } catch {
    return '';
  }
};

const parseRepoPathParts = (repoUrl: string): string[] => {
  const { repoRoot } = cleanRepoUrl(repoUrl);
  const parsed = new URL(repoRoot);
  return parsed.pathname
    .replace(/^\//, '')
    .replace(/\.git$/, '')
    .split('/');
};

export const deriveProjectId = (provider: string, repoUrl: string): string => {
  if (provider !== 'github' || !repoUrl) {
    return '';
  }
  try {
    const parts = parseRepoPathParts(repoUrl);
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  } catch {
    /* invalid URL */
  }
  return '';
};

export const deriveDisplayName = (repoUrl: string): string => {
  if (!repoUrl) {
    return '';
  }
  try {
    const parts = parseRepoPathParts(repoUrl);
    if (parts.length >= 2) {
      return parts.slice(-2).join(' / ');
    }
    if (parts.length === 1 && parts[0]) {
      return parts[0];
    }
  } catch {
    /* invalid URL */
  }
  return '';
};
