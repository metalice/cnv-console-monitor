import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config';
import { Launch } from './entities/Launch';
import { TestItem } from './entities/TestItem';
import { Acknowledgment } from './entities/Acknowledgment';
import { TriageLog } from './entities/TriageLog';
import { InitialSchema1709000000000 } from './migrations/1709000000000-InitialSchema';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.db.url,
  entities: [Launch, TestItem, Acknowledgment, TriageLog],
  migrations: [InitialSchema1709000000000],
  synchronize: false,
  logging: false,
});
