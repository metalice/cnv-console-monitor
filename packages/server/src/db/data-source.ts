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
import { InitialSchema1709000000000 } from './migrations/1709000000000-InitialSchema';
import { AddArtifactsUrl1709000000001 } from './migrations/1709000000001-AddArtifactsUrl';
import { AddSettings1709000000002 } from './migrations/1709000000002-AddSettings';
import { AddComponent1709000000003 } from './migrations/1709000000003-AddComponent';
import { AddNotificationSubscriptions1709000000004 } from './migrations/1709000000004-AddNotificationSubscriptions';
import { AddSubscriptionTimezone1709000000005 } from './migrations/1709000000005-AddSubscriptionTimezone';
import { AddUsersAndPreferences1709000000006 } from './migrations/1709000000006-AddUsersAndPreferences';
import { AddSubscriptionJiraWebhook1709000000007 } from './migrations/1709000000007-AddSubscriptionJiraWebhook';
import { AddComponentToAckAndTriage1709000000008 } from './migrations/1709000000008-AddComponentToAckAndTriage';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.db.url,
  entities: [Launch, TestItem, Acknowledgment, TriageLog, Setting, NotificationSubscription, UserEntity, UserPreference],
  migrations: [InitialSchema1709000000000, AddArtifactsUrl1709000000001, AddSettings1709000000002, AddComponent1709000000003, AddNotificationSubscriptions1709000000004, AddSubscriptionTimezone1709000000005, AddUsersAndPreferences1709000000006, AddSubscriptionJiraWebhook1709000000007, AddComponentToAckAndTriage1709000000008],
  synchronize: false,
  logging: false,
});
