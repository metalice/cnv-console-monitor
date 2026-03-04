import { apiPost } from './client';

export function triggerAutoAnalysis(launchId: number) {
  return apiPost(`/analysis/${launchId}/auto`, {});
}

export function triggerPatternAnalysis(launchId: number) {
  return apiPost(`/analysis/${launchId}/pattern`, {});
}

export function triggerUniqueErrorAnalysis(launchId: number) {
  return apiPost(`/analysis/${launchId}/unique`, {});
}
