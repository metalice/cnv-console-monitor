import { z } from 'zod';

export const RepositoryProviderEnum = z.enum(['gitlab', 'github']);
export type RepositoryProvider = z.infer<typeof RepositoryProviderEnum>;

export const FrontmatterSchemaConfig = z
  .object({
    componentField: z.string().optional(),
    customFields: z.array(z.string()).optional(),
    jiraField: z.string().optional(),
    ownerField: z.string().optional(),
    polarionField: z.string().optional(),
    tagsField: z.string().optional(),
    testFileField: z.string().optional(),
  })
  .optional();

export type FrontmatterSchema = z.infer<typeof FrontmatterSchemaConfig>;

export const SkipAnnotationConfig = z.object({
  fileGlob: z.string(),
  framework: z.string(),
  insertBefore: z.string(),
  pattern: z.string(),
  template: z.string(),
});

export type SkipAnnotation = z.infer<typeof SkipAnnotationConfig>;

export const RepositorySchema = z.object({
  apiBaseUrl: z.string(),
  branches: z.array(z.string()),
  cacheTtlMin: z.number(),
  components: z.array(z.string()),
  createdAt: z.string().optional(),
  docPaths: z.array(z.string()),
  enabled: z.boolean(),
  frontmatterSchema: FrontmatterSchemaConfig,
  globalTokenKey: z.string(),
  id: z.string().uuid(),
  name: z.string(),
  projectId: z.string(),
  provider: RepositoryProviderEnum,
  skipAnnotations: z.array(SkipAnnotationConfig).optional(),
  testPaths: z.array(z.string()),
  updatedAt: z.string().optional(),
  url: z.string(),
  webhookSecret: z.string().nullish(),
});

export type Repository = z.infer<typeof RepositorySchema>;

export const CreateRepositorySchema = z.object({
  apiBaseUrl: z.string().min(1),
  branches: z.array(z.string()).min(1),
  cacheTtlMin: z.number().min(1).max(1440).optional(),
  components: z.array(z.string()),
  docPaths: z.array(z.string()),
  enabled: z.boolean().optional(),
  frontmatterSchema: FrontmatterSchemaConfig,
  globalTokenKey: z.string().min(1),
  name: z.string().min(1),
  projectId: z.string().min(1),
  provider: RepositoryProviderEnum,
  skipAnnotations: z.array(SkipAnnotationConfig).optional(),
  testPaths: z.array(z.string()),
  url: z.string().min(1),
  webhookSecret: z.string().optional(),
});

export type CreateRepository = z.infer<typeof CreateRepositorySchema>;

export const UpdateRepositorySchema = CreateRepositorySchema.partial();
export type UpdateRepository = z.infer<typeof UpdateRepositorySchema>;
