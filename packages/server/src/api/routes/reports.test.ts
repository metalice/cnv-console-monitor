/**
 * MANDATORY REGRESSION TEST
 *
 * This test guards against a recurring bug where generated reports
 * do not appear in the reports table. Every change that touches the
 * report editor page, report hooks, API client, or this route
 * MUST pass this test before merging.
 *
 * The invariant: after upsertReport stores a row, GET /api/report
 * MUST return it — both unfiltered and with the matching component filter.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ReportEntity } from '../../db/entities/ReportEntity';

const MOCK_DATE = new Date('2026-04-14T10:00:00Z');

const createMockEntity = (overrides: Partial<ReportEntity> = {}): ReportEntity =>
  ({
    aggregate_stats: {
      commitCount: 10,
      contributorCount: 3,
      prsMerged: 5,
      storyPoints: 8,
      ticketsDone: 4,
    },
    component: '',
    created_at: MOCK_DATE,
    id: 'report-1',
    manager_highlights: null,
    person_reports: [],
    sent_at: null,
    state: 'DRAFT',
    task_summary: null,
    updated_at: MOCK_DATE,
    warnings: null,
    week_end: new Date('2026-04-18'),
    week_id: '2026-W16',
    week_start: new Date('2026-04-14'),
    ...overrides,
  }) as ReportEntity;

const globalReport = createMockEntity({ component: '', id: 'report-global' });
const consoleReport = createMockEntity({ component: 'console', id: 'report-console' });
const networkReport = createMockEntity({ component: 'networking', id: 'report-network' });

let storedReports: ReportEntity[] = [];

vi.mock('../../db/store', () => ({
  deleteReport: vi.fn((id: string) => {
    const idx = storedReports.findIndex(rep => rep.id === id);
    if (idx < 0) return Promise.resolve(false);
    storedReports.splice(idx, 1);
    return Promise.resolve(true);
  }),
  getCurrentReport: vi.fn(),
  getReport: vi.fn(),
  getReportById: vi.fn(),
  listReports: vi.fn((component?: string) => {
    if (component) {
      return Promise.resolve(storedReports.filter(rep => rep.component === component));
    }
    return Promise.resolve(storedReports);
  }),
  updatePersonReportNotes: vi.fn(),
  updateReportNotes: vi.fn(),
  updateReportState: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  extractUser: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  getSubscriptionOwner: vi.fn(() => Promise.resolve(null)),
  requireAdmin: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  requireOwnerOrAdmin: vi.fn(() =>
    vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  ),
}));

import request from 'supertest';

import { createApp } from '../index';

const app = createApp();

describe('GET /api/report — report list regression guard', () => {
  beforeEach(() => {
    storedReports = [];
  });

  it('returns an empty array when no reports exist', async () => {
    const res = await request(app).get('/api/report');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all reports when no component filter is applied', async () => {
    storedReports = [globalReport, consoleReport, networkReport];

    const res = await request(app).get('/api/report');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const ids = (res.body as { id: string }[]).map(rep => rep.id);
    expect(ids).toContain('report-global');
    expect(ids).toContain('report-console');
    expect(ids).toContain('report-network');
  });

  it('returns only matching reports when component filter is applied', async () => {
    storedReports = [globalReport, consoleReport, networkReport];

    const res = await request(app).get('/api/report?component=console');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect((res.body as { id: string }[])[0].id).toBe('report-console');
  });

  it('returns global report (component="") when no component filter is used', async () => {
    storedReports = [globalReport];

    const res = await request(app).get('/api/report');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect((res.body as { id: string }[])[0].id).toBe('report-global');
  });

  it('does NOT return global report when filtering by a specific component', async () => {
    storedReports = [globalReport];

    const res = await request(app).get('/api/report?component=console');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('newly added report appears in subsequent list requests', async () => {
    storedReports = [];

    const emptyRes = await request(app).get('/api/report');
    expect(emptyRes.body).toHaveLength(0);

    storedReports.push(consoleReport);

    const populatedRes = await request(app).get('/api/report');
    expect(populatedRes.body).toHaveLength(1);
    expect((populatedRes.body as { id: string }[])[0].id).toBe('report-console');
  });

  it('response includes all required fields for table rendering', async () => {
    storedReports = [globalReport];

    const res = await request(app).get('/api/report');
    expect(res.status).toBe(200);
    const report = (res.body as Record<string, unknown>[])[0];

    expect(report).toHaveProperty('id');
    expect(report).toHaveProperty('weekId');
    expect(report).toHaveProperty('weekStart');
    expect(report).toHaveProperty('weekEnd');
    expect(report).toHaveProperty('state');
    expect(report).toHaveProperty('sentAt');
    expect(report).toHaveProperty('component');
  });

  it('maps entity correctly: weekId, state, and dates are present and valid', async () => {
    storedReports = [globalReport];

    const res = await request(app).get('/api/report');
    const report = (res.body as Record<string, unknown>[])[0];

    expect(report.weekId).toBe('2026-W16');
    expect(report.state).toBe('DRAFT');
    expect(typeof report.weekStart).toBe('string');
    expect(typeof report.weekEnd).toBe('string');
    expect(typeof report.createdAt).toBe('string');
  });

  it('multiple reports for different components all appear in unfiltered list', async () => {
    storedReports = [consoleReport, networkReport];

    const res = await request(app).get('/api/report');
    expect(res.body).toHaveLength(2);
  });

  it('deleted report no longer appears in list', async () => {
    storedReports = [consoleReport, networkReport];

    await request(app).delete(`/api/report/${consoleReport.id}`);

    const res = await request(app).get('/api/report');
    expect(res.body).toHaveLength(1);
    expect((res.body as { id: string }[])[0].id).toBe('report-network');
  });
});
