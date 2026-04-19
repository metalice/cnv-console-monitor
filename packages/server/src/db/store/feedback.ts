import { AppDataSource } from '../data-source';
import { FeedbackEntity } from '../entities/FeedbackEntity';
import { FeedbackResponseEntity } from '../entities/FeedbackResponseEntity';
import { FeedbackVoteEntity } from '../entities/FeedbackVoteEntity';

const feedbackRepo = () => AppDataSource.getRepository(FeedbackEntity);
const voteRepo = () => AppDataSource.getRepository(FeedbackVoteEntity);
const responseRepo = () => AppDataSource.getRepository(FeedbackResponseEntity);

type CreateFeedbackData = {
  category: string;
  componentFilter?: string | null;
  consoleErrors?: string | null;
  description: string;
  pageUrl: string;
  screenshot?: string | null;
  submittedBy: string;
  userAgent?: string | null;
};

export const createFeedback = async (data: CreateFeedbackData): Promise<FeedbackEntity> => {
  const entity = feedbackRepo().create({
    category: data.category,
    component_filter: data.componentFilter ?? null,
    console_errors: data.consoleErrors ?? null,
    description: data.description,
    page_url: data.pageUrl,
    screenshot: data.screenshot ?? null,
    submitted_by: data.submittedBy,
    user_agent: data.userAgent ?? null,
  });
  return feedbackRepo().save(entity);
};

type ListFeedbackFilters = {
  category?: string;
  limit?: number;
  page?: number;
  priority?: string;
  sort?: 'newest' | 'votes';
  status?: string;
};

type ListFeedbackResult = {
  items: FeedbackEntity[];
  page: number;
  pageSize: number;
  total: number;
};

export const listFeedback = async (
  filters: ListFeedbackFilters = {},
  currentUserEmail?: string,
): Promise<ListFeedbackResult & { votedIds: Set<number> }> => {
  const pageSize = Math.min(filters.limit ?? 20, 100);
  const page = Math.max(filters.page ?? 1, 1);
  const offset = (page - 1) * pageSize;

  const query = feedbackRepo().createQueryBuilder('f');

  if (filters.category) {
    query.andWhere('f.category = :category', { category: filters.category });
  }
  if (filters.status) {
    query.andWhere('f.status = :status', { status: filters.status });
  }
  if (filters.priority) {
    query.andWhere('f.priority = :priority', { priority: filters.priority });
  }

  if (filters.sort === 'votes') {
    query
      .addSelect(
        subQuery =>
          subQuery.select('COUNT(*)').from(FeedbackVoteEntity, 'v').where('v.feedback_id = f.id'),
        'vote_count',
      )
      .orderBy('vote_count', 'DESC')
      .addOrderBy('f.created_at', 'DESC');
  } else {
    query.orderBy('f.created_at', 'DESC');
  }

  const total = await query.getCount();
  const items = await query.skip(offset).take(pageSize).getMany();

  let votedIds = new Set<number>();
  if (currentUserEmail && items.length > 0) {
    const feedbackIds = items.map(item => item.id);
    const votes = await voteRepo()
      .createQueryBuilder('v')
      .where('v.user_email = :email', { email: currentUserEmail })
      .andWhere('v.feedback_id IN (:...ids)', { ids: feedbackIds })
      .getMany();
    votedIds = new Set<number>(votes.map(vote => vote.feedback_id));
  }

  return { items, page, pageSize, total, votedIds };
};

export const getFeedbackById = async (id: number): Promise<FeedbackEntity | null> =>
  feedbackRepo().findOneBy({ id });

export const updateFeedback = async (
  id: number,
  data: {
    adminNote?: string | null;
    priority?: string | null;
    satisfaction?: boolean | null;
    status?: string;
    tags?: string[];
  },
): Promise<FeedbackEntity | null> => {
  const entity = await feedbackRepo().findOneBy({ id });
  if (!entity) return null;

  if (data.status !== undefined) entity.status = data.status;
  if (data.priority !== undefined) entity.priority = data.priority ?? null;
  if (data.adminNote !== undefined) entity.admin_note = data.adminNote ?? null;
  if (data.tags !== undefined) entity.tags = data.tags;
  if (data.satisfaction !== undefined) entity.satisfaction = data.satisfaction ?? null;

  return feedbackRepo().save(entity);
};

export const getVoteCount = async (feedbackId: number): Promise<number> =>
  voteRepo().countBy({ feedback_id: feedbackId });

export const addVote = async (
  feedbackId: number,
  userEmail: string,
): Promise<{ alreadyVoted: boolean }> => {
  const existing = await voteRepo().findOneBy({ feedback_id: feedbackId, user_email: userEmail });
  if (existing) return { alreadyVoted: true };

  const vote = voteRepo().create({ feedback_id: feedbackId, user_email: userEmail });
  await voteRepo().save(vote);
  return { alreadyVoted: false };
};

export const removeVote = async (
  feedbackId: number,
  userEmail: string,
): Promise<{ removed: boolean }> => {
  const result = await voteRepo().delete({ feedback_id: feedbackId, user_email: userEmail });
  return { removed: (result.affected ?? 0) > 0 };
};

export const getResponses = async (feedbackId: number): Promise<FeedbackResponseEntity[]> =>
  responseRepo().find({
    order: { created_at: 'ASC' },
    where: { feedback_id: feedbackId },
  });

export const addResponse = async (
  feedbackId: number,
  authorEmail: string,
  authorName: string,
  message: string,
): Promise<FeedbackResponseEntity> => {
  const entity = responseRepo().create({
    author_email: authorEmail,
    author_name: authorName,
    feedback_id: feedbackId,
    message,
  });
  return responseRepo().save(entity);
};

type FeedbackStatsResult = {
  acknowledged: number;
  closed: number;
  new: number;
  resolved: number;
  total: number;
};

export const getFeedbackStats = async (): Promise<FeedbackStatsResult> => {
  const rows: { count: string; status: string }[] = await feedbackRepo()
    .createQueryBuilder('f')
    .select('f.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('f.status')
    .getRawMany();

  const stats: FeedbackStatsResult = { acknowledged: 0, closed: 0, new: 0, resolved: 0, total: 0 };
  for (const row of rows) {
    const count = parseInt(row.count, 10);
    stats.total += count;
    if (row.status in stats) {
      stats[row.status as keyof Omit<FeedbackStatsResult, 'total'>] = count;
    }
  }
  return stats;
};

export const searchSimilarFeedback = async (
  query: string,
  category?: string,
): Promise<FeedbackEntity[]> => {
  const builder = feedbackRepo()
    .createQueryBuilder('f')
    .where('f.status IN (:...statuses)', { statuses: ['new', 'acknowledged'] })
    .andWhere('LOWER(f.description) LIKE :query', { query: `%${query.toLowerCase()}%` });

  if (category) {
    builder.andWhere('f.category = :category', { category });
  }

  return builder.orderBy('f.created_at', 'DESC').take(5).getMany();
};

export const getVoteCountsForFeedback = async (
  feedbackIds: number[],
): Promise<Map<number, number>> => {
  if (feedbackIds.length === 0) return new Map();

  const rows: { count: string; feedback_id: number }[] = await voteRepo()
    .createQueryBuilder('v')
    .select('v.feedback_id', 'feedback_id')
    .addSelect('COUNT(*)', 'count')
    .where('v.feedback_id IN (:...ids)', { ids: feedbackIds })
    .groupBy('v.feedback_id')
    .getRawMany();

  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(row.feedback_id, parseInt(row.count, 10));
  }
  return map;
};

export const getResponseCountsForFeedback = async (
  feedbackIds: number[],
): Promise<Map<number, number>> => {
  if (feedbackIds.length === 0) return new Map();

  const rows: { count: string; feedback_id: number }[] = await responseRepo()
    .createQueryBuilder('r')
    .select('r.feedback_id', 'feedback_id')
    .addSelect('COUNT(*)', 'count')
    .where('r.feedback_id IN (:...ids)', { ids: feedbackIds })
    .groupBy('r.feedback_id')
    .getRawMany();

  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(row.feedback_id, parseInt(row.count, 10));
  }
  return map;
};

const escapeCsvCell = (val: string): string => {
  const needsQuote = val.includes(',') || val.includes('"') || val.includes('\n');
  const escaped = val.replaceAll('"', '""');
  const prefixed = /^[=+\-@]/.test(escaped) ? `'${escaped}` : escaped;
  return needsQuote ? `"${prefixed}"` : prefixed;
};

export const exportFeedbackCsv = async (): Promise<string> => {
  const items = await feedbackRepo().find({ order: { created_at: 'DESC' } });

  const header = 'ID,Category,Status,Priority,Description,Submitted By,Page URL,Tags,Created At';
  const rows = items.map(item => {
    const desc = item.description.replaceAll('\n', ' ').substring(0, 200);
    return [
      String(item.id),
      item.category,
      item.status,
      item.priority ?? '',
      escapeCsvCell(desc),
      escapeCsvCell(item.submitted_by),
      escapeCsvCell(item.page_url),
      escapeCsvCell(item.tags.join('; ')),
      item.created_at.toISOString(),
    ].join(',');
  });

  return [header, ...rows].join('\n');
};
