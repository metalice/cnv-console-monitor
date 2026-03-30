import { useState } from 'react';

import {
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  ExpandableSection,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Label,
} from '@patternfly/react-core';
import { ArrowDownIcon, ArrowUpIcon, ExclamationCircleIcon } from '@patternfly/react-icons';

import { type CompareResult } from '../../api/compare';
import { StatCard } from '../common/StatCard';

import { compareDiffField } from './compareDiffField';
import { CompareTestItemTable } from './CompareTestItemTable';

type CompareResultsProps = {
  result: CompareResult;
  onReset: () => void;
};

export const CompareResults = ({ onReset, result }: CompareResultsProps) => {
  const [regressionsOpen, setRegressionsOpen] = useState(true);
  const [fixesOpen, setFixesOpen] = useState(true);
  const [persistentOpen, setPersistentOpen] = useState(false);
  const { summary } = result;

  const diffs = [
    compareDiffField(result.launchA.cnv_version, result.launchB.cnv_version, 'CNV Version'),
    compareDiffField(result.launchA.ocp_version, result.launchB.ocp_version, 'OCP Version'),
    compareDiffField(result.launchA.cluster_name, result.launchB.cluster_name, 'Cluster'),
    compareDiffField(result.launchA.status, result.launchB.status, 'Status'),
  ].filter(Boolean);

  return (
    <>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        className="app-mb-md"
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          <Content component="h3">
            Run #{result.launchA.rp_id} vs #{result.launchB.rp_id}
          </Content>
        </FlexItem>
        <FlexItem>
          <Button size="sm" variant="link" onClick={onReset}>
            Pick different runs
          </Button>
        </FlexItem>
      </Flex>

      <Gallery hasGutter className="app-mb-md" minWidths={{ default: '200px' }}>
        <GalleryItem>
          <StatCard
            color="var(--pf-t--global--color--status--danger--default)"
            help="Tests that passed in A but failed in B"
            label="Regressions"
            value={summary.regressions}
          />
        </GalleryItem>
        <GalleryItem>
          <StatCard
            color="var(--pf-t--global--color--status--success--default)"
            help="Tests that failed in A but passed in B"
            label="Fixes"
            value={summary.fixes}
          />
        </GalleryItem>
        <GalleryItem>
          <StatCard
            help="Tests that failed in both runs"
            label="Persistent"
            value={summary.persistent}
          />
        </GalleryItem>
      </Gallery>

      {diffs.length > 0 && (
        <Card isCompact className="app-mb-md">
          <CardBody>
            <Content className="app-mb-sm" component="h4">
              Environment Changes
            </Content>
            <DescriptionList isCompact isHorizontal>
              {diffs}
            </DescriptionList>
          </CardBody>
        </Card>
      )}

      <Card className="app-mb-md">
        <CardBody>
          <ExpandableSection
            isExpanded={regressionsOpen}
            toggleContent={
              <Label isCompact color="red" icon={<ArrowDownIcon />}>
                Regressions ({summary.regressions})
              </Label>
            }
            onToggle={(_e, isExpanded) => setRegressionsOpen(isExpanded)}
          >
            <CompareTestItemTable items={result.regressions} label="Regressions" />
          </ExpandableSection>
        </CardBody>
      </Card>

      <Card className="app-mb-md">
        <CardBody>
          <ExpandableSection
            isExpanded={fixesOpen}
            toggleContent={
              <Label isCompact color="green" icon={<ArrowUpIcon />}>
                Fixes ({summary.fixes})
              </Label>
            }
            onToggle={(_e, isExpanded) => setFixesOpen(isExpanded)}
          >
            <CompareTestItemTable items={result.fixes} label="Fixes" />
          </ExpandableSection>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <ExpandableSection
            isExpanded={persistentOpen}
            toggleContent={
              <Label isCompact color="grey" icon={<ExclamationCircleIcon />}>
                Persistent Failures ({summary.persistent})
              </Label>
            }
            onToggle={(_e, isExpanded) => setPersistentOpen(isExpanded)}
          >
            <CompareTestItemTable items={result.persistent} label="Persistent failures" />
          </ExpandableSection>
        </CardBody>
      </Card>
    </>
  );
};
