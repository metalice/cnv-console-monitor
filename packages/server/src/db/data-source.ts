import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config';
import { Launch } from './entities/Launch';
import { TestItem } from './entities/TestItem';
import { Acknowledgment } from './entities/Acknowledgment';
import { TriageLog } from './entities/TriageLog';
import { Setting } from './entities/Setting';
import { InitialSchema1709000000000 } from './migrations/1709000000000-InitialSchema';
import { AddArtifactsUrl1709000000001 } from './migrations/1709000000001-AddArtifactsUrl';
import { AddSettings1709000000002 } from './migrations/1709000000002-AddSettings';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.db.url,
  entities: [Launch, TestItem, Acknowledgment, TriageLog, Setting],
  migrations: [InitialSchema1709000000000, AddArtifactsUrl1709000000001, AddSettings1709000000002],
  synchronize: false,
  logging: false,
});
