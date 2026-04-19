import { type FeatureGroupProps } from '../FeatureCard';

import { ADMINISTRATION_GROUP } from './adminFeatures';
import { AI_FEATURES_GROUP } from './aiFeatures';
import { TRENDS_ANALYTICS_GROUP } from './analyticsFeatures';
import { COMPONENTS_GROUP } from './componentFeatures';
import { DAILY_MONITORING_GROUP, TEST_ANALYSIS_GROUP } from './monitoringFeatures';
import {
  FEEDBACK_GROUP,
  NOTIFICATIONS_GROUP,
  RELEASES_GROUP,
  TEAM_REPORT_GROUP,
  TRIAGE_JIRA_GROUP,
} from './workflowFeatures';

export const FEATURE_GROUPS: FeatureGroupProps[] = [
  DAILY_MONITORING_GROUP,
  TEST_ANALYSIS_GROUP,
  TRENDS_ANALYTICS_GROUP,
  TRIAGE_JIRA_GROUP,
  RELEASES_GROUP,
  TEAM_REPORT_GROUP,
  COMPONENTS_GROUP,
  AI_FEATURES_GROUP,
  NOTIFICATIONS_GROUP,
  FEEDBACK_GROUP,
  ADMINISTRATION_GROUP,
];
