export type {
  LaunchRecord,
  TestItemRecord,
  AcknowledgmentRecord,
  TriageLogRecord,
  SubscriptionRecord,
  UserRecord,
  UserPreferencesData,
  ActivityLogEntry,
  FailureStreakInfo,
  RunStatus,
} from './types';

export {
  upsertLaunch,
  getLaunchesSince,
  getLaunchesInRange,
  getLastPassedLaunchTime,
  getLaunchByRpId,
  getLaunchCount,
  getDistinctComponents,
  getLaunchesWithoutComponent,
  getAllLaunchesForRemap,
  updateLaunchComponent,
  clearAllLaunches,
  getMostRecentLaunchTime,
} from './launches';

export type { EnrichmentStats } from './enrichment';
export {
  getEnrichmentStats,
  getLaunchesWithFailedEnrichment,
  getLaunchesPendingEnrichment,
  getDistinctJenkinsTeams,
  updateComponentByJenkinsTeam,
  backfillComponentFromSiblings,
} from './enrichment';

export {
  upsertTestItem,
  getFailedTestItems,
  getAllTestItems,
  getFailedTestItemsForLaunches,
  getTestItemByRpId,
  updateTestItemDefect,
  updateTestItemJira,
  getUntriagedItems,
  getTestItemHistory,
  clearAllTestItems,
} from './testItems';

export {
  getFailureHeatmap,
  getTopFailingTests,
  getAIPredictionAccuracy,
} from './analytics';

export {
  getPassRateTrend,
  getPassRateTrendByVersion,
  getErrorPatterns,
  getDefectTypesTrend,
} from './trends';

export {
  getTestFailureStreak,
  getCurrentlyFailingTests,
  getClusterReliability,
  getFailuresByHour,
  getNewlyFailingUniqueIds,
} from './streaks';

export { getFlakyTests } from './flaky';

export {
  addAcknowledgment,
  getAcknowledgmentsForDate,
  deleteAcknowledgment,
  getAckHistory,
  getApproverStats,
} from './acknowledgments';

export { addTriageLog, getActivityLog } from './triage';

export {
  getAllSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from './subscriptions';

export {
  upsertUser,
  getUser,
  getAllUsers,
  setUserRole,
  hasAnyAdmin,
  getUserPreferences,
  setUserPreferences,
} from './users';

export type { SettingsLogEntry } from './settings';
export {
  getAllSettings,
  getSetting,
  setSetting,
  deleteSetting,
  getSettingsLog,
  cleanupInternalSettingsLogs,
  scrubSensitiveSettingsLogs,
} from './settings';

export type { ComponentMappingRecord, UnmappedLaunchEntry } from './componentMappings';
export {
  getAllComponentMappings,
  upsertComponentMapping,
  deleteComponentMapping,
  getUnmappedLaunchNames,
  getMatchCountForPattern,
  getMatchingLaunchNames,
} from './componentMappings';

export {
  getAllRepositories,
  getEnabledRepositories,
  getRepositoryById,
  getRepositoriesByComponent,
  createRepository,
  updateRepository,
  deleteRepository,
} from './repositories';

export {
  getFilesByRepo,
  getFilesByType,
  getFileByPath,
  upsertRepoFile,
  updateFileCounterpart,
  clearRepoFiles,
  getOrphanedDocs,
  getUndocumentedTests,
  getRepoFileStats,
} from './repoFiles';

export {
  createQuarantine,
  getQuarantineById,
  getQuarantines,
  getActiveQuarantines,
  getOverdueQuarantines,
  updateQuarantineStatus,
  resolveQuarantine,
  getQuarantineByTestName,
  addQuarantineLog,
  getQuarantineLogs,
  getQuarantineStats,
  getQuarantineHistory,
} from './quarantines';

export {
  getUserTokens,
  getUserToken,
  getDecryptedToken,
  saveUserToken,
  deleteUserToken,
  invalidateUserToken,
} from './userTokens';
