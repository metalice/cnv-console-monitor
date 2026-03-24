import { AppDataSource } from '../data-source';
import { UserEntity } from '../entities/UserEntity';
import { UserPreference } from '../entities/UserPreference';

import type { UserPreferencesData, UserRecord } from './types';

const users = () => AppDataSource.getRepository(UserEntity);
const userPrefs = () => AppDataSource.getRepository(UserPreference);

const toUserRecord = (row: UserEntity): UserRecord => ({
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: DB data
  createdAt: row.created_at?.toISOString() ?? new Date().toISOString(),
  email: row.email,
  lastLogin: row.last_login?.toISOString() ?? null,
  name: row.name,
  role: row.role,
});

export const upsertUser = async (email: string, name: string): Promise<UserRecord> => {
  const existing = await users().findOneBy({ email });
  if (existing) {
    existing.last_login = new Date();
    if (name && name !== existing.name) {
      existing.name = name;
    }
    await users().save(existing);
    return toUserRecord(existing);
  }
  const row = await users().save({ email, last_login: new Date(), name, role: 'user' });
  return toUserRecord(row);
};

export const getUser = async (email: string): Promise<UserRecord | undefined> => {
  const row = await users().findOneBy({ email });
  return row ? toUserRecord(row) : undefined;
};

export const getAllUsers = async (): Promise<UserRecord[]> => {
  const rows = await users().find({ order: { last_login: 'DESC' } });
  return rows.map(toUserRecord);
};

export const setUserRole = async (email: string, role: string): Promise<UserRecord | undefined> => {
  await users().update({ email }, { role });
  return getUser(email);
};

export const hasAnyAdmin = async (): Promise<boolean> => {
  const count = await users().count({ where: { role: 'admin' } });
  return count > 0;
};

export const getUserPreferences = async (email: string): Promise<UserPreferencesData> => {
  const row = await userPrefs().findOneBy({ user_email: email });
  if (!row) {
    return {};
  }
  try {
    return JSON.parse(row.preferences) as UserPreferencesData;
  } catch {
    return {};
  }
};

export const setUserPreferences = async (
  email: string,
  prefs: UserPreferencesData,
): Promise<void> => {
  await userPrefs().upsert(
    { preferences: JSON.stringify(prefs), user_email: email },
    { conflictPaths: ['user_email'] },
  );
};
