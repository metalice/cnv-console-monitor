import { z } from 'zod';

export const RepositoryProviderEnum = z.enum(['gitlab', 'github']);
export type RepositoryProvider = z.infer<typeof RepositoryProviderEnum>;

export const FrontmatterSchemaConfig = z.object({
  jiraField: z.string().optional(),
  testFileField: z.string().optional(),
  polarionField: z.string().optional(),
  componentField: z.string().optional(),
  ownerField: z.string().optional(),
  tagsField: z.string().optional(),
  customFields: z.array(z.string()).optional(),
}).optional();

export type FrontmatterSchema = z.infer<typeof FrontmatterSchemaConfig>;

export const SkipAnnotationConfig = z.object({
  fileGlob: z.string(),
  framework: z.string(),
  pattern: z.string(),
  template: z.string(),
  insertBefore: z.string(),
});

export type SkipAnnotation = z.infer<typeof SkipAnnotationConfig>;

export const RepositorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  provider: RepositoryProviderEnum,
  url: z.string(),
  apiBaseUrl: z.string(),
  projectId: z.string(),
  branches: z.array(z.string()),
  globalTokenKey: z.string(),
  docPaths: z.array(z.string()),
  testPaths: z.array(z.string()),
  frontmatterSchema: FrontmatterSchemaConfig,
  components: z.array(z.string()),
  cacheTtlMin: z.number(),
  webhookSecret: z.string().nullish(),
  skipAnnotations: z.array(SkipAnnotationConfig).optional(),
  enabled: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Repository = z.infer<typeof RepositorySchema>;

export const CreateRepositorySchema = z.object({
  name: z.string().min(1),
  provider: RepositoryProviderEnum,
  url: z.string().min(1),
  apiBaseUrl: z.string().min(1),
  projectId: z.string().min(1),
  branches: z.array(z.string()).min(1),
  globalTokenKey: z.string().min(1),
  docPaths: z.array(z.string()),
  testPaths: z.array(z.string()),
  frontmatterSchema: FrontmatterSchemaConfig,
  components: z.array(z.string()),
  cacheTtlMin: z.number().min(1).max(1440).optional(),
  webhookSecret: z.string().optional(),
  skipAnnotations: z.array(SkipAnnotationConfig).optional(),
  enabled: z.boolean().optional(),
});

export type CreateRepository = z.infer<typeof CreateRepositorySchema>;

export const UpdateRepositorySchema = CreateRepositorySchema.partial();
export type UpdateRepository = z.infer<typeof UpdateRepositorySchema>;
