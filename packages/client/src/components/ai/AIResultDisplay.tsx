import { Content } from '@patternfly/react-core';

type AIResultDisplayProps = {
  data: Record<string, unknown>;
};

const renderRawText = (rawText: string) => (
  <div className="app-changelog-raw">
    {rawText.split('\n').map((line, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <Content className="app-text-xs" component="p" key={i}>
        {line || '\u00a0'}
      </Content>
    ))}
  </div>
);

const toDisplayString = (raw: unknown): string => {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'bigint')
    return String(raw);
  return JSON.stringify(raw);
};

export const AIResultDisplay = ({ data }: AIResultDisplayProps) => {
  if (data.raw) {
    return renderRawText(toDisplayString(data.raw));
  }

  return (
    <div>
      {Object.entries(data).map(([key, value]) => {
        if (value === null || value === undefined) {
          return null;
        }
        const heading = key.replace(/([A-Z])/g, ' $1').trim();

        if (typeof value === 'string') {
          return (
            <div className="app-mb-sm" key={key}>
              <Content component="h5">{heading}</Content>
              <Content className="app-text-xs" component="p">
                {value}
              </Content>
            </div>
          );
        }
        if (Array.isArray(value)) {
          return (
            <div className="app-mb-sm" key={key}>
              <Content component="h5">
                {heading} ({value.length})
              </Content>
              <ul className="app-text-xs">
                {value.map((item, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (typeof value === 'object') {
          return (
            <div className="app-mb-sm" key={key}>
              <Content component="h5">{heading}</Content>
              <pre className="app-text-xs app-ack-notes">{JSON.stringify(value, null, 2)}</pre>
            </div>
          );
        }
        return (
          <div className="app-mb-sm" key={key}>
            <strong className="app-text-xs">{key}:</strong>{' '}
            <span className="app-text-xs">
              {String(value as string | number | boolean | bigint | symbol)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
