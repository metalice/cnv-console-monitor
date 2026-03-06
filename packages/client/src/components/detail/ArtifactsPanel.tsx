import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardTitle,
  ExpandableSection,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Button,
  Spinner,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  Content,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, PlayIcon, ImageIcon } from '@patternfly/react-icons';
import { fetchArtifacts, ArtifactFile } from '../../api/artifacts';

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
          <Card isPlain isCompact style={{ marginBottom: 16 }}>
            <CardTitle>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem><ImageIcon /></FlexItem>
                <FlexItem>Failure Screenshots ({data.screenshots.length})</FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              <Gallery hasGutter minWidths={{ default: '200px' }}>
                {data.screenshots.map((s) => (
                  <GalleryItem key={s.path || s.name}>
                    <div
                      onClick={() => setSelectedImage(s)}
                      style={{ cursor: 'pointer', border: '1px solid var(--pf-t--global--border--color--default)', borderRadius: 4, overflow: 'hidden' }}
                    >
                      <img
                        src={s.url}
                        alt={s.name}
                        loading="lazy"
                        style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{ padding: '6px 8px', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong>{s.testFile}</strong>
                        <br />
                        {s.name.replace(' (failed)', '')}
                      </div>
                    </div>
                  </GalleryItem>
                ))}
              </Gallery>
            </CardBody>
          </Card>
        )}

        {data && data.videos.length > 0 && (
          <Card isPlain isCompact style={{ marginBottom: 16 }}>
            <CardTitle>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem><PlayIcon /></FlexItem>
                <FlexItem>Test Videos ({data.videos.length})</FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              {data.videos.map((v) => (
                <div key={v.name} style={{ marginBottom: 16 }}>
                  <Content component="small" style={{ marginBottom: 4 }}>
                    <strong>{v.testFile}</strong>
                  </Content>
                  <video
                    controls
                    preload="metadata"
                    style={{ width: '100%', maxWidth: 800, borderRadius: 4, border: '1px solid var(--pf-t--global--border--color--default)' }}
                  >
                    <source src={v.url} type="video/mp4" />
                  </video>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {data?.artifactsPageUrl && (
          <Button
            variant="link"
            component="a"
            href={data.artifactsPageUrl}
            target="_blank"
            rel="noreferrer"
            icon={<ExternalLinkAltIcon />}
          >
            Open all artifacts in Jenkins
          </Button>
        )}
      </ExpandableSection>

      {selectedImage && (
        <Modal
          variant={ModalVariant.large}
          isOpen
          onClose={() => setSelectedImage(null)}
        >
          <ModalHeader title={`${selectedImage.testFile} — ${selectedImage.name}`} />
          <ModalBody>
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              style={{ width: '100%', borderRadius: 4 }}
            />
          </ModalBody>
        </Modal>
      )}
    </>
  );
};
