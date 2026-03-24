import { z } from 'zod';

export const TokenProviderEnum = z.enum(['gitlab', 'github', 'jira']);
export type TokenProvider = z.infer<typeof TokenProviderEnum>;

export const UserTokenInfoSchema = z.object({
  isConfigured: z.boolean(),
  isValid: z.boolean(),
  provider: TokenProviderEnum,
  providerEmail: z.string().nullish(),
  providerUsername: z.string().nullish(),
  validatedAt: z.string().nullish(),
});

export type UserTokenInfo = z.infer<typeof UserTokenInfoSchema>;

export const SaveUserTokenSchema = z.object({
  token: z.string().min(1),
});

export type SaveUserToken = z.infer<typeof SaveUserTokenSchema>;
