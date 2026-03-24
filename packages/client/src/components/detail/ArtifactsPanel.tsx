import React, { useState } from 'react';

import {
  Button,
  Content,
  ExpandableSection,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  Spinner,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { type ArtifactFile, fetchArtifacts } from '../../api/artifacts';

import { ScreenshotGallery, VideoList } from './ArtifactGalleries';

type ArtifactsPanelProps = {
  launchId: number;
};

export const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ launchId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ArtifactFile | null>(null);

  const { data, isLoading } = useQuery({
    enabled: isExpanded,
    queryFn: () => fetchArtifacts(launchId),
    queryKey: ['artifacts', launchId],
    staleTime: 5 * 60 * 1000,
  });

  const hasArtifacts = data && (data.videos.length > 0 || data.screenshots.length > 0);
  const toggleLabel = hasArtifacts
    ? `Test Artifacts (${data.screenshots.length} screenshots, ${data.videos.length} videos)`
    : 'Test Artifacts';

  return (
    <>
      <ExpandableSection
        isIndented
        isExpanded={isExpanded}
        toggleText={toggleLabel}
        onToggle={(_e, expanded) => setIsExpanded(expanded)}
      >
        {isLoading && <Spinner aria-label="Loading artifacts" size="md" />}

        {data && !hasArtifacts && (
          <Content component="small">No videos or screenshots available for this launch.</Content>
        )}

        {data && data.screenshots.length > 0 && (
          <ScreenshotGallery screenshots={data.screenshots} onSelect={setSelectedImage} />
        )}

        {data && data.videos.length > 0 && <VideoList videos={data.videos} />}

        {data?.artifactsPageUrl && (
          <Button
            component="a"
            href={data.artifactsPageUrl}
            icon={<ExternalLinkAltIcon />}
            rel="noreferrer"
            target="_blank"
            variant="link"
          >
            Open all artifacts in Jenkins
          </Button>
        )}
      </ExpandableSection>

      {selectedImage && (
        <Modal isOpen variant={ModalVariant.large} onClose={() => setSelectedImage(null)}>
          <ModalHeader title={`${selectedImage.testFile} — ${selectedImage.name}`} />
          <ModalBody>
            <img
              alt={selectedImage.name}
              className="app-screenshot-img-full"
              src={selectedImage.url}
            />
          </ModalBody>
        </Modal>
      )}
    </>
  );
};
