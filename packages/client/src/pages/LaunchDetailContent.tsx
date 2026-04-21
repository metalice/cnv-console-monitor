import { type PublicConfig, type TestItem } from '@cnv-monitor/shared';

import {
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

import { ArtifactsPanel } from '../components/detail/ArtifactsPanel';
import { JobInsightPanel } from '../components/detail/JobInsightPanel';
import { TestItemsTable } from '../components/detail/TestItemsTable';
import { type AggregatedItem } from '../utils/aggregation';

type LaunchDetailContentProps = {
  isLoading: boolean;
  isGroupMode: boolean;
  displayItems: AggregatedItem[];
  items?: TestItem[];
  config?: PublicConfig;
  launchRpId: number;
  launchIds: number[];
  onTriage: (ids: number[]) => void;
  onCreateJira: (item: TestItem) => void;
  onLinkJira: (id: number) => void;
  onNavigate: (path: string) => void;
};

export const LaunchDetailContent = ({
  config,
  displayItems,
  isGroupMode,
  isLoading,
  items,
  launchIds,
  launchRpId,
  onCreateJira,
  onLinkJira,
  onNavigate,
  onTriage,
}: LaunchDetailContentProps) => {
  if (isLoading) {
    return (
      <PageSection isFilled>
        <div className="app-page-spinner">
          <Spinner aria-label="Loading test items" />
        </div>
      </PageSection>
    );
  }

  if (displayItems.length === 0 && items) {
    return (
      <PageSection>
        <Card>
          <CardBody>
            <EmptyState variant="lg">
              <EmptyStateBody>
                No failed test items found.
                {items.length > 0
                  ? ` All ${items.length} test items passed or were skipped. The launch status is FAILED due to an infrastructure or setup issue, not individual test failures.`
                  : ' This launch may have failed at the infrastructure level (setup/teardown) before any tests ran.'}
                {config && !isGroupMode && (
                  <div className="app-mt-md">
                    <Button
                      component="a"
                      href={`${config.rpLaunchBaseUrl}/${launchRpId}`}
                      icon={<ExternalLinkAltIcon />}
                      rel="noreferrer"
                      target="_blank"
                      variant="link"
                    >
                      View in ReportPortal
                    </Button>
                  </div>
                )}
              </EmptyStateBody>
            </EmptyState>
          </CardBody>
        </Card>
      </PageSection>
    );
  }

  return (
    <>
      {!isGroupMode && (
        <PageSection>
          <JobInsightPanel launchRpId={launchRpId} />
        </PageSection>
      )}
      <PageSection>
        <Card>
          <CardBody>
            <TestItemsTable
              config={config}
              displayItems={displayItems}
              isGroupMode={isGroupMode}
              launchCount={launchIds.length}
              onCreateJira={onCreateJira}
              onLinkJira={onLinkJira}
              onNavigate={onNavigate}
              onTriage={onTriage}
            />
          </CardBody>
        </Card>
      </PageSection>
      {!isGroupMode && (
        <PageSection>
          <ArtifactsPanel launchId={launchRpId} />
        </PageSection>
      )}
    </>
  );
};
