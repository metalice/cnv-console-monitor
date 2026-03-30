import type { LaunchGroup } from '@cnv-monitor/shared';

import {
  Content,
  Flex,
  FlexItem,
  PageSection,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';

import { ExportButton } from '../components/common/ExportButton';
import { TimeAgo } from '../components/common/TimeAgo';

type DashboardHeaderProps = {
  lastPollAt: number | null | undefined;
  displayLabel: string;
  filteredGroups: LaunchGroup[];
};

export const DashboardHeader = ({
  displayLabel,
  filteredGroups,
  lastPollAt,
}: DashboardHeaderProps) => (
  <PageSection>
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
    >
      <FlexItem>
        <Content component="h1">Dashboard</Content>
      </FlexItem>
      <FlexItem>
        <Toolbar>
          <ToolbarContent>
            {lastPollAt && (
              <ToolbarItem>
                <Content className="app-text-subtle app-text-sm" component="small">
                  Last sync: <TimeAgo timestamp={lastPollAt} />
                </Content>
              </ToolbarItem>
            )}
            <ToolbarItem>
              <ExportButton date={displayLabel} groups={filteredGroups} />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </FlexItem>
    </Flex>
  </PageSection>
);
