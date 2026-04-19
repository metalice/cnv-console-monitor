const BOT_PATTERNS = ['[bot]', 'dependabot', 'openshift-cherrypick-robot', 'renovate', 'codecov'];

export const isBot = (username: string): boolean =>
  BOT_PATTERNS.some(pat => username.toLowerCase().includes(pat));

export const parseOwnerRepo = (url: string): string | null => {
  try {
    const { pathname } = new URL(url);
    const parts = pathname
      .replace(/^\//, '')
      .replace(/\.git$/, '')
      .split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  } catch {
    return null;
  }
};

export const parseProjectPath = (url: string): string | null => {
  try {
    const { pathname } = new URL(url);
    const path = pathname.replace(/^\//, '').replace(/\.git$/, '');
    return path || null;
  } catch {
    return null;
  }
};

export const parseBaseUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
};

export const stripMarkdownFences = (text: string): string => {
  const trimmed = text.trim();
  const lines = trimmed.split('\n');
  if (
    lines.length >= 2 &&
    lines[0].startsWith('```') &&
    lines[lines.length - 1].startsWith('```')
  ) {
    return lines.slice(1, -1).join('\n').trim();
  }
  return trimmed;
};

export const daysBetween = (from: string, to: Date): number =>
  Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000);
