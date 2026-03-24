import { decryptValue, encryptValue, isSensitiveKey } from '../crypto';
import { AppDataSource } from '../data-source';
import { Setting } from '../entities/Setting';
import { SettingsLog } from '../entities/SettingsLog';

function mask(v: string): string {
  return v.length > 4 ? `••••${v.substring(v.length - 4)}` : '(set)';
}

const settings = () => AppDataSource.getRepository(Setting);
const settingsLog = () => AppDataSource.getRepository(SettingsLog);

export const getAllSettings = async (): Promise<Record<string, string>> => {
  const rows = await settings().find();
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = isSensitiveKey(row.key) ? decryptValue(row.value) : row.value;
  }
  return result;
};

export const getSetting = async (key: string): Promise<string | null> => {
  const row = await settings().findOneBy({ key });
  if (!row) {
    return null;
  }
  return isSensitiveKey(key) ? decryptValue(row.value) : row.value;
};

export const setSetting = async (key: string, value: string, updatedBy?: string): Promise<void> => {
  const existing = await settings().findOneBy({ key });
  const oldValue = existing
    ? isSensitiveKey(key)
      ? decryptValue(existing.value)
      : existing.value
    : null;

  const storedValue = isSensitiveKey(key) ? encryptValue(value) : value;

  await settings().upsert(
    { key, updated_by: updatedBy ?? null, value: storedValue },
    { conflictPaths: ['key'] },
  );

  if (oldValue !== value && !key.startsWith('_')) {
    const maskToken = (v: string | null) =>
      v && v.length > 4 ? `••••${v.substring(v.length - 4)}` : '(set)';
    const sensitive = isSensitiveKey(key);

    await settingsLog().insert({
      changed_by: updatedBy ?? null,
      key,
      new_value: sensitive ? maskToken(value) : value,
      old_value: sensitive ? (oldValue ? maskToken(oldValue) : null) : oldValue,
    });
  }
};

export const deleteSetting = async (key: string): Promise<void> => {
  await settings().delete({ key });
};

export type SettingsLogEntry = {
  id: number;
  key: string;
  old_value: string | null;
  new_value: string;
  changed_by: string | null;
  changed_at: Date;
};

export const getSettingsLog = async (limit = 50): Promise<SettingsLogEntry[]> => {
  const rows = await settingsLog().find({
    order: { changed_at: 'DESC' },
    take: limit,
    where: { key: undefined },
  });
  return rows.filter(r => !r.key.startsWith('_'));
};

export const cleanupInternalSettingsLogs = async (): Promise<number> => {
  const result = await settingsLog()
    .createQueryBuilder()
    .delete()
    .where('key LIKE :prefix', { prefix: '\\_%' })
    .execute();
  return result.affected ?? 0;
};

export const scrubSensitiveSettingsLogs = async (): Promise<number> => {
  const sensitivePatterns = ['token', 'pass', 'secret', 'key', 'webhook'];

  const allLogs = await settingsLog().find();
  let scrubbed = 0;
  for (const entry of allLogs) {
    const lk = entry.key.toLowerCase();
    if (!sensitivePatterns.some(p => lk.includes(p))) {
      continue;
    }
    let changed = false;
    if (entry.old_value && !entry.old_value.startsWith('••••')) {
      entry.old_value = mask(entry.old_value);
      changed = true;
    }
    if (entry.new_value && !entry.new_value.startsWith('••••')) {
      entry.new_value = mask(entry.new_value);
      changed = true;
    }
    if (changed) {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      await settingsLog().save(entry);
      scrubbed++;
    }
  }
  return scrubbed;
};
