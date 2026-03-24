import fs from 'fs';
import path from 'path';

import type { PromptTemplate } from './types';

const PROMPTS_DIR = path.join(__dirname, 'prompts');

const templateCache = new Map<string, string>();

const loadTemplate = (name: string): string => {
  const cached = templateCache.get(name);
  if (cached !== undefined) {
    return cached;
  }
  const filePath = path.join(PROMPTS_DIR, `${name}.md`);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path constructed from __dirname, not user input
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt template not found: ${name}`);
  }
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path constructed from __dirname, not user input
  const content = fs.readFileSync(filePath, 'utf-8');
  templateCache.set(name, content);
  return content;
};

const renderTemplate = (template: string, vars: Record<string, unknown>): string => {
  let result = template;

  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match: string, key: string, body: string) => {
      const val = vars[key];
      return val ? body : '';
    },
  );

  result = result.replace(
    /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match: string, key: string, body: string) => {
      const arr = vars[key];
      if (!Array.isArray(arr)) {
        return '';
      }
      return arr
        .map((item: unknown) => {
          let row = body;
          row = row.replace(/\{\{this\.(\w+)\}\}/g, (_m: string, prop: string) =>
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            String((item as Record<string, unknown>)[prop] ?? ''),
          );
          row = row.replace(/\{\{this\}\}/g, String(item));
          return row;
        })
        .join('');
    },
  );

  result = result.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) =>
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    String(vars[key] ?? ''),
  );

  return result.trim();
};

export const getPrompt = (name: string, vars: Record<string, unknown> = {}): PromptTemplate => {
  const raw = loadTemplate(name);
  const parts = raw.split('---USER---');
  const systemPart = parts[0].trim();
  const userPart = parts.length > 1 ? parts[1].trim() : '';

  return {
    name,
    system: renderTemplate(systemPart, vars),
    user: renderTemplate(userPart, vars),
  };
};

export const listPrompts = (): string[] => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path constructed from __dirname, not user input
  if (!fs.existsSync(PROMPTS_DIR)) {
    return [];
  }
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path constructed from __dirname, not user input
  const entries = fs.readdirSync(PROMPTS_DIR);
  return entries.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
};

export const clearTemplateCache = (): void => {
  templateCache.clear();
};
