import { apiPost } from './client';

type AnalysisResponse = { success: boolean; launchId: number; analysis: string };

export const triggerAutoAnalysis = (launchId: number): Promise<AnalysisResponse> =>
  apiPost(`/analysis/${launchId}/auto`, {});

export const triggerPatternAnalysis = (launchId: number): Promise<AnalysisResponse> =>
  apiPost(`/analysis/${launchId}/pattern`, {});

export const triggerUniqueErrorAnalysis = (launchId: number): Promise<AnalysisResponse> =>
  apiPost(`/analysis/${launchId}/unique`, {});
