import { apiPost } from './client';

type AnalysisResponse = { success: boolean; launchId: number; analysis: string };

export function triggerAutoAnalysis(launchId: number): Promise<AnalysisResponse> {
  return apiPost(`/analysis/${launchId}/auto`, {});
}

export function triggerPatternAnalysis(launchId: number): Promise<AnalysisResponse> {
  return apiPost(`/analysis/${launchId}/pattern`, {});
}

export function triggerUniqueErrorAnalysis(launchId: number): Promise<AnalysisResponse> {
  return apiPost(`/analysis/${launchId}/unique`, {});
}
