import { Content, ExpandableSection, Flex, FlexItem, Label, Spinner } from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { fetchSettingsChangelog, type SettingsLogEntry } from '../../api/settings';

const STALE_TIME_MS = 30_000;

export const SettingsChangelog = () => {
  const { data: log, isLoading } = useQuery<SettingsLogEntry[]>({
    queryFn: fetchSettingsChangelog,
    queryKey: ['settingsChangelog'],
    staleTime: STALE_TIME_MS,
  });

  return (
    <ExpandableSection toggleText={`Settings Changelog${log?.length ? ` (${log.length})` : ''}`}>
      {isLoading ? (
        <Spinner size="md" />
      ) : !log?.length ? (
        <Content className="app-text-muted" component="small">
          No changes recorded yet.
        </Content>
      ) : (
        <div className="app-max-h-300">
          {log.map(entry => (
            <div className="app-activity-item" key={entry.id}>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <Label isCompact>{entry.key}</Label>
                </FlexItem>
                <FlexItem className="app-text-muted app-text-xs">
                  {entry.old_value ? `${entry.old_value} → ` : ''}
                  {entry.new_value}
                </FlexItem>
                <FlexItem className="app-text-muted app-text-xs">
                  by {entry.changed_by || 'system'} — {new Date(entry.changed_at).toLocaleString()}
                </FlexItem>
              </Flex>
            </div>
          ))}
        </div>
      )}
    </ExpandableSection>
  );
};
