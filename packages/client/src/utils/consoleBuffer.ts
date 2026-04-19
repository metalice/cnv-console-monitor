const MAX_ENTRIES = 20;
const SECRET_PATTERNS = [
  /Bearer\s+\S+/gi,
  /token[=:]\S+/gi,
  /password[=:]\S+/gi,
  /api[_-]?key[=:]\S+/gi,
  /secret[=:]\S+/gi,
  /authorization[=:]\S+/gi,
];

type ConsoleEntry = {
  message: string;
  timestamp: string;
  type: 'error' | 'unhandled';
};

const buffer: ConsoleEntry[] = [];

const sanitize = (text: string): string => {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replaceAll(pattern, '[REDACTED]');
  }
  return result;
};

const addEntry = (type: ConsoleEntry['type'], message: string) => {
  buffer.push({
    message: sanitize(message).substring(0, 500),
    timestamp: new Date().toISOString(),
    type,
  });
  if (buffer.length > MAX_ENTRIES) {
    buffer.shift();
  }
};

let initialized = false;

export const initConsoleBuffer = () => {
  if (initialized) return;
  initialized = true;

  window.addEventListener('error', event => {
    const msg = event.message || 'Unknown error';
    const location = event.filename ? ` at ${event.filename}:${event.lineno}` : '';
    addEntry('error', `${msg}${location}`);
  });

  window.addEventListener('unhandledrejection', event => {
    const reason =
      event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'Unknown');
    addEntry('unhandled', `Unhandled promise rejection: ${reason}`);
  });
};

export const getConsoleErrors = (): string | null => {
  if (buffer.length === 0) return null;
  return JSON.stringify(buffer);
};

export const getConsoleErrorCount = (): number => buffer.length;
