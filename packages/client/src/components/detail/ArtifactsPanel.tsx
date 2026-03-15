import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ExpandableSection,
  Button,
  Spinner,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  Content,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { fetchArtifacts, type ArtifactFile } from '../../api/artifacts';
import { ScreenshotGallery, VideoList } from './ArtifactGalleries';

type ArtifactsPanelProps = {
  launchId: number;
};

export const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ launchId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ArtifactFile | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['artifacts', launchId],
    queryFn: () => fetchArtifacts(launchId),
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  });

  const hasArtifacts = data && (data.videos.length > 0 || data.screenshots.length > 0);
  const toggleLabel = hasArtifacts
    ? `Test Artifacts (${data.screenshots.length} screenshots, ${data.videos.length} videos)`
    : 'Test Artifacts';

  return (
    <>
      <ExpandableSection
        toggleText={toggleLabel}
        onToggle={(_e, expanded) => setIsExpanded(expanded)}
        isExpanded={isExpanded}
        isIndented
      >
        {isLoading && <Spinner size="md" aria-label="Loading artifacts" />}

        {data && !hasArtifacts && (
          <Content component="small">No videos or screenshots available for this launch.</Content>
        )}

        {data && data.screenshots.length > 0 && (
          <ScreenshotGallery screenshots={data.screenshots} onSelect={setSelectedImage} />
        )}

        {data && data.videos.length > 0 && (
          <VideoList videos={data.videos} />
        )}

        {data?.artifactsPageUrl && (
          <Button variant="link" component="a" href={data.artifactsPageUrl} target="_blank" rel="noreferrer" icon={<ExternalLinkAltIcon />}>
            Open all artifacts in Jenkins
          </Button>
        )}
      </ExpandableSection>

      {selectedImage && (
        <Modal variant={ModalVariant.large} isOpen onClose={() => setSelectedImage(null)}>
          <ModalHeader title={`${selectedImage.testFile} — ${selectedImage.name}`} />
          <ModalBody>
            <img src={selectedImage.url} alt={selectedImage.name} className="app-screenshot-img-full" />
          </ModalBody>
        </Modal>
      )}
    </>
  );
};
