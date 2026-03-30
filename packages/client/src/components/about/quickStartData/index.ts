import { SETUP_GUIDES } from './setupGuides';
import { type QuickStartDef } from './types';
import { WORKFLOW_GUIDES } from './workflowGuides';

export const QUICK_START_GUIDES: QuickStartDef[] = [...SETUP_GUIDES, ...WORKFLOW_GUIDES];
