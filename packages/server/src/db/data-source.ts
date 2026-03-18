import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config';
import { Launch } from './entities/Launch';
import { TestItem } from './entities/TestItem';
import { Acknowledgment } from './entities/Acknowledgment';
import { TriageLog } from './entities/TriageLog';
import { Setting } from './entities/Setting';
import { NotificationSubscription } from './entities/NotificationSubscription';
import { UserEntity } from './entities/UserEntity';
import { UserPreference } from './entities/UserPreference';
import { ComponentMapping } from './entities/ComponentMapping';
import { SettingsLog } from './entities/SettingsLog';
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
import { PipelineRun } from './entities/PipelineRun';
import { AddPipelineRuns1709000000018 } from './migrations/1709000000018-AddPipelineRuns';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.db.url,
  entities: [Launch, TestItem, Acknowledgment, TriageLog, Setting, NotificationSubscription, UserEntity, UserPreference, ComponentMapping, SettingsLog, PipelineRun],
  migrations: [InitialSchema1709000000000, AddArtifactsUrl1709000000001, AddSettings1709000000002, AddComponent1709000000003, AddNotificationSubscriptions1709000000004, AddSubscriptionTimezone1709000000005, AddUsersAndPreferences1709000000006, AddSubscriptionJiraWebhook1709000000007, AddComponentToAckAndTriage1709000000008, AddComponentMappings1709000000009, CleanupAutoMappings1709000000010, AddJenkinsTeamToLaunches1709000000011, CleanSlate1709000000012, AddJenkinsMetadataAndStatus1709000000013, CleanSlateV21709000000014, AddSettingsLog1709000000015, AddSubscriptionReminder1709000000016, AddPipelineRuns1709000000018],
  synchronize: false,
  logging: false,
});
