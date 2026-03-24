import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Gallery,
  GalleryItem,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { fetchReadinessVersions } from '../api/readiness';
import { ReadinessDetails } from '../components/readiness/ReadinessDetails';

const VersionPicker: React.FC = () => {
  const navigate = useNavigate();

  const { data: versions, isLoading } = useQuery({
    queryFn: fetchReadinessVersions,
    queryKey: ['readinessVersions'],
  });

  if (isLoading) {
    return (
      <div className="app-page-spinner">
        <Spinner aria-label="Loading versions" />
      </div>
    );
  }

  if (!versions?.length) {
    return (
      <PageSection>
        <EmptyState headingLevel="h4" titleText="No versions found">
          <EmptyStateBody>No CNV versions have been tracked yet.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Content component="h1">Version Readiness</Content>
        <Content component="small">Select a CNV version to assess ship-readiness</Content>
      </PageSection>
      <PageSection>
        <Gallery hasGutter minWidths={{ default: '250px' }}>
          {versions.map(ver => (
            <GalleryItem key={ver}>
              <Card isClickable isSelectable onClick={() => navigate(`/readiness/${ver}`)}>
                <CardBody>
                  <Content className="app-text-center" component="h3">
                    {ver}
                  </Content>
                </CardBody>
              </Card>
            </GalleryItem>
          ))}
        </Gallery>
      </PageSection>
    </>
  );
};

export const ReadinessPage: React.FC = () => {
  const { version } = useParams<{ version?: string }>();

  useEffect(() => {
    if (!version) {
      document.title = 'Version Readiness | CNV Console Monitor';
    }
  }, [version]);

  if (!version) {
    return <VersionPicker />;
  }
  return <ReadinessDetails version={version} />;
};
