import { decryptValue, encryptValue } from '../crypto';
import { AppDataSource } from '../data-source';
import { UserToken } from '../entities/UserToken';

const userTokens = () => AppDataSource.getRepository(UserToken);

export const getUserTokens = async (
  userEmail: string,
): Promise<
  {
    provider: string;
    isConfigured: boolean;
    isValid: boolean;
    providerUsername: string | null;
    providerEmail: string | null;
    validatedAt: Date | null;
  }[]
> => {
  const tokens = await userTokens().find({ where: { user_email: userEmail } });
  return tokens.map(t => ({
    isConfigured: true,
    isValid: t.is_valid,
    provider: t.provider,
    providerEmail: t.provider_email,
    providerUsername: t.provider_username,
    validatedAt: t.validated_at,
  }));
};

export const getUserToken = async (
  userEmail: string,
  provider: string,
): Promise<UserToken | null> => userTokens().findOneBy({ provider, user_email: userEmail });

export const getDecryptedToken = async (
  userEmail: string,
  provider: string,
): Promise<string | null> => {
  const token = await getUserToken(userEmail, provider);
  if (!token) {
    return null;
  }
  return decryptValue(token.encrypted_token);
};

export const saveUserToken = async (
  userEmail: string,
  provider: string,
  plainToken: string,
  providerInfo?: { username?: string; email?: string },
): Promise<UserToken> => {
  const encrypted = encryptValue(plainToken);
  const existing = await userTokens().findOneBy({ provider, user_email: userEmail });

  if (existing) {
    existing.encrypted_token = encrypted;
    existing.is_valid = true;
    existing.validated_at = new Date();
    existing.updated_at = new Date();
    if (providerInfo?.username) {
      existing.provider_username = providerInfo.username;
    }
    if (providerInfo?.email) {
      existing.provider_email = providerInfo.email;
    }
    return userTokens().save(existing);
  }

  const entity = userTokens().create({
    encrypted_token: encrypted,
    is_valid: true,
    provider,
    provider_email: providerInfo?.email ?? null,
    provider_username: providerInfo?.username ?? null,
    user_email: userEmail,
    validated_at: new Date(),
  });
  return userTokens().save(entity);
};

export const deleteUserToken = async (userEmail: string, provider: string): Promise<boolean> => {
  const result = await userTokens().delete({ provider, user_email: userEmail });
  return (result.affected ?? 0) > 0;
};

export const invalidateUserToken = async (userEmail: string, provider: string): Promise<void> => {
  await userTokens().update(
    { provider, user_email: userEmail },
    { is_valid: false, updated_at: new Date() },
  );
};
