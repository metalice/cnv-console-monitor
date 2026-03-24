import { z } from 'zod';

export const DefectTypeSchema = z.object({
  color: z.string(),
  id: z.number(),
  locator: z.string(),
  longName: z.string(),
  shortName: z.string(),
  typeRef: z.string(),
});

export type DefectType = z.infer<typeof DefectTypeSchema>;

export const DefectTypeCategoryEnum = z.enum([
  'TO_INVESTIGATE',
  'PRODUCT_BUG',
  'AUTOMATION_BUG',
  'SYSTEM_ISSUE',
  'NO_DEFECT',
]);

export type DefectTypeCategory = z.infer<typeof DefectTypeCategoryEnum>;

export const DefectTypesResponseSchema = z.record(
  DefectTypeCategoryEnum,
  z.array(DefectTypeSchema),
);

export type DefectTypesResponse = z.infer<typeof DefectTypesResponseSchema>;
