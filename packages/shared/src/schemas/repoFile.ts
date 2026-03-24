import { z } from 'zod';

export const FileTypeEnum = z.enum(['doc', 'test', 'other']);
export type FileType = z.infer<typeof FileTypeEnum>;

export const RepoFileSchema = z.object({
  branch: z.string(),
  contentHash: z.string().nullish(),
  counterpartId: z.string().uuid().nullish(),
  fileName: z.string(),
  filePath: z.string(),
  fileType: FileTypeEnum,
  frontmatter: z.record(z.unknown()).nullish(),
  id: z.string().uuid(),
  lastSyncedAt: z.string().optional(),
  repoId: z.string().uuid(),
  rpTestName: z.string().nullish(),
});

export type RepoFile = z.infer<typeof RepoFileSchema>;

export const GapTypeEnum = z.enum([
  'orphaned_doc',
  'undocumented_test',
  'stale_doc',
  'dead_test',
  'phantom_test',
  'quarantine_overdue',
  'quarantine_fix_detected',
  'doc_drift',
]);

export type GapType = z.infer<typeof GapTypeEnum>;

export const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    branch: z.string().optional(),
    children: z.array(z.lazy(() => TreeNodeSchema)).optional(),
    counterpartPath: z.string().optional(),
    fileCount: z.number().optional(),
    gapCount: z.number().optional(),
    hasCounterpart: z.boolean().optional(),
    jiraKeys: z.array(z.string()).optional(),
    lastRunDate: z.string().optional(),
    lastRunStatus: z.string().optional(),
    name: z.string(),
    owner: z.string().optional(),
    path: z.string().optional(),
    polarionId: z.string().optional(),
    quarantine: z
      .object({
        id: z.string(),
        jiraKey: z.string().optional(),
        since: z.string(),
        slaDaysLeft: z.number().optional(),
        status: z.string(),
      })
      .optional(),
    repoId: z.string().uuid().optional(),
    repoUrl: z.string().optional(),
    tags: z.array(z.string()).optional(),
    type: z.enum(['component', 'repo', 'folder', 'doc', 'test', 'other']),
  }),
);

export type TreeNode = {
  type: 'component' | 'repo' | 'folder' | 'doc' | 'test' | 'other';
  name: string;
  path?: string;
  repoUrl?: string;
  repoId?: string;
  branch?: string;
  hasCounterpart?: boolean;
  counterpartPath?: string;
  jiraKeys?: string[];
  polarionId?: string;
  quarantine?: {
    id: string;
    status: string;
    since: string;
    jiraKey?: string;
    slaDaysLeft?: number;
  };
  lastRunStatus?: string;
  lastRunDate?: string;
  owner?: string;
  tags?: string[];
  children?: TreeNode[];
  fileCount?: number;
  gapCount?: number;
};

export const GapAnalysisReportSchema = z.object({
  gaps: z.array(
    z.object({
      component: z.string(),
      confidence: z.number(),
      filePath: z.string(),
      relatedJira: z.string().optional(),
      repoName: z.string(),
      severity: z.enum(['error', 'warning', 'info']),
      suggestion: z.string(),
      type: GapTypeEnum,
    }),
  ),
  matchedPairs: z.number(),
  stats: z.object({
    deadTests: z.number(),
    docCoverage: z.number(),
    phantomTests: z.number(),
    quarantined: z.number(),
    quarantineOverdue: z.number(),
    testCoverage: z.number(),
  }),
  summary: z.string(),
  totalDocs: z.number(),
  totalTests: z.number(),
});

export type GapAnalysisReport = z.infer<typeof GapAnalysisReportSchema>;
