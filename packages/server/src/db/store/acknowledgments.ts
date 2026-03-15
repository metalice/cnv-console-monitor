import { AppDataSource } from '../data-source';
import { Acknowledgment } from '../entities/Acknowledgment';
import type { AcknowledgmentRecord } from './types';

const acknowledgments = () => AppDataSource.getRepository(Acknowledgment);

const toAckRecord = (row: Acknowledgment): AcknowledgmentRecord => {
  return {
    date: row.date,
    reviewer: row.reviewer,
    notes: row.notes ?? undefined,
    component: row.component ?? undefined,
    acknowledged_at: row.acknowledged_at?.toISOString() ?? undefined,
  };
}

export const addAcknowledgment = async (ack: AcknowledgmentRecord): Promise<void> => {
  await acknowledgments().save({
    date: ack.date,
    reviewer: ack.reviewer,
    notes: ack.notes ?? null,
    component: ack.component ?? null,
  });
}

export const getAcknowledgmentsForDate = async (date: string, component?: string): Promise<AcknowledgmentRecord[]> => {
  const where: Record<string, unknown> = { date };
  if (component) where.component = component;
  const rows = await acknowledgments().find({
    where,
    order: { acknowledged_at: 'ASC' },
  });
  return rows.map(toAckRecord);
}

export const deleteAcknowledgment = async (date: string, reviewer: string, component?: string): Promise<void> => {
  const where: Record<string, unknown> = { date, reviewer };
  if (component) where.component = component;
  await acknowledgments().delete(where);
}

export const getAckHistory = async (
  days: number,
): Promise<Array<{ date: string; reviewer: string; acknowledged_at: string | null }>> => {
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return acknowledgments()
    .createQueryBuilder('a')
    .select(['a.date as date', 'a.reviewer as reviewer', 'a.acknowledged_at as acknowledged_at'])
    .where('a.date >= :sinceDate', { sinceDate })
    .orderBy('a.date', 'DESC')
    .addOrderBy('a.acknowledged_at', 'ASC')
    .getRawMany();
}

export const getApproverStats = async (
  days: number,
): Promise<Array<{ reviewer: string; totalReviews: number; lastReviewDate: string }>> => {
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const rows = await acknowledgments()
    .createQueryBuilder('a')
    .select('a.reviewer', 'reviewer')
    .addSelect('COUNT(*)', 'totalReviews')
    .addSelect('MAX(a.date)', 'lastReviewDate')
    .where('a.date >= :sinceDate', { sinceDate })
    .groupBy('a.reviewer')
    .orderBy('"totalReviews"', 'DESC')
    .getRawMany();
  return rows.map((row) => ({ reviewer: row.reviewer, totalReviews: Number(row.totalReviews), lastReviewDate: row.lastReviewDate }));
}
