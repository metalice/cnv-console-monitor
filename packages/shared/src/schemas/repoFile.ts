import { z } from 'zod';

export const FileTypeEnum = z.enum(['doc', 'test', 'other']);
export type FileType = z.infer<typeof FileTypeEnum>;

export const RepoFileSchema = z.object({
  id: z.string().uuid(),
  repoId: z.string().uuid(),
  branch: z.string(),
  filePath: z.string(),
  fileType: FileTypeEnum,
  fileName: z.string(),
  contentHash: z.string().nullish(),
  frontmatter: z.record(z.unknown()).nullish(),
  counterpartId: z.string().uuid().nullish(),
  rpTestName: z.string().nullish(),
  lastSyncedAt: z.string().optional(),
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
    type: z.enum(['component', 'repo', 'folder', 'doc', 'test', 'other']),
    name: z.string(),
    path: z.string().optional(),
    repoUrl: z.string().optional(),
    repoId: z.string().uuid().optional(),
    branch: z.string().optional(),
    hasCounterpart: z.boolean().optional(),
    counterpartPath: z.string().optional(),
    jiraKeys: z.array(z.string()).optional(),
    polarionId: z.string().optional(),
    quarantine: z.object({
      id: z.string(),
      status: z.string(),
      since: z.string(),
      jiraKey: z.string().optional(),
      slaDaysLeft: z.number().optional(),
    }).optional(),
    lastRunStatus: z.string().optional(),
    lastRunDate: z.string().optional(),
    owner: z.string().optional(),
    tags: z.array(z.string()).optional(),
    children: z.array(z.lazy(() => TreeNodeSchema)).optional(),
    fileCount: z.number().optional(),
    gapCount: z.number().optional(),
  })
);

export interface TreeNode {
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
}

export const GapAnalysisReportSchema = z.object({
  summary: z.string(),
  totalDocs: z.number(),
  totalTests: z.number(),
  matchedPairs: z.number(),
  gaps: z.array(z.object({
    type: GapTypeEnum,
    severity: z.enum(['error', 'warning', 'info']),
    filePath: z.string(),
    repoName: z.string(),
    component: z.string(),
    suggestion: z.string(),
    relatedJira: z.string().optional(),
    confidence: z.number(),
  })),
  stats: z.object({
    docCoverage: z.number(),
    testCoverage: z.number(),
    quarantined: z.number(),
    quarantineOverdue: z.number(),
    deadTests: z.number(),
    phantomTests: z.number(),
  }),
});

export type GapAnalysisReport = z.infer<typeof GapAnalysisReportSchema>;
