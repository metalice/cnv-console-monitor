import { Alert, Content } from '@patternfly/react-core';

type PreviewResult = {
  matches: string[];
  totalCount: number;
  nameCount: number;
  conflicts?: { pattern: string; component: string }[];
};

type MappingsPreviewProps = {
  previewResult: PreviewResult;
};

export const MappingsPreview = ({ previewResult }: MappingsPreviewProps) => (
  <div className="app-mt-sm">
    {previewResult.conflicts && previewResult.conflicts.length > 0 && (
      <Alert
        isInline
        isPlain
        className="app-mb-sm"
        title={`Conflicts with ${previewResult.conflicts.length} existing mapping(s): ${previewResult.conflicts.map(conflict => `"${conflict.pattern}" → ${conflict.component}`).join(', ')}`}
        variant="warning"
      />
    )}
    <Content className="app-text-muted" component="small">
      {previewResult.nameCount} unmapped launch names ({previewResult.totalCount} runs)
    </Content>
    {previewResult.matches.length > 0 && (
      <div className="app-preview-list">
        {previewResult.matches.map(name => (
          <code className="app-preview-item" key={name}>
            {name}
          </code>
        ))}
        {previewResult.nameCount > previewResult.matches.length && (
          <Content className="app-text-muted" component="small">
            ...and {previewResult.nameCount - previewResult.matches.length} more
          </Content>
        )}
      </div>
    )}
  </div>
);
