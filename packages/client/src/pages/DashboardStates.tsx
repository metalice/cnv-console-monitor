import {
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Gallery,
  GalleryItem,
  PageSection,
  Skeleton,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, SearchIcon, SyncAltIcon } from '@patternfly/react-icons';

type DashboardErrorProps = {
  error: unknown;
  onRetry: () => void;
};

export const DashboardError = ({ error, onRetry }: DashboardErrorProps) => (
  <PageSection isFilled>
    <EmptyState icon={ExclamationCircleIcon} titleText="Failed to load dashboard">
      <EmptyStateBody>
        {error instanceof Error ? error.message : 'An unexpected error occurred.'}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button icon={<SyncAltIcon />} variant="primary" onClick={onRetry}>
            Retry
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export const DashboardSkeleton = () => (
  <>
    <PageSection>
      <Content component="h1">Dashboard</Content>
    </PageSection>
    <PageSection>
      <Skeleton className="app-mb-md" height="40px" screenreaderText="Loading health status" />
      <Gallery hasGutter className="app-mb-xl" minWidths={{ default: '130px' }}>
        {Array.from({ length: 6 }, (_, idx) => (
          <GalleryItem key={idx}>
            <Skeleton height="80px" screenreaderText="Loading stat card" />
          </GalleryItem>
        ))}
      </Gallery>
      <Skeleton height="300px" screenreaderText="Loading launch table" />
    </PageSection>
  </>
);

type DashboardEmptyProps = {
  displayLabel: string;
};

export const DashboardEmpty = ({ displayLabel }: DashboardEmptyProps) => (
  <>
    <PageSection>
      <Content component="h1">Dashboard</Content>
    </PageSection>
    <PageSection isFilled>
      <EmptyState icon={SearchIcon} titleText="No launches found">
        <EmptyStateBody>
          No test launches were found for the selected time range ({displayLabel}). Try adjusting
          the date range or check that the data pipeline has run.
        </EmptyStateBody>
      </EmptyState>
    </PageSection>
  </>
);
