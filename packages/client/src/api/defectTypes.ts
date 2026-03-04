import type { DefectTypesResponse } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchDefectTypes(): Promise<DefectTypesResponse> {
  return apiFetch('/defect-types');
}
