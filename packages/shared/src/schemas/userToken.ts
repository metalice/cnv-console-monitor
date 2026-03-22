import { z } from 'zod';

export const TokenProviderEnum = z.enum(['gitlab', 'github', 'jira']);
export type TokenProvider = z.infer<typeof TokenProviderEnum>;

export const UserTokenInfoSchema = z.object({
  provider: TokenProviderEnum,
  isConfigured: z.boolean(),
  isValid: z.boolean(),
  providerUsername: z.string().nullish(),
  providerEmail: z.string().nullish(),
  validatedAt: z.string().nullish(),
});

export type UserTokenInfo = z.infer<typeof UserTokenInfoSchema>;

export const SaveUserTokenSchema = z.object({
  token: z.string().min(1),
});

export type SaveUserToken = z.infer<typeof SaveUserTokenSchema>;
