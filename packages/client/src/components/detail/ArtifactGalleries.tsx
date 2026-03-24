import React from 'react';

import {
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
} from '@patternfly/react-core';
import { ImageIcon, PlayIcon } from '@patternfly/react-icons';

import type { ArtifactFile } from '../../api/artifacts';

type ScreenshotGalleryProps = {
  screenshots: ArtifactFile[];
  onSelect: (file: ArtifactFile) => void;
};

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ onSelect, screenshots }) => (
  <Card isCompact isPlain className="app-section-heading">
    <CardTitle>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <ImageIcon />
        </FlexItem>
        <FlexItem>Failure Screenshots ({screenshots.length})</FlexItem>
      </Flex>
    </CardTitle>
    <CardBody>
      <Gallery hasGutter minWidths={{ default: '200px' }}>
        {screenshots.map(screenshot => (
          <GalleryItem key={screenshot.path || screenshot.name}>
            <div
              className="app-screenshot-thumb"
              role="button"
              tabIndex={0}
              onClick={() => onSelect(screenshot)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(screenshot);
                }
              }}
            >
              <img
                alt={screenshot.name}
                className="app-screenshot-img"
                loading="lazy"
                src={screenshot.url}
              />
              <div className="app-screenshot-label">
                <strong>{screenshot.testFile}</strong>
                <br />
                {screenshot.name.replace(' (failed)', '')}
              </div>
            </div>
          </GalleryItem>
        ))}
      </Gallery>
    </CardBody>
  </Card>
);

type VideoListProps = {
  videos: ArtifactFile[];
};

export const VideoList: React.FC<VideoListProps> = ({ videos }) => (
  <Card isCompact isPlain className="app-section-heading">
    <CardTitle>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <PlayIcon />
        </FlexItem>
        <FlexItem>Test Videos ({videos.length})</FlexItem>
      </Flex>
    </CardTitle>
    <CardBody>
      {videos.map(video => (
        <div className="app-section-heading" key={video.name}>
          <Content className="app-mb-xs" component="small">
            <strong>{video.testFile}</strong>
          </Content>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- test recordings have no audio track */}
          <video controls className="app-video-player" preload="metadata">
            <source src={video.url} type="video/mp4" />
          </video>
        </div>
      ))}
    </CardBody>
  </Card>
);
