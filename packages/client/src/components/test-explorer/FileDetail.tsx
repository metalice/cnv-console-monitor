/* eslint-disable max-lines */
import { marked } from 'marked';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { TreeNode } from '@cnv-monitor/shared';

import {
  ActionGroup,
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Spinner,
  TextArea,
} from '@patternfly/react-core';
import {
  BanIcon,
  CodeIcon,
  CubesIcon,
  ExternalLinkAltIcon,
  FolderIcon,
  MagicIcon,
  OutlinedFileAltIcon,
  PencilAltIcon,
  RepositoryIcon,
} from '@patternfly/react-icons';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  deleteDraftApi,
  fetchFileDetail,
  generateDocsApi,
  improveDocApi,
  saveDraftApi,
} from '../../api/testExplorer';

import { GapBadge } from './GapBadge';
const MonacoViewer = React.lazy(() =>
  import('./MonacoViewer').then(monacoModule => ({ default: monacoModule.MonacoViewer })),
);

type TestBlock = {
  name: string;
  line: number;
  type: string;
};

type FileDetailProps = {
  node: TreeNode;
  draftPaths?: Set<string>;
  onQuarantine?: (node: TreeNode) => void;
  onNavigate?: (path: string, highlightInfo?: { lines: number[]; scrollTo: number }) => void;
  highlightInfo?: { lines: number[]; scrollTo: number } | null;
};

// eslint-disable-next-line max-lines-per-function
export const FileDetail: React.FC<FileDetailProps> = ({
  draftPaths,
  highlightInfo,
  node,
  onNavigate,
  onQuarantine,
  // TODO: Refactor to reduce cognitive complexity
  // eslint-disable-next-line sonarjs/cognitive-complexity
}) => {
  const {
    data: rawDetail,
    isFetching,
    isLoading,
  } = useQuery({
    enabled:
      Boolean(node.repoId) && Boolean(node.path) && (node.type === 'doc' || node.type === 'test'),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => fetchFileDetail(node.repoId!, node.path!, node.branch),
    queryKey: ['fileDetail', node.repoId, node.path, node.branch],
  });

  const [prevPath, setPrevPath] = useState(node.path);
  const [detail, setDetail] = useState(rawDetail);

  if (node.path !== prevPath) {
    setPrevPath(node.path);
    setDetail(undefined);
  }

  useEffect(() => {
    if (rawDetail && !isFetching) {
      setDetail(rawDetail);
    }
  }, [rawDetail, isFetching]);

  const [editing, setEditing] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [improveInstructions, setImproveInstructions] = useState('');
  const [improveExpanded, setImproveExpanded] = useState(false);

  const hasDraft = Boolean(draftPaths && node.path && draftPaths.has(node.path));
  const isDocWithDraft = node.type === 'doc' && (editing || hasDraft);

  const improveMutation = useMutation({
    mutationFn: () =>
      improveDocApi({
        branch: node.branch ?? 'main',
        currentContent: editorContent,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        filePath: node.path!,
        instructions: improveInstructions,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        repoId: node.repoId!,
      }),
    onSuccess: data => {
      setEditorContent(data.content);
      setImproveInstructions('');
      setSaveStatus('saving');
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () =>
      generateDocsApi([
        {
          branch: node.branch ?? 'main',
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          filePath: node.path!,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          repoId: node.repoId!,
        },
      ]),
  });

  const typeIcon =
    node.type === 'doc' ? (
      <OutlinedFileAltIcon />
    ) : node.type === 'test' ? (
      <CodeIcon />
    ) : node.type === 'folder' ? (
      <FolderIcon />
    ) : node.type === 'component' ? (
      <CubesIcon />
    ) : node.type === 'repo' ? (
      <RepositoryIcon />
    ) : (
      <OutlinedFileAltIcon />
    );

  const counterpartTestBlocks = useMemo(
    () => (detail?.counterpartTestBlocks || []) as TestBlock[],
    [detail?.counterpartTestBlocks],
  );
  const testBlocks = (detail?.testBlocks || []) as TestBlock[];
  const testCaseLinks = useMemo(
    () =>
      (detail?.testCaseLinks || []) as {
        caseId: string;
        caseTitle: string;
        testName: string;
        line: number;
      }[],
    [detail?.testCaseLinks],
  );

  const renderDocContent = useCallback(
    (markdown: string): string => {
      let html = marked.parse(markdown, { async: false });

      if (!node.counterpartPath || counterpartTestBlocks.length === 0) {
        return html;
      }

      const findBestMatch = (text: string): TestBlock | null => {
        const lower = text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .trim();
        if (!lower) {
          return null;
        }

        for (const block of counterpartTestBlocks) {
          const blockLower = block.name.toLowerCase();
          if (blockLower === lower || blockLower.includes(lower) || lower.includes(blockLower)) {
            return block;
          }
        }

        const words = lower.split(/\s+/).filter(word => word.length > 3);
        if (words.length < 2) {
          return null;
        }
        let bestBlock: TestBlock | null = null;
        let bestScore = 0;
        for (const block of counterpartTestBlocks) {
          const blockLower = block.name.toLowerCase();
          const score = words.filter(word => blockLower.includes(word)).length / words.length;
          if (score > bestScore && score >= 0.4) {
            bestScore = score;
            bestBlock = block;
          }
        }
        return bestBlock;
      };

      const linkIcon =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" class="app-test-link-icon"><path fill="currentColor" d="M4.715 6.542L3.343 7.914a3 3 0 104.243 4.243l1.828-1.829A3 3 0 008.586 5.5L8 6.086a1 1 0 00-.154.199 2 2 0 01.861 3.337L6.88 11.45a2 2 0 11-2.83-2.83l.793-.792a4 4 0 01-.128-1.287z"/><path fill="currentColor" d="M6.586 4.672A3 3 0 007.414 9.5l.775-.776a2 2 0 01-.861-3.337l1.83-1.828a2 2 0 012.828 2.829l-.793.793c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 00-4.243-4.243L6.586 4.672z"/></svg>';

      for (const block of counterpartTestBlocks) {
        const escaped = block.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const quotePattern = new RegExp(
          `([""\u201C\u201D\u2018\u2019])(${escaped})([""\u201C\u201D\u2018\u2019])`,
          'g',
        );
        html = html.replace(
          quotePattern,
          (_match, openQuote, name, closeQuote) =>
            `${openQuote}<a class="app-test-link" data-line="${block.line}" data-path="${node.counterpartPath}" title="Jump to test: ${block.name} (line ${block.line})">${name} ${linkIcon}</a>${closeQuote}`,
        );
      }

      html = html.replace(
        /<h3\b[^>]*>((?:[^<]|<(?!\/h3\b))*)<\/h3>/gi,
        (fullMatch, innerHtml: string) => {
          const textOnly = innerHtml.replace(/<[^>]{1,10000}>/g, '');
          const caseMatch = /`?(\d{3}[a-z]?)`?\s*[:：]\s*(.{1,4000})/i.exec(textOnly);
          if (!caseMatch) {
            return fullMatch;
          }
          const caseId = caseMatch[1];

          const aiLink = testCaseLinks.find(caseLink => caseLink.caseId === caseId);
          if (aiLink) {
            return `<h3>${innerHtml} <a class="app-test-link app-test-link-heading" data-line="${aiLink.line}" data-path="${node.counterpartPath}" title="Jump to: ${aiLink.testName} (line ${aiLink.line})">${linkIcon} View test</a></h3>`;
          }

          const caseTitle = caseMatch[2].trim();
          const block = findBestMatch(caseTitle);
          if (!block) {
            return fullMatch;
          }
          return `<h3>${innerHtml} <a class="app-test-link app-test-link-heading" data-line="${block.line}" data-path="${node.counterpartPath}" title="Jump to: ${block.name} (line ${block.line})">${linkIcon} View test</a></h3>`;
        },
      );

      return html;
    },
    [node.counterpartPath, counterpartTestBlocks, testCaseLinks],
  );

  const activateTestLinkFromElement = useCallback(
    (target: HTMLElement) => {
      if (!target.classList.contains('app-test-link')) {
        return;
      }
      const line = parseInt(target.getAttribute('data-line') || '0', 10);
      const path = target.getAttribute('data-path');
      if (path && line && onNavigate) {
        onNavigate(path, { lines: [line], scrollTo: line });
      }
    },
    [onNavigate],
  );

  const handleDocClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('app-test-link')) {
        e.preventDefault();
      }
      activateTestLinkFromElement(target);
    },
    [activateTestLinkFromElement],
  );

  const handleDocKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') {
        return;
      }
      const target = e.target as HTMLElement;
      if (!target.classList.contains('app-test-link')) {
        return;
      }
      e.preventDefault();
      activateTestLinkFromElement(target);
    },
    [activateTestLinkFromElement],
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      saveDraftApi(node.repoId!, node.path!, {
        baseCommitSha: (detail?.baseCommitSha as string) || '',
        branch: node.branch || 'main',
        draftContent: editorContent,
        originalContent: content || '',
      }),
    onError: () => setSaveStatus('error'),
    onSuccess: () => setSaveStatus('saved'),
  });

  useEffect(() => {
    if (!editing || !editorContent || editorContent === content) {
      return;
    }
    setSaveStatus('saving');
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => saveMutation.mutate(), 1500);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced auto-save should only trigger on content change
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveMutation is stable via useMutation
  }, [editing, editorContent]);

  useEffect(() => {
    setEditing(false);
    setSaveStatus('idle');
  }, [node.path]);

  const handleDiscard = async () => {
    if (!confirm('Discard all changes to this file?')) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await deleteDraftApi(node.repoId!, node.path!, node.branch || 'main');
    setEditing(false);
    setEditorContent('');
    setSaveStatus('idle');
  };

  const frontmatter = (detail?.frontmatter ||
    (node as unknown as Record<string, unknown>).frontmatter) as
    | Record<string, unknown>
    | undefined;
  const content = detail?.content as string | undefined;
  const contentError = detail?.contentError as string | undefined;
  const pathParts = (node.path || '').split('/').filter(Boolean);
  const renderedHtml = useMemo(
    () => (content && node.type === 'doc' ? renderDocContent(content) : ''),
    [content, renderDocContent, node.type],
  );

  if (node.type === 'component' || node.type === 'repo' || node.type === 'folder') {
    return (
      <Card className="app-explorer-card">
        <CardHeader>
          <CardTitle>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>{typeIcon}</FlexItem>
              <FlexItem>
                <strong>{node.name}</strong>
              </FlexItem>
              <FlexItem>
                <Label isCompact>{node.type}</Label>
              </FlexItem>
            </Flex>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <DescriptionList isCompact isHorizontal>
            {node.fileCount !== undefined && (
              <DescriptionListGroup>
                <DescriptionListTerm>Files</DescriptionListTerm>
                <DescriptionListDescription>
                  <strong>{node.fileCount}</strong>
                </DescriptionListDescription>
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
    return (
      <Card className="app-explorer-card">
        <CardBody>
          <div className="app-page-spinner">
            <Spinner />
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="app-explorer-card">
      <CardHeader>
        <CardTitle>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
          >
            <FlexItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>{typeIcon}</FlexItem>
                <FlexItem>
                  <strong>{node.name}</strong>
                </FlexItem>
                <FlexItem>
                  <GapBadge hasCounterpart={node.hasCounterpart} type={node.type} />
                </FlexItem>
                {node.quarantine && (
                  <FlexItem>
                    <Label isCompact color="orange" icon={<BanIcon />}>
                      {node.quarantine.status}
                    </Label>
                  </FlexItem>
                )}
              </Flex>
            </FlexItem>
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                {(node.type === 'doc' || node.type === 'test') && content && (
                  <FlexItem>
                    <Button
                      icon={<PencilAltIcon />}
                      size="sm"
                      variant={editing ? 'primary' : 'secondary'}
                      onClick={() => {
                        if (editing) {
                          setEditing(false);
                        } else {
                          setEditorContent((detail?.draftContent as string) || content || '');
                          setEditing(true);
                        }
                      }}
                    >
                      {editing ? 'Preview' : 'Edit'}
                    </Button>
                  </FlexItem>
                )}
                {node.repoUrl && (
                  <FlexItem>
                    <Button
                      component="a"
                      href={node.repoUrl}
                      icon={<ExternalLinkAltIcon />}
                      rel="noreferrer"
                      size="sm"
                      target="_blank"
                      variant="link"
                    >
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
                // eslint-disable-next-line react/no-array-index-key
                <BreadcrumbItem isActive={i === pathParts.length - 1} key={i}>
                  {part}
                </BreadcrumbItem>
              ))}
            </Breadcrumb>
          )}
        </CardTitle>
      </CardHeader>
      <Divider />
      <CardBody>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          className="app-mb-md"
          flexWrap={{ default: 'wrap' }}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          <FlexItem>
            <Label isCompact color={node.type === 'doc' ? 'blue' : 'green'} icon={typeIcon}>
              {node.type === 'doc' ? 'Documentation' : 'Test'}
            </Label>
          </FlexItem>
          <FlexItem>
            {node.hasCounterpart && node.counterpartPath ? (
              <Button
                isInline
                className="app-text-mono app-text-sm"
                variant="link"
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                onClick={() => onNavigate?.(node.counterpartPath!)}
              >
                {node.type === 'doc' ? 'Test: ' : 'Doc: '}
                {node.counterpartPath.split('/').pop()}
              </Button>
            ) : node.hasCounterpart ? (
              <Label isCompact color="green">
                Matched
              </Label>
            ) : (
              <Label isCompact color="orange">
                {node.type === 'doc' ? 'No matching test' : 'No matching doc'}
              </Label>
            )}
          </FlexItem>
          {node.jiraKeys &&
            node.jiraKeys.length > 0 &&
            node.jiraKeys.map(key => (
              <FlexItem key={key}>
                <Label isCompact color="blue">
                  {key}
                </Label>
              </FlexItem>
            ))}
          {node.lastRunStatus && (
            <FlexItem>
              <Label
                isCompact
                color={
                  node.lastRunStatus === 'PASSED'
                    ? 'green'
                    : node.lastRunStatus === 'FAILED'
                      ? 'red'
                      : 'grey'
                }
              >
                {node.lastRunStatus}
              </Label>
            </FlexItem>
          )}
          {node.quarantine && (
            <FlexItem>
              <Label isCompact color="orange" icon={<BanIcon />}>
                {node.quarantine.status}
              </Label>
            </FlexItem>
          )}
        </Flex>

        {contentError && (
          <Alert isInline className="app-mb-md" title="Cannot load file content" variant="warning">
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
                <React.Suspense
                  fallback={
                    <div className="app-page-spinner">
                      <Spinner />
                    </div>
                  }
                >
                  <MonacoViewer
                    content={editorContent}
                    fileName={node.name}
                    readOnly={false}
                    onContentChange={setEditorContent}
                  />
                </React.Suspense>
                <div className="app-mt-sm">
                  <Button size="sm" variant="danger" onClick={handleDiscard}>
                    Discard changes
                  </Button>
                </div>
              </div>
            ) : (
              <div
                aria-label="Documentation preview"
                className="app-doc-content"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
                role="button"
                tabIndex={0}
                onClick={handleDocClick}
                onKeyDown={handleDocKeyDown}
              />
            )
          ) : (
            <React.Suspense
              fallback={
                <div className="app-page-spinner">
                  <Spinner />
                </div>
              }
            >
              <MonacoViewer
                content={editing ? editorContent : content}
                fileName={node.name}
                highlightLines={highlightInfo?.lines}
                readOnly={!editing}
                scrollToLine={highlightInfo?.scrollTo}
                testBlocks={testBlocks}
                onContentChange={editing ? setEditorContent : undefined}
                onQuarantine={testName => {
                  const testNode: TreeNode = {
                    branch: node.branch,
                    name: testName,
                    path: node.path,
                    repoId: node.repoId,
                    type: 'test',
                  };
                  onQuarantine?.(testNode);
                }}
              />
            </React.Suspense>
          )
        ) : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
        isLoading || isFetching || !detail ? (
          <div className="app-page-spinner">
            <Spinner />
          </div>
        ) : !contentError ? (
          <Content className="app-text-muted app-text-center app-mt-lg" component="p">
            No content available. The file may be empty or the access token needs to be refreshed in
            Settings &gt; Integrations &gt; Git.
          </Content>
        ) : null}

        {frontmatter && Object.keys(frontmatter).length > 0 && !frontmatter.testBlocks && (
          <ExpandableSection className="app-mt-lg" toggleText="Frontmatter">
            <DescriptionList isCompact isHorizontal>
              {Object.entries(frontmatter)
                .filter(([key]) => key !== 'testBlocks')
                .map(([key, val]) => (
                  <DescriptionListGroup key={key}>
                    <DescriptionListTerm className="app-text-mono">{key}</DescriptionListTerm>
                    <DescriptionListDescription>
                      {typeof val === 'object'
                        ? JSON.stringify(val)
                        : val === undefined
                          ? 'undefined'
                          : typeof val === 'string' ||
                              typeof val === 'number' ||
                              typeof val === 'boolean' ||
                              typeof val === 'bigint' ||
                              typeof val === 'symbol'
                            ? String(val)
                            : typeof val === 'function'
                              ? val.toString()
                              : JSON.stringify(val)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ))}
            </DescriptionList>
          </ExpandableSection>
        )}

        {isDocWithDraft && editing && node.repoId && node.path && (
          <ExpandableSection
            className="app-mt-lg"
            isExpanded={improveExpanded}
            toggleText={improveExpanded ? 'Hide Improve with AI' : 'Improve with AI'}
            onToggle={(_e, val) => setImproveExpanded(val)}
          >
            <TextArea
              aria-label="Improvement instructions"
              placeholder="e.g., Add more detail to test case 003, Include setup prerequisites..."
              rows={3}
              value={improveInstructions}
              onChange={(_e, val) => setImproveInstructions(val)}
            />
            <ActionGroup className="app-mt-sm">
              <Button
                icon={<MagicIcon />}
                isDisabled={!improveInstructions.trim()}
                isLoading={improveMutation.isPending}
                variant="primary"
                onClick={() => improveMutation.mutate()}
              >
                Apply
              </Button>
              <Button
                isLoading={regenerateMutation.isPending}
                variant="secondary"
                onClick={() => regenerateMutation.mutate()}
              >
                Regenerate
              </Button>
            </ActionGroup>
            {improveMutation.isError && (
              <Alert isInline className="app-mt-sm" title="Improve failed" variant="danger">
                {improveMutation.error instanceof Error
                  ? improveMutation.error.message
                  : 'Unknown error'}
              </Alert>
            )}
          </ExpandableSection>
        )}

        {node.type === 'test' && onQuarantine && !node.quarantine && (
          <div className="app-mt-lg">
            <Button icon={<BanIcon />} variant="secondary" onClick={() => onQuarantine(node)}>
              Quarantine This Test
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
