import { AppDataSource } from '../data-source';
import { UserToken } from '../entities/UserToken';
import { encryptValue, decryptValue } from '../crypto';

const userTokens = () => AppDataSource.getRepository(UserToken);

export const getUserTokens = async (userEmail: string): Promise<Array<{ provider: string; isConfigured: boolean; isValid: boolean; providerUsername: string | null; providerEmail: string | null; validatedAt: Date | null }>> => {
  const tokens = await userTokens().find({ where: { user_email: userEmail } });
  return tokens.map(t => ({
    provider: t.provider,
    isConfigured: true,
    isValid: t.is_valid,
    providerUsername: t.provider_username,
    providerEmail: t.provider_email,
    validatedAt: t.validated_at,
  }));
};

export const getUserToken = async (userEmail: string, provider: string): Promise<UserToken | null> => {
  return userTokens().findOneBy({ user_email: userEmail, provider });
};

export const getDecryptedToken = async (userEmail: string, provider: string): Promise<string | null> => {
  const token = await getUserToken(userEmail, provider);
  if (!token) return null;
  return decryptValue(token.encrypted_token);
};

export const saveUserToken = async (userEmail: string, provider: string, plainToken: string, providerInfo?: { username?: string; email?: string }): Promise<UserToken> => {
  const encrypted = encryptValue(plainToken);
  const existing = await userTokens().findOneBy({ user_email: userEmail, provider });

  if (existing) {
    existing.encrypted_token = encrypted;
    existing.is_valid = true;
    existing.validated_at = new Date();
    existing.updated_at = new Date();
    if (providerInfo?.username) existing.provider_username = providerInfo.username;
    if (providerInfo?.email) existing.provider_email = providerInfo.email;
    return userTokens().save(existing);
  }

  const entity = userTokens().create({
    user_email: userEmail,
    provider,
    encrypted_token: encrypted,
    is_valid: true,
    validated_at: new Date(),
    provider_username: providerInfo?.username ?? null,
    provider_email: providerInfo?.email ?? null,
  });
  return userTokens().save(entity);
};

export const deleteUserToken = async (userEmail: string, provider: string): Promise<boolean> => {
  const result = await userTokens().delete({ user_email: userEmail, provider });
  return (result.affected ?? 0) > 0;
};

export const invalidateUserToken = async (userEmail: string, provider: string): Promise<void> => {
  await userTokens().update({ user_email: userEmail, provider }, { is_valid: false, updated_at: new Date() });
};
