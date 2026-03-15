import { apiFetch } from './client';

export type ArtifactFile = {
  name: string;
  testFile: string;
  url: string;
  path?: string;
};

export type ArtifactsResponse = {
  videos: ArtifactFile[];
  screenshots: ArtifactFile[];
  reports: Array<{ name: string; url: string }>;
  artifactsPageUrl: string | null;
};

export const fetchArtifacts = (launchId: number): Promise<ArtifactsResponse> =>
  apiFetch(`/artifacts/launch/${launchId}`);
