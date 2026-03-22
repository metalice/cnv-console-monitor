import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  LabelGroup,
  Button,
  Spinner,
  Tabs,
  Tab,
  TabTitleText,
  CodeBlock,
  CodeBlockCode,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import type { TreeNode } from '@cnv-monitor/shared';
import { fetchFileDetail } from '../../api/testExplorer';

interface FileDetailProps {
  node: TreeNode;
  onQuarantine?: (node: TreeNode) => void;
}

export const FileDetail: React.FC<FileDetailProps> = ({ node, onQuarantine }) => {
  const [activeTab, setActiveTab] = React.useState(0);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['fileDetail', node.repoId, node.path, node.branch],
    queryFn: () => fetchFileDetail(node.repoId!, node.path!, node.branch),
    enabled: !!node.repoId && !!node.path && (node.type === 'doc' || node.type === 'test'),
  });

  if (node.type === 'component' || node.type === 'repo' || node.type === 'folder') {
    return (
      <Card>
        <CardTitle>{node.name}</CardTitle>
        <CardBody>
          <DescriptionList isHorizontal isCompact>
            <DescriptionListGroup>
              <DescriptionListTerm>Type</DescriptionListTerm>
              <DescriptionListDescription><Label>{node.type}</Label></DescriptionListDescription>
            </DescriptionListGroup>
            {node.fileCount !== undefined && (
              <DescriptionListGroup>
                <DescriptionListTerm>Files</DescriptionListTerm>
                <DescriptionListDescription>{node.fileCount}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
            {node.gapCount !== undefined && (
              <DescriptionListGroup>
                <DescriptionListTerm>Gaps</DescriptionListTerm>
                <DescriptionListDescription>{node.gapCount}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </DescriptionList>
        </CardBody>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="app-page-spinner"><Spinner /></div>;
  }

  const frontmatter = (detail?.frontmatter || (node as unknown as Record<string, unknown>).frontmatter) as Record<string, unknown> | undefined;
  const content = detail?.content as string | undefined;

  return (
    <Card>
      <CardTitle>
        <span>{node.name}</span>
        {node.repoUrl && (
          <Button variant="link" component="a" href={node.repoUrl} target="_blank" rel="noreferrer" icon={<ExternalLinkAltIcon />} isInline>
            View in repo
          </Button>
        )}
      </CardTitle>
      <CardBody>
        <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
          <Tab eventKey={0} title={<TabTitleText>Details</TabTitleText>}>
            <DescriptionList isHorizontal isCompact className="app-mt-md">
              <DescriptionListGroup>
                <DescriptionListTerm>Type</DescriptionListTerm>
                <DescriptionListDescription><Label color={node.type === 'doc' ? 'blue' : 'green'}>{node.type}</Label></DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Path</DescriptionListTerm>
                <DescriptionListDescription className="app-text-mono">{node.path}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Counterpart</DescriptionListTerm>
                <DescriptionListDescription>
                  {node.hasCounterpart
                    ? <Label color="green">{node.counterpartPath || 'Matched'}</Label>
                    : <Label color="orange">Not matched</Label>}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {node.jiraKeys && node.jiraKeys.length > 0 && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Jira</DescriptionListTerm>
                  <DescriptionListDescription>
                    <LabelGroup>
                      {node.jiraKeys.map(key => <Label key={key} color="blue">{key}</Label>)}
                    </LabelGroup>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {node.polarionId && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Polarion</DescriptionListTerm>
                  <DescriptionListDescription>{node.polarionId}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {node.owner && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Owner</DescriptionListTerm>
                  <DescriptionListDescription>{node.owner}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {node.lastRunStatus && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Last Run</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color={node.lastRunStatus === 'PASSED' ? 'green' : node.lastRunStatus === 'FAILED' ? 'red' : 'grey'}>
                      {node.lastRunStatus}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {node.quarantine && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Quarantine</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color="orange">{node.quarantine.status} since {node.quarantine.since}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
            </DescriptionList>
            {frontmatter && Object.keys(frontmatter).length > 0 && (
              <>
                <h4 className="app-mt-lg">Frontmatter</h4>
                <DescriptionList isHorizontal isCompact>
                  {Object.entries(frontmatter).map(([key, val]) => (
                    <DescriptionListGroup key={key}>
                      <DescriptionListTerm>{key}</DescriptionListTerm>
                      <DescriptionListDescription>{String(val)}</DescriptionListDescription>
                    </DescriptionListGroup>
                  ))}
                </DescriptionList>
              </>
            )}
            <div className="app-mt-lg">
              {node.type === 'test' && onQuarantine && !node.quarantine && (
                <Button variant="secondary" onClick={() => onQuarantine(node)}>Quarantine</Button>
              )}
            </div>
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Content</TabTitleText>} isHidden={!content}>
            {content && (node.type === 'doc' ? (
              <div className="app-mt-md app-doc-content" dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <CodeBlock className="app-mt-md">
                <CodeBlockCode>{content}</CodeBlockCode>
              </CodeBlock>
            ))}
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
};
