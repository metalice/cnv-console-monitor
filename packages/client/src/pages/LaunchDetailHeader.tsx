import { type PublicConfig } from '@cnv-monitor/shared';

import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Content,
  Flex,
  FlexItem,
  PageSection,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, SearchIcon, WrenchIcon } from '@patternfly/react-icons';
import { type UseMutationResult } from '@tanstack/react-query';

type LaunchDetailHeaderProps = {
  title: string;
  subtitle: string;
  isGroupMode: boolean;
  launchRpId: number;
  config?: PublicConfig;
  autoAnalysis: UseMutationResult<unknown, Error, void>;
  patternAnalysis: UseMutationResult<unknown, Error, void>;
  uniqueAnalysis: UseMutationResult<unknown, Error, void>;
  onNavigateBack: () => void;
};

export const LaunchDetailHeader = ({
  autoAnalysis,
  config,
  isGroupMode,
  launchRpId,
  onNavigateBack,
  patternAnalysis,
  subtitle,
  title,
  uniqueAnalysis,
}: LaunchDetailHeaderProps) => (
  <PageSection>
    <Breadcrumb className="app-breadcrumb">
      <BreadcrumbItem className="app-cursor-pointer" onClick={onNavigateBack}>
        Dashboard
      </BreadcrumbItem>
      <BreadcrumbItem isActive>{title}</BreadcrumbItem>
    </Breadcrumb>
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
    >
      <FlexItem>
        <Content component="h1">
          {title}
          {!isGroupMode && config && (
            <a
              aria-label="Open in ReportPortal"
              className="app-rp-link"
              href={`${config.rpLaunchBaseUrl}/${launchRpId}`}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLinkAltIcon /> ReportPortal
            </a>
          )}
        </Content>
        <Content component="small">{subtitle}</Content>
      </FlexItem>
      {!isGroupMode && (
        <FlexItem>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem>
                <Button
                  icon={<SearchIcon />}
                  isLoading={autoAnalysis.isPending}
                  variant="secondary"
                  onClick={() => autoAnalysis.mutate()}
                >
                  Auto-Analysis
                </Button>
              </ToolbarItem>
              <ToolbarItem>
                <Button
                  icon={<WrenchIcon />}
                  isLoading={patternAnalysis.isPending}
                  variant="secondary"
                  onClick={() => patternAnalysis.mutate()}
                >
                  Pattern Analysis
                </Button>
              </ToolbarItem>
              <ToolbarItem>
                <Button
                  isLoading={uniqueAnalysis.isPending}
                  variant="secondary"
                  onClick={() => uniqueAnalysis.mutate()}
                >
                  Unique Error
                </Button>
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        </FlexItem>
      )}
    </Flex>
  </PageSection>
);
