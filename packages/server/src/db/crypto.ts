import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { logger } from '../logger';

const log = logger.child({ module: 'Crypto' });

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCRYPTED_PREFIX = 'enc:';

const getEncryptionKey = (): Buffer | null => {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!hex) {
    return null;
  }
  if (hex.length !== 64) {
    log.error('SETTINGS_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
    return null;
  }
  return Buffer.from(hex, 'hex');
};

const SENSITIVE_PATTERNS = ['token', 'pass', 'secret', 'key', 'webhook'];

export const isSensitiveKey = (key: string): boolean => {
  const lower = key.toLowerCase();
  return SENSITIVE_PATTERNS.some(pat => lower.includes(pat));
};

export const encryptValue = (plaintext: string): string => {
  const key = getEncryptionKey();
  if (!key) {
    return plaintext;
  }

  const initVector = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, initVector);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${initVector.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

export const decryptValue = (stored: string): string => {
  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    return stored;
  }

  const key = getEncryptionKey();
  if (!key) {
    log.warn(
      'Encrypted value found but SETTINGS_ENCRYPTION_KEY is not set — returning masked placeholder',
    );
    return '';
  }

  const payload = stored.slice(ENCRYPTED_PREFIX.length);
  const parts = payload.split(':');
  if (parts.length !== 3) {
    log.error('Malformed encrypted value');
    return '';
  }

  const [ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return (
    decipher.update(Buffer.from(dataB64, 'base64'), undefined, 'utf8') + decipher.final('utf8')
  );
};
