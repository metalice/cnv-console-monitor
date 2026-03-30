import { Alert, Content, ExpandableSection } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';

type ChangelogSummaryProps = {
  summary?: string;
};

export const ChangelogSummary = ({ summary }: ChangelogSummaryProps) => {
  if (!summary) {
    return null;
  }
  return (
    <div className="app-changelog-summary app-mb-md">
      <Content component="p">
        {typeof summary === 'string' ? summary : JSON.stringify(summary)}
      </Content>
    </div>
  );
};

type ChangelogHighlightsProps = {
  highlights?: string;
};

export const ChangelogHighlights = ({ highlights }: ChangelogHighlightsProps) => {
  if (!highlights) {
    return null;
  }
  return (
    <div className="app-changelog-highlights app-mb-md">
      <Content className="app-mb-xs" component="h5">
        <InfoCircleIcon className="app-mr-xs" />
        Key Highlights
      </Content>
      {typeof highlights === 'string' ? (
        highlights.includes('\n') ? (
          <ul className="app-text-sm">
            {highlights
              .split('\n')
              .filter(line => line.trim())
              .map((line, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={idx}>{line.replace(/^[-•*]\s*/, '')}</li>
              ))}
          </ul>
        ) : (
          <Content className="app-text-sm" component="p">
            {highlights}
          </Content>
        )
      ) : (
        <Content className="app-text-sm" component="p">
          {JSON.stringify(highlights)}
        </Content>
      )}
    </div>
  );
};

type BreakingChangesProps = {
  breakingChanges?: (string | Record<string, unknown>)[];
};

export const BreakingChanges = ({ breakingChanges }: BreakingChangesProps) => {
  if (!breakingChanges?.length) {
    return null;
  }
  return (
    <Alert
      isInline
      className="app-mb-md"
      title={`${breakingChanges.length} Breaking Changes`}
      variant="danger"
    >
      <ul className="app-text-xs">
        {breakingChanges.map((change, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={idx}>{formatBreakingChange(change)}</li>
        ))}
      </ul>
    </Alert>
  );
};

const formatBreakingChange = (change: string | Record<string, unknown>): string => {
  if (typeof change === 'string') {
    return change;
  }
  if (!change.title) {
    return JSON.stringify(change);
  }
  const rawKey = change.key;
  const keyPart =
    rawKey != null && rawKey !== '' && rawKey !== false
      ? typeof rawKey === 'string' || typeof rawKey === 'number' || typeof rawKey === 'boolean'
        ? String(rawKey)
        : JSON.stringify(rawKey)
      : '';
  const titlePart =
    typeof change.title === 'string' ||
    typeof change.title === 'number' ||
    typeof change.title === 'boolean'
      ? String(change.title)
      : JSON.stringify(change.title);
  return keyPart ? `${keyPart} — ${titlePart}` : titlePart;
};

type RawOutputProps = {
  raw?: string;
  hasContent: boolean;
  hasSummary: boolean;
};

export const RawOutput = ({ hasContent, hasSummary, raw }: RawOutputProps) => (
  <>
    {!hasContent && !hasSummary && (
      <Alert
        isInline
        className="app-mb-md"
        title="AI response could not be parsed into structured categories"
        variant="warning"
      >
        <Content className="app-text-xs" component="p">
          The AI returned a response that could not be parsed as a structured changelog. This
          usually happens when the AI wraps the response in extra text or the JSON is malformed. Try
          clicking &quot;Regenerate&quot; above. {raw ? 'The raw AI output is shown below.' : ''}
        </Content>
      </Alert>
    )}
    {raw && (
      <ExpandableSection className="app-mb-md" toggleText="Raw AI Output">
        <pre className="app-changelog-raw">{raw}</pre>
      </ExpandableSection>
    )}
  </>
);
