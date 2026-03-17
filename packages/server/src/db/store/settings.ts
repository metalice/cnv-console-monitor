import { AppDataSource } from '../data-source';
import { Setting } from '../entities/Setting';
import { SettingsLog } from '../entities/SettingsLog';

const settings = () => AppDataSource.getRepository(Setting);
const settingsLog = () => AppDataSource.getRepository(SettingsLog);

export const getAllSettings = async (): Promise<Record<string, string>> => {
  const rows = await settings().find();
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}

export const getSetting = async (key: string): Promise<string | null> => {
  const row = await settings().findOneBy({ key });
  return row?.value ?? null;
}

export const setSetting = async (key: string, value: string, updatedBy?: string): Promise<void> => {
  const existing = await settings().findOneBy({ key });
  const oldValue = existing?.value ?? null;

  await settings().upsert(
    { key, value, updated_by: updatedBy ?? null },
    { conflictPaths: ['key'] },
  );

  if (oldValue !== value) {
    const maskToken = (v: string | null) => v && v.length > 4 ? `••••${v.substring(v.length - 4)}` : '(set)';
    const isSensitive = key.includes('token') || key.includes('pass') || key.includes('secret');

    await settingsLog().insert({
      key,
      old_value: isSensitive ? (oldValue ? maskToken(oldValue) : null) : oldValue,
      new_value: isSensitive ? maskToken(value) : value,
      changed_by: updatedBy ?? null,
    });
  }
}

export const deleteSetting = async (key: string): Promise<void> => {
  await settings().delete({ key });
}

export type SettingsLogEntry = {
  id: number;
  key: string;
  old_value: string | null;
  new_value: string;
  changed_by: string | null;
  changed_at: Date;
};

export const getSettingsLog = async (limit = 50): Promise<SettingsLogEntry[]> => {
  return settingsLog().find({
    order: { changed_at: 'DESC' },
    take: limit,
  });
}
