import { DataSource } from 'typeorm';

import 'reflect-metadata';

import { config } from '../config';

import { Acknowledgment } from './entities/Acknowledgment';
import { AICache } from './entities/AICache';
import { AICorrection } from './entities/AICorrection';
import { ComponentMapping } from './entities/ComponentMapping';
import { EditActivity } from './entities/EditActivity';
import { FeedbackEntity } from './entities/FeedbackEntity';
import { FeedbackResponseEntity } from './entities/FeedbackResponseEntity';
import { FeedbackVoteEntity } from './entities/FeedbackVoteEntity';
import { FileDraft } from './entities/FileDraft';
import { JobInsightResult } from './entities/JobInsightResult';
import { Launch } from './entities/Launch';
import { NotificationSubscription } from './entities/NotificationSubscription';
import { PersonReportEntity } from './entities/PersonReportEntity';
import { PipelineRun } from './entities/PipelineRun';
import { Quarantine } from './entities/Quarantine';
import { QuarantineLog } from './entities/QuarantineLog';
import { ReleaseMilestoneEntity } from './entities/ReleaseMilestone';
import { RepoConfigEntity } from './entities/RepoConfigEntity';
import { RepoFile } from './entities/RepoFile';
import { ReportEntity } from './entities/ReportEntity';
import { Repository } from './entities/Repository';
import { Setting } from './entities/Setting';
import { SettingsLog } from './entities/SettingsLog';
import { TeamMemberEntity } from './entities/TeamMemberEntity';
import { TestItem } from './entities/TestItem';
import { TriageLog } from './entities/TriageLog';
import { UserEntity } from './entities/UserEntity';
import { UserPreference } from './entities/UserPreference';
import { UserToken } from './entities/UserToken';
import { InitialSchema1709000000000 } from './migrations/1709000000000-InitialSchema';
import { AddArtifactsUrl1709000000001 } from './migrations/1709000000001-AddArtifactsUrl';
import { AddSettings1709000000002 } from './migrations/1709000000002-AddSettings';
import { AddComponent1709000000003 } from './migrations/1709000000003-AddComponent';
import { AddNotificationSubscriptions1709000000004 } from './migrations/1709000000004-AddNotificationSubscriptions';
import { AddSubscriptionTimezone1709000000005 } from './migrations/1709000000005-AddSubscriptionTimezone';
import { AddUsersAndPreferences1709000000006 } from './migrations/1709000000006-AddUsersAndPreferences';
import { AddSubscriptionJiraWebhook1709000000007 } from './migrations/1709000000007-AddSubscriptionJiraWebhook';
import { AddComponentToAckAndTriage1709000000008 } from './migrations/1709000000008-AddComponentToAckAndTriage';
import { AddComponentMappings1709000000009 } from './migrations/1709000000009-AddComponentMappings';
import { CleanupAutoMappings1709000000010 } from './migrations/1709000000010-CleanupAutoMappings';
import { AddJenkinsTeamToLaunches1709000000011 } from './migrations/1709000000011-AddJenkinsTeamToLaunches';
import { CleanSlate1709000000012 } from './migrations/1709000000012-CleanSlate';
import { AddJenkinsMetadataAndStatus1709000000013 } from './migrations/1709000000013-AddJenkinsMetadataAndStatus';
import { CleanSlateV21709000000014 } from './migrations/1709000000014-CleanSlateV2';
import { AddSettingsLog1709000000015 } from './migrations/1709000000015-AddSettingsLog';
import { AddSubscriptionReminder1709000000016 } from './migrations/1709000000016-AddSubscriptionReminder';
import { AddPipelineRuns1709000000018 } from './migrations/1709000000018-AddPipelineRuns';
import { AddTriageLogPinning1709000000019 } from './migrations/1709000000019-AddTriageLogPinning';
import { AddReleaseMilestones1709000000020 } from './migrations/1709000000020-AddReleaseMilestones';
import { AddAICache1709000000021 } from './migrations/1709000000021-AddAICache';
import { AddAICorrections1709000000022 } from './migrations/1709000000022-AddAICorrections';
import { AddTestExplorer1709000000023 } from './migrations/1709000000023-AddTestExplorer';
import { AddFileDrafts1709000000024 } from './migrations/1709000000024-AddFileDrafts';
import { AddEditActivity1709000000025 } from './migrations/1709000000025-AddEditActivity';
import { AddWeeklyReport1709000000026 } from './migrations/1709000000026-AddWeeklyReport';
import { AddWeeklyRepos1709000000027 } from './migrations/1709000000027-AddWeeklyRepos';
import { AddWeeklyAggregateStats1709000000028 } from './migrations/1709000000028-AddWeeklyAggregateStats';
import { ReportCompositeKey1709000000029 } from './migrations/1709000000029-ReportCompositeKey';
import { AddTeamReportChannels1709000000030 } from './migrations/1709000000030-AddTeamReportChannels';
import { AddSubscriptionType1709000000031 } from './migrations/1709000000031-AddSubscriptionType';
import { AddFeedback1709000000032 } from './migrations/1709000000032-AddFeedback';
import { AddJobInsight1709000000033 } from './migrations/1709000000033-AddJobInsight';
import { AddReportGeneratedBy1709000000034 } from './migrations/1709000000034-AddReportGeneratedBy';

export const AppDataSource = new DataSource({
  entities: [
    Launch,
    TestItem,
    Acknowledgment,
    TriageLog,
    Setting,
    NotificationSubscription,
    UserEntity,
    UserPreference,
    ComponentMapping,
    SettingsLog,
    PipelineRun,
    ReleaseMilestoneEntity,
    AICache,
    AICorrection,
    Repository,
    RepoFile,
    Quarantine,
    QuarantineLog,
    UserToken,
    FileDraft,
    EditActivity,
    FeedbackEntity,
    FeedbackVoteEntity,
    FeedbackResponseEntity,
    TeamMemberEntity,
    ReportEntity,
    PersonReportEntity,
    RepoConfigEntity,
    JobInsightResult,
  ],
  logging: false,
  migrations: [
    InitialSchema1709000000000,
    AddArtifactsUrl1709000000001,
    AddSettings1709000000002,
    AddComponent1709000000003,
    AddNotificationSubscriptions1709000000004,
    AddSubscriptionTimezone1709000000005,
    AddUsersAndPreferences1709000000006,
    AddSubscriptionJiraWebhook1709000000007,
    AddComponentToAckAndTriage1709000000008,
    AddComponentMappings1709000000009,
    CleanupAutoMappings1709000000010,
    AddJenkinsTeamToLaunches1709000000011,
    CleanSlate1709000000012,
    AddJenkinsMetadataAndStatus1709000000013,
    CleanSlateV21709000000014,
    AddSettingsLog1709000000015,
    AddSubscriptionReminder1709000000016,
    AddPipelineRuns1709000000018,
    AddTriageLogPinning1709000000019,
    AddReleaseMilestones1709000000020,
    AddAICache1709000000021,
    AddAICorrections1709000000022,
    AddTestExplorer1709000000023,
    AddFileDrafts1709000000024,
    AddEditActivity1709000000025,
    AddWeeklyReport1709000000026,
    AddWeeklyRepos1709000000027,
    AddWeeklyAggregateStats1709000000028,
    ReportCompositeKey1709000000029,
    AddTeamReportChannels1709000000030,
    AddSubscriptionType1709000000031,
    AddFeedback1709000000032,
    AddJobInsight1709000000033,
    AddReportGeneratedBy1709000000034,
  ],
  synchronize: false,
  type: 'postgres',
  url: config.db.url,
});
