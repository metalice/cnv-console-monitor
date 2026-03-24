import { apiFetch, apiPost } from './client';

export type ComponentMappingRecord = {
  pattern: string;
  component: string;
  type: string;
  createdAt: string;
  matchCount: number;
};

type MappingSummary = {
  totalLaunches: number;
  mappedLaunches: number;
  unmappedLaunches: number;
  componentCount: number;
  coveragePercent: number;
};

export type UnmappedEntry = { name: string; count: number; jobDeleted: boolean };

type MappingsResponse = {
  mappings: ComponentMappingRecord[];
  unmapped: UnmappedEntry[];
  jiraComponents: string[];
  launchCount: number;
  summary: MappingSummary;
};

type PreviewResponse = {
  matches: string[];
  totalCount: number;
  nameCount: number;
  conflicts?: { pattern: string; component: string }[];
};

export const fetchComponentMappings = (): Promise<MappingsResponse> =>
  apiFetch<MappingsResponse>('/component-mappings');

export const previewPattern = (pattern: string, includeDeleted = false): Promise<PreviewResponse> =>
  apiFetch<PreviewResponse>(
    `/component-mappings/preview?pattern=${encodeURIComponent(pattern)}&includeDeleted=${includeDeleted}`,
  );

export const upsertComponentMapping = (
  pattern: string,
  component: string,
  type?: string,
  includeDeleted?: boolean,
): Promise<{ success: boolean }> =>
  apiFetch('/component-mappings', {
    body: JSON.stringify({ component, includeDeleted, pattern, type }),
    method: 'PUT',
  });

export type LaunchDetails = {
  found: boolean;
  name?: string;
  totalRuns?: number;
  passed?: number;
  failed?: number;
  inProgress?: number;
  firstRun?: number;
  lastRun?: number;
  cnvVersion?: string;
  tier?: string;
  component?: string;
  jenkinsTeam?: string;
  jenkinsStatus?: string;
  jenkinsMetadata?: Record<string, unknown>;
  artifactsUrl?: string;
};

export const fetchLaunchDetails = (launchName: string): Promise<LaunchDetails> =>
  apiFetch<LaunchDetails>(`/component-mappings/launch-details/${encodeURIComponent(launchName)}`);

export const deleteComponentMapping = async (pattern: string): Promise<{ success: boolean }> => {
  const response = await fetch(`/api/component-mappings/${encodeURIComponent(pattern)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete mapping');
  }
  return response.json() as Promise<{ success: boolean }>;
};

type AutoMapResult = {
  success: boolean;
  mapped: { jenkinsTeam: string; jiraComponent: string; score: number }[];
  unmapped: string[];
};

export const triggerAutoMap = (): Promise<AutoMapResult> =>
  apiPost('/component-mappings/auto-map', {});
