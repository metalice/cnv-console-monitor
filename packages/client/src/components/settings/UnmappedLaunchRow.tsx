import React, { useState } from 'react';
import {
  Button, Badge, Spinner, Content, Flex, FlexItem, Label,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
} from '@patternfly/react-core';
import { Tr, Td } from '@patternfly/react-table';
import { AngleRightIcon, AngleDownIcon } from '@patternfly/react-icons';
import { fetchLaunchDetails, type LaunchDetails } from '../../api/componentMappings';
import type { UnmappedEntry } from '../../api/componentMappings';

type UnmappedLaunchRowProps = {
  entry: UnmappedEntry;
  isAdmin: boolean;
  onMap: (name: string) => void;
};

const formatDate = (timestamp?: number): string => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const UnmappedLaunchRow: React.FC<UnmappedLaunchRowProps> = ({ entry, isAdmin, onMap }) => {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<LaunchDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!expanded && !details) {
      setLoading(true);
      try { setDetails(await fetchLaunchDetails(entry.name)); } catch { /* ignore */ }
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  return (
    <>
      <Tr isClickable onClick={handleToggle}>
        <Td>
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>{expanded ? <AngleDownIcon /> : <AngleRightIcon />}</FlexItem>
            <FlexItem><code className="app-text-xs">{entry.name}</code></FlexItem>
          </Flex>
        </Td>
        <Td><Badge isRead>{entry.count}</Badge></Td>
        {isAdmin && <Td><Button variant="link" size="sm" onClick={(event) => { event.stopPropagation(); onMap(entry.name); }}>Map</Button></Td>}
      </Tr>
      {expanded && (
        <Tr>
          <Td colSpan={isAdmin ? 3 : 2} className="app-expanded-row">
            {loading ? <Spinner size="md" /> : details?.found ? (
              <DescriptionList isCompact isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Runs</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem><strong>{details.totalRuns}</strong> total</FlexItem>
                      {(details.passed ?? 0) > 0 && <FlexItem><Label color="green" isCompact>{details.passed} passed</Label></FlexItem>}
                      {(details.failed ?? 0) > 0 && <FlexItem><Label color="red" isCompact>{details.failed} failed</Label></FlexItem>}
                      {(details.inProgress ?? 0) > 0 && <FlexItem><Label color="blue" isCompact>{details.inProgress} running</Label></FlexItem>}
                    </Flex>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DetailItem label="Period" value={`${formatDate(details.firstRun)} — ${formatDate(details.lastRun)}`} />
                <DetailItem label="CNV Version" value={details.cnvVersion} />
                <DetailItem label="Tier" value={details.tier} />
                <DetailItem label="Jenkins Team" value={details.jenkinsTeam} />
                {details.jenkinsMetadata && (
                  <>
                    <DetailItem label="Job Owner" value={details.jenkinsMetadata.owner as string} />
                    <DetailItem label="Description" value={details.jenkinsMetadata.name as string} />
                    {details.jenkinsMetadata.labels && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Labels</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                            {(details.jenkinsMetadata.labels as string[]).map((label) => <FlexItem key={label}><Label isCompact>{label}</Label></FlexItem>)}
                          </Flex>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                  </>
                )}
                {details.artifactsUrl && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Jenkins</DescriptionListTerm>
                    <DescriptionListDescription>
                      <a href={details.artifactsUrl.replace(/\/artifact\/?$/, '')} target="_blank" rel="noreferrer">Open Latest Build</a>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            ) : (
              <Content component="small" className="app-text-muted">No details available</Content>
            )}
          </Td>
        </Tr>
      )}
    </>
  );
};

const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (!value || value === '-') return null;
  return (
    <DescriptionListGroup>
      <DescriptionListTerm>{label}</DescriptionListTerm>
      <DescriptionListDescription>{value}</DescriptionListDescription>
    </DescriptionListGroup>
  );
};
