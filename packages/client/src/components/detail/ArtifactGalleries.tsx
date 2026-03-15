import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Content,
} from '@patternfly/react-core';
import { PlayIcon, ImageIcon } from '@patternfly/react-icons';
import type { ArtifactFile } from '../../api/artifacts';

type ScreenshotGalleryProps = {
  screenshots: ArtifactFile[];
  onSelect: (file: ArtifactFile) => void;
};

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ screenshots, onSelect }) => (
  <Card isPlain isCompact className="app-section-heading">
    <CardTitle>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem><ImageIcon /></FlexItem>
        <FlexItem>Failure Screenshots ({screenshots.length})</FlexItem>
      </Flex>
    </CardTitle>
    <CardBody>
      <Gallery hasGutter minWidths={{ default: '200px' }}>
        {screenshots.map((screenshot) => (
          <GalleryItem key={screenshot.path || screenshot.name}>
            <div
              onClick={() => onSelect(screenshot)}
              className="app-screenshot-thumb"
            >
              <img
                src={screenshot.url}
                alt={screenshot.name}
                loading="lazy"
                className="app-screenshot-img"
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
  <Card isPlain isCompact className="app-section-heading">
    <CardTitle>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem><PlayIcon /></FlexItem>
        <FlexItem>Test Videos ({videos.length})</FlexItem>
      </Flex>
    </CardTitle>
    <CardBody>
      {videos.map((video) => (
        <div key={video.name} className="app-section-heading">
          <Content component="small" className="app-mb-xs">
            <strong>{video.testFile}</strong>
          </Content>
          <video
            controls
            preload="metadata"
            className="app-video-player"
          >
            <source src={video.url} type="video/mp4" />
          </video>
        </div>
      ))}
    </CardBody>
  </Card>
);
