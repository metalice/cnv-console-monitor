import type { DefectTypesResponse } from '@cnv-monitor/shared';

import { apiFetch } from './client';

export const fetchDefectTypes = (): Promise<DefectTypesResponse> => apiFetch('/defect-types');
