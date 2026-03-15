import { AppDataSource } from '../data-source';
import { Setting } from '../entities/Setting';

const settings = () => AppDataSource.getRepository(Setting);

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
  await settings().upsert(
    { key, value, updated_by: updatedBy ?? null },
    { conflictPaths: ['key'] },
  );
}

export const deleteSetting = async (key: string): Promise<void> => {
  await settings().delete({ key });
}
