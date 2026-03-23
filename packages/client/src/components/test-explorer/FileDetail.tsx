import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  Button,
  Spinner,
  Flex,
  FlexItem,
  Content,
  Divider,
  ExpandableSection,
  Breadcrumb,
  BreadcrumbItem,
  Alert,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, OutlinedFileAltIcon, CodeIcon, FolderIcon, CubesIcon, RepositoryIcon, BanIcon, PencilAltIcon } from '@patternfly/react-icons';
import { marked } from 'marked';
import type { TreeNode } from '@cnv-monitor/shared';
import { fetchFileDetail, saveDraftApi, deleteDraftApi, fetchDraftPaths } from '../../api/testExplorer';
import { GapBadge } from './GapBadge';
const MonacoViewer = React.lazy(() => import('./MonacoViewer').then(m => ({ default: m.MonacoViewer })));

interface TestBlock {
  name: string;
  line: number;
  type: string;
}

interface FileDetailProps {
  node: TreeNode;
  onQuarantine?: (node: TreeNode) => void;
  onNavigate?: (path: string, highlightInfo?: { lines: number[]; scrollTo: number }) => void;
  highlightInfo?: { lines: number[]; scrollTo: number } | null;
}

export const FileDetail: React.FC<FileDetailProps> = ({ node, onQuarantine, onNavigate, highlightInfo }) => {
  const { data: rawDetail, isLoading, isFetching } = useQuery({
    queryKey: ['fileDetail', node.repoId, node.path, node.branch],
    queryFn: () => fetchFileDetail(node.repoId!, node.path!, node.branch),
    enabled: !!node.repoId && !!node.path && (node.type === 'doc' || node.type === 'test'),
  });

  const [prevPath, setPrevPath] = useState(node.path);
  const [detail, setDetail] = useState(rawDetail);

  if (node.path !== prevPath) {
    setPrevPath(node.path);
    setDetail(undefined);
  }

  useEffect(() => {
    if (rawDetail && !isFetching) setDetail(rawDetail);
  }, [rawDetail, isFetching]);

  const [editing, setEditing] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typeIcon = node.type === 'doc' ? <OutlinedFileAltIcon />
    : node.type === 'test' ? <CodeIcon />
    : node.type === 'folder' ? <FolderIcon />
    : node.type === 'component' ? <CubesIcon />
    : node.type === 'repo' ? <RepositoryIcon />
    : <OutlinedFileAltIcon />;

  const counterpartTestBlocks = (detail?.counterpartTestBlocks || []) as TestBlock[];
  const testBlocks = (detail?.testBlocks || []) as TestBlock[];
  const testCaseLinks = (detail?.testCaseLinks || []) as Array<{ caseId: string; caseTitle: string; testName: string; line: number }>;

  const findTestBlockLine = useCallback((testName: string): number | null => {
    const blocks = node.type === 'doc' ? counterpartTestBlocks : testBlocks;
    const match = blocks.find(b =>
      b.name === testName ||
      b.name.toLowerCase().includes(testName.toLowerCase()) ||
      testName.toLowerCase().includes(b.name.toLowerCase())
    );
    return match?.line ?? null;
  }, [counterpartTestBlocks, testBlocks, node.type]);

  const renderDocContent = useCallback((markdown: string): string => {
    let html = marked.parse(markdown, { async: false }) as string;

    if (!node.counterpartPath || counterpartTestBlocks.length === 0) return html;

    const findBestMatch = (text: string): TestBlock | null => {
      const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      if (!lower) return null;

      for (const block of counterpartTestBlocks) {
        const blockLower = block.name.toLowerCase();
        if (blockLower === lower || blockLower.includes(lower) || lower.includes(blockLower)) return block;
      }

      const words = lower.split(/\s+/).filter(w => w.length > 3);
      if (words.length < 2) return null;
      let bestBlock: TestBlock | null = null;
      let bestScore = 0;
      for (const block of counterpartTestBlocks) {
        const blockLower = block.name.toLowerCase();
        const score = words.filter(w => blockLower.includes(w)).length / words.length;
        if (score > bestScore && score >= 0.4) { bestScore = score; bestBlock = block; }
      }
      return bestBlock;
    };

    const linkIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" class="app-test-link-icon"><path fill="currentColor" d="M4.715 6.542L3.343 7.914a3 3 0 104.243 4.243l1.828-1.829A3 3 0 008.586 5.5L8 6.086a1 1 0 00-.154.199 2 2 0 01.861 3.337L6.88 11.45a2 2 0 11-2.83-2.83l.793-.792a4 4 0 01-.128-1.287z"/><path fill="currentColor" d="M6.586 4.672A3 3 0 007.414 9.5l.775-.776a2 2 0 01-.861-3.337l1.83-1.828a2 2 0 012.828 2.829l-.793.793c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 00-4.243-4.243L6.586 4.672z"/></svg>';

    for (const block of counterpartTestBlocks) {
      const escaped = block.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const quotePattern = new RegExp(`([""\u201C\u201D\u2018\u2019])(${escaped})([""\u201C\u201D\u2018\u2019])`, 'g');
      html = html.replace(quotePattern, (_m, q1, name, q2) =>
        `${q1}<a class="app-test-link" data-line="${block.line}" data-path="${node.counterpartPath}" title="Jump to test: ${block.name} (line ${block.line})">${name} ${linkIcon}</a>${q2}`
      );
    }

    html = html.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (fullMatch, innerHtml) => {
      const textOnly = innerHtml.replace(/<[^>]+>/g, '');
      const caseMatch = textOnly.match(/`?(\d{3}[a-z]?)`?\s*[:：]\s*(.+)/i);
      if (!caseMatch) return fullMatch;
      const caseId = caseMatch[1];

      const aiLink = testCaseLinks.find(l => l.caseId === caseId);
      if (aiLink) {
        return `<h3>${innerHtml} <a class="app-test-link app-test-link-heading" data-line="${aiLink.line}" data-path="${node.counterpartPath}" title="Jump to: ${aiLink.testName} (line ${aiLink.line})">${linkIcon} View test</a></h3>`;
      }

      const caseTitle = caseMatch[2].trim();
      const block = findBestMatch(caseTitle);
      if (!block) return fullMatch;
      return `<h3>${innerHtml} <a class="app-test-link app-test-link-heading" data-line="${block.line}" data-path="${node.counterpartPath}" title="Jump to: ${block.name} (line ${block.line})">${linkIcon} View test</a></h3>`;
    });

    return html;
  }, [node.counterpartPath, counterpartTestBlocks, testCaseLinks]);

  const handleDocClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('app-test-link')) {
      e.preventDefault();
      const line = parseInt(target.getAttribute('data-line') || '0', 10);
      const path = target.getAttribute('data-path');
      if (path && line && onNavigate) {
        onNavigate(path, { lines: [line], scrollTo: line });
      }
    }
  }, [onNavigate]);

  const saveMutation = useMutation({
    mutationFn: () => saveDraftApi(node.repoId!, node.path!, {
      branch: node.branch || 'main',
      originalContent: content || '',
      draftContent: editorContent,
      baseCommitSha: (detail?.baseCommitSha as string) || '',
    }),
    onSuccess: () => setSaveStatus('saved'),
    onError: () => setSaveStatus('error'),
  });

  useEffect(() => {
    if (!editing || !editorContent || editorContent === content) return;
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveMutation.mutate(), 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [editorContent]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && editing) {
        e.preventDefault();
        saveMutation.mutate();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, editorContent]);

  useEffect(() => { setEditing(false); setSaveStatus('idle'); }, [node.path]);

  const handleDiscard = async () => {
    if (!confirm('Discard all changes to this file?')) return;
    await deleteDraftApi(node.repoId!, node.path!, node.branch || 'main');
    setEditing(false);
    setEditorContent('');
    setSaveStatus('idle');
  };

  const frontmatter = (detail?.frontmatter || (node as unknown as Record<string, unknown>).frontmatter) as Record<string, unknown> | undefined;
  const content = detail?.content as string | undefined;
  const contentError = detail?.contentError as string | undefined;
  const pathParts = (node.path || '').split('/').filter(Boolean);
  const renderedHtml = useMemo(() => content && node.type === 'doc' ? renderDocContent(content) : '', [content, renderDocContent, node.type]);

  if (node.type === 'component' || node.type === 'repo' || node.type === 'folder') {
    return (
      <Card className="app-explorer-card">
        <CardHeader>
          <CardTitle>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>{typeIcon}</FlexItem>
              <FlexItem><strong>{node.name}</strong></FlexItem>
              <FlexItem><Label isCompact>{node.type}</Label></FlexItem>
            </Flex>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <DescriptionList isHorizontal isCompact>
            {node.fileCount !== undefined && (
              <DescriptionListGroup>
                <DescriptionListTerm>Files</DescriptionListTerm>
                <DescriptionListDescription><strong>{node.fileCount}</strong></DescriptionListDescription>
              </DescriptionListGroup>
            )}
            {node.gapCount !== undefined && (
              <DescriptionListGroup>
                <DescriptionListTerm>Coverage Gaps</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label color={node.gapCount > 0 ? 'orange' : 'green'}>{node.gapCount}</Label>
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </DescriptionList>
        </CardBody>
      </Card>
    );
  }

  if (isLoading) {
    return <Card className="app-explorer-card"><CardBody><div className="app-page-spinner"><Spinner /></div></CardBody></Card>;
  }

  return (
    <Card className="app-explorer-card">
      <CardHeader>
        <CardTitle>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>{typeIcon}</FlexItem>
                <FlexItem><strong>{node.name}</strong></FlexItem>
                <FlexItem><GapBadge hasCounterpart={node.hasCounterpart} type={node.type} /></FlexItem>
                {node.quarantine && <FlexItem><Label color="orange" icon={<BanIcon />} isCompact>{node.quarantine.status}</Label></FlexItem>}
              </Flex>
            </FlexItem>
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                {(node.type === 'doc' || node.type === 'test') && content && (
                  <FlexItem>
                    <Button variant={editing ? 'primary' : 'secondary'} size="sm" icon={<PencilAltIcon />} onClick={() => {
                      if (editing) { setEditing(false); } else { setEditorContent((detail?.draftContent as string) || content || ''); setEditing(true); }
                    }}>
                      {editing ? 'Preview' : 'Edit'}
                    </Button>
                  </FlexItem>
                )}
                {node.repoUrl && (
                  <FlexItem>
                    <Button variant="link" component="a" href={node.repoUrl} target="_blank" rel="noreferrer" icon={<ExternalLinkAltIcon />} size="sm">
                      View in repo
                    </Button>
                  </FlexItem>
                )}
              </Flex>
            </FlexItem>
          </Flex>
          {pathParts.length > 1 && (
            <Breadcrumb className="app-mt-xs">
              {pathParts.map((part, i) => (
                <BreadcrumbItem key={i} isActive={i === pathParts.length - 1}>{part}</BreadcrumbItem>
              ))}
            </Breadcrumb>
          )}
        </CardTitle>
      </CardHeader>
      <Divider />
      <CardBody>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} className="app-mb-md" alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'wrap' }}>
          <FlexItem>
            <Label color={node.type === 'doc' ? 'blue' : 'green'} icon={typeIcon} isCompact>{node.type === 'doc' ? 'Documentation' : 'Test'}</Label>
          </FlexItem>
          <FlexItem>
            {node.hasCounterpart && node.counterpartPath ? (
              <Button variant="link" isInline className="app-text-mono app-text-sm" onClick={() => onNavigate?.(node.counterpartPath!)}>
                {node.type === 'doc' ? 'Test: ' : 'Doc: '}{node.counterpartPath.split('/').pop()}
              </Button>
            ) : node.hasCounterpart ? (
              <Label color="green" isCompact>Matched</Label>
            ) : (
              <Label color="orange" isCompact>{node.type === 'doc' ? 'No matching test' : 'No matching doc'}</Label>
            )}
          </FlexItem>
          {node.jiraKeys && node.jiraKeys.length > 0 && node.jiraKeys.map(key => (
            <FlexItem key={key}><Label color="blue" isCompact>{key}</Label></FlexItem>
          ))}
          {node.lastRunStatus && (
            <FlexItem>
              <Label color={node.lastRunStatus === 'PASSED' ? 'green' : node.lastRunStatus === 'FAILED' ? 'red' : 'grey'} isCompact>
                {node.lastRunStatus}
              </Label>
            </FlexItem>
          )}
          {node.quarantine && (
            <FlexItem>
              <Label color="orange" icon={<BanIcon />} isCompact>{node.quarantine.status}</Label>
            </FlexItem>
          )}
        </Flex>

        {contentError && (
          <Alert variant="warning" isInline title="Cannot load file content" className="app-mb-md">
            {contentError}
          </Alert>
        )}

        {content ? (
          node.type === 'doc' ? (
            editing ? (
              <div>
                <div className="app-mb-sm app-text-sm app-text-muted">
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && 'Saved'}
                  {saveStatus === 'error' && 'Save failed'}
                </div>
                <React.Suspense fallback={<div className="app-page-spinner"><Spinner /></div>}>
                  <MonacoViewer
                    content={editorContent}
                    fileName={node.name}
                    readOnly={false}
                    onContentChange={setEditorContent}
                  />
                </React.Suspense>
                <div className="app-mt-sm">
                  <Button variant="danger" size="sm" onClick={handleDiscard}>Discard changes</Button>
                </div>
              </div>
            ) : (
              <div className="app-doc-content" onClick={handleDocClick} dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            )
          ) : (
            <React.Suspense fallback={<div className="app-page-spinner"><Spinner /></div>}>
              <MonacoViewer
                content={editing ? editorContent : content}
                fileName={node.name}
                readOnly={!editing}
                highlightLines={highlightInfo?.lines}
                scrollToLine={highlightInfo?.scrollTo}
                testBlocks={testBlocks}
                onContentChange={editing ? setEditorContent : undefined}
                onQuarantine={(testName) => {
                  const testNode: TreeNode = { type: 'test', name: testName, path: node.path, repoId: node.repoId, branch: node.branch };
                  onQuarantine?.(testNode);
                }}
              />
            </React.Suspense>
          )
        ) : (isLoading || isFetching || !detail) ? (
          <div className="app-page-spinner"><Spinner /></div>
        ) : !contentError ? (
          <Content component="p" className="app-text-muted app-text-center app-mt-lg">
            No content available. The file may be empty or the access token needs to be refreshed in Settings &gt; Integrations &gt; Git.
          </Content>
        ) : null}

        {frontmatter && Object.keys(frontmatter).length > 0 && !frontmatter.testBlocks && (
          <ExpandableSection toggleText="Frontmatter" className="app-mt-lg">
            <DescriptionList isHorizontal isCompact>
              {Object.entries(frontmatter).filter(([key]) => key !== 'testBlocks').map(([key, val]) => (
                <DescriptionListGroup key={key}>
                  <DescriptionListTerm className="app-text-mono">{key}</DescriptionListTerm>
                  <DescriptionListDescription>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
          </ExpandableSection>
        )}

        {node.type === 'test' && onQuarantine && !node.quarantine && (
          <div className="app-mt-lg">
            <Button variant="secondary" icon={<BanIcon />} onClick={() => onQuarantine(node)}>Quarantine This Test</Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
