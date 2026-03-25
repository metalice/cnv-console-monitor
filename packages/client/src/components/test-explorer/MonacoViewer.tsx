import { marked } from 'marked';
import type { editor as MonacoEditor } from 'monaco-editor';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Editor, { type OnMount } from '@monaco-editor/react';
import { Button, Flex, FlexItem, Label, Spinner } from '@patternfly/react-core';
import { BanIcon, LightbulbIcon, TimesIcon } from '@patternfly/react-icons';
import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '../../api/client';

type TestBlock = {
  name: string;
  line: number;
  type: string;
  skipped?: boolean;
};

type MonacoViewerProps = {
  content: string;
  fileName: string;
  readOnly?: boolean;
  highlightLines?: number[];
  scrollToLine?: number;
  testBlocks?: TestBlock[];
  onContentChange?: (value: string) => void;
  onQuarantine?: (testName: string, line: number) => void;
};

const getLanguage = (fileName: string): string => {
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
    return 'typescript';
  }
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
    return 'javascript';
  }
  if (fileName.endsWith('.md')) {
    return 'markdown';
  }
  if (fileName.endsWith('.json')) {
    return 'json';
  }
  if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
    return 'yaml';
  }
  return 'plaintext';
};

const useMonacoTheme = (): string => {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('pf-v6-theme-dark') ? 'vs-dark' : 'vs',
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('pf-v6-theme-dark') ? 'vs-dark' : 'vs');
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'], attributes: true });
    return () => observer.disconnect();
  }, []);
  return theme;
};

export const MonacoViewer: React.FC<MonacoViewerProps> = ({
  content,
  fileName,
  highlightLines,
  onContentChange,
  onQuarantine,
  readOnly = true,
  scrollToLine,
  testBlocks,
}) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TestBlock | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [actionBarTop, setActionBarTop] = useState(0);
  const theme = useMonacoTheme();
  const language = useMemo(() => getLanguage(fileName), [fileName]);

  const blockByLine = useMemo(() => {
    const map = new Map<number, TestBlock>();
    if (testBlocks) {
      for (const block of testBlocks) {
        if (block.type === 'test' || block.type === 'it') {
          map.set(block.line, block);
        }
      }
    }
    return map;
  }, [testBlocks]);

  const skippedCount = useMemo(
    () => testBlocks?.filter(block => block.skipped).length || 0,
    [testBlocks],
  );

  const handleMount: OnMount = useCallback(
    editor => {
      editorRef.current = editor;

      const decorations: MonacoEditor.IModelDeltaDecoration[] = [];

      if (highlightLines) {
        for (const line of highlightLines) {
          decorations.push({
            options: {
              className: 'app-monaco-highlight-line',
              glyphMarginClassName: 'app-monaco-highlight-glyph',
              isWholeLine: true,
            },
            range: { endColumn: 1, endLineNumber: line, startColumn: 1, startLineNumber: line },
          });
        }
      }

      if (testBlocks) {
        for (const block of testBlocks) {
          if (block.type !== 'test' && block.type !== 'it') {
            continue;
          }
          decorations.push({
            options: {
              className: block.skipped ? 'app-monaco-skipped-line' : 'app-monaco-test-line',
              glyphMarginClassName: block.skipped
                ? 'app-monaco-skipped-glyph'
                : 'app-monaco-test-glyph',
              glyphMarginHoverMessage: {
                value: `**${block.name}**${block.skipped ? ' *(SKIPPED)*' : ''}`,
              },
              isWholeLine: true,
            },
            range: {
              endColumn: 1,
              endLineNumber: block.line,
              startColumn: 1,
              startLineNumber: block.line,
            },
          });
        }
      }

      if (decorations.length > 0) {
        editor.deltaDecorations([], decorations);
      }
      if (scrollToLine) {
        editor.revealLineInCenter(scrollToLine);
      }

      editor.onMouseMove(e => {
        const lineNum = e.target.position?.lineNumber;
        if (lineNum && blockByLine.has(lineNum)) {
          setHoveredLine(lineNum);
          const top = editor.getTopForLineNumber(lineNum) - editor.getScrollTop();
          setActionBarTop(top);
        } else if (!selectedBlock) {
          setHoveredLine(null);
        }
      });

      editor.onMouseDown(e => {
        const lineNum = e.target.position?.lineNumber;
        if (lineNum && blockByLine.has(lineNum)) {
          setSelectedBlock(blockByLine.get(lineNum) ?? null);
          setAiInsight(null);
          const top = editor.getTopForLineNumber(lineNum) - editor.getScrollTop();
          setActionBarTop(top);
        }
      });
    },
    [highlightLines, scrollToLine, testBlocks, blockByLine, selectedBlock],
  );

  useEffect(() => {
    setSelectedBlock(null);
    setAiInsight(null);
    setHoveredLine(null);
  }, [content, fileName]);

  const activeBlock = selectedBlock ?? (hoveredLine ? blockByLine.get(hoveredLine) : null);

  const aiMutation = useMutation({
    mutationFn: async (block: TestBlock) => {
      const lines = content.split('\n');
      const startLine = Math.max(0, block.line - 1);
      let endLine = startLine;
      let braceDepth = 0;
      let foundOpen = false;
      for (let i = startLine; i < lines.length && i < startLine + 100; i++) {
        for (const char of lines[i]) {
          if (char === '{') {
            braceDepth++;
            foundOpen = true;
          }
          if (char === '}') {
            braceDepth--;
          }
        }
        endLine = i;
        if (foundOpen && braceDepth <= 0) {
          break;
        }
      }
      const testCode = lines.slice(startLine, endLine + 1).join('\n');
      const response = await apiFetch<{ content?: string; response?: string }>('/ai/chat', {
        body: JSON.stringify({
          maxTokens: 500,
          messages: [
            {
              content: `Analyze this test concisely:\n1. **What it tests**\n2. **Requirements**\n3. **Key assertions**\n4. **Risk if quarantined**\n5. **Related areas**\n\nTest: "${block.name}"\n\`\`\`typescript\n${testCode}\n\`\`\`\n\nUse markdown.`,
              role: 'user',
            },
          ],
        }),
        method: 'POST',
      });
      return response.content || response.response || 'No response';
    },
    onError: err => setAiInsight(`**Error:** ${err instanceof Error ? err.message : 'Failed'}`),
    onSuccess: data => setAiInsight(data),
  });

  return (
    <div className="app-monaco-container" ref={containerRef}>
      {skippedCount > 0 && (
        <div className="app-monaco-skip-banner">
          <Label isCompact color="orange">
            {skippedCount} skipped test{skippedCount > 1 ? 's' : ''}
          </Label>
        </div>
      )}

      {selectedBlock && (
        <div className="app-code-action-bar">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            flexWrap={{ default: 'nowrap' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem grow={{ default: 'grow' }}>
              <Label
                isCompact
                className="app-text-mono"
                color={selectedBlock.skipped ? 'orange' : 'blue'}
              >
                {selectedBlock.skipped && '⊘ '}
                {selectedBlock.name}
              </Label>
            </FlexItem>
            <FlexItem>
              <Button
                icon={<BanIcon />}
                size="sm"
                variant="secondary"
                onClick={() => onQuarantine?.(selectedBlock.name, selectedBlock.line)}
              >
                Quarantine
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                icon={<LightbulbIcon />}
                isLoading={aiMutation.isPending}
                size="sm"
                variant="secondary"
                onClick={() => aiMutation.mutate(selectedBlock)}
              >
                AI Insight
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                icon={<TimesIcon />}
                size="sm"
                variant="plain"
                onClick={() => {
                  setSelectedBlock(null);
                  setAiInsight(null);
                }}
              />
            </FlexItem>
          </Flex>
          {aiMutation.isPending && (
            <div className="app-code-ai-panel">
              <Spinner size="md" /> <span className="app-text-muted app-ml-sm">Analyzing...</span>
            </div>
          )}
          {aiInsight && (
            <div
              className="app-code-ai-panel app-doc-content"
              dangerouslySetInnerHTML={{
                __html: marked.parse(aiInsight, { async: false }),
              }}
            />
          )}
        </div>
      )}

      <div className="app-monaco-editor-wrap">
        {activeBlock && !selectedBlock && (
          <div className="app-monaco-hover-actions" style={{ top: actionBarTop }}>
            <button
              className="app-monaco-hover-btn"
              title="Quarantine"
              type="button"
              onClick={() => onQuarantine?.(activeBlock.name, activeBlock.line)}
            >
              <BanIcon /> Quarantine
            </button>
            <button
              className="app-monaco-hover-btn app-monaco-hover-btn--ai"
              title="AI Insight"
              type="button"
              onClick={() => {
                setSelectedBlock(activeBlock);
                aiMutation.mutate(activeBlock);
              }}
            >
              <LightbulbIcon /> AI Insight
            </button>
          </div>
        )}
        <Editor
          height="calc(100vh - 450px)"
          language={language}
          loading={
            <div className="app-page-spinner">
              <Spinner />
            </div>
          }
          options={{
            automaticLayout: true,
            folding: true,
            fontSize: 13,
            glyphMargin: Boolean(testBlocks?.length),
            lineNumbers: 'on',
            minimap: { enabled: false },
            readOnly,
            renderLineHighlight: 'all',
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: language === 'markdown' ? 'on' : 'off',
          }}
          theme={theme}
          value={content}
          onChange={value => onContentChange?.(value || '')}
          onMount={handleMount}
        />
      </div>
    </div>
  );
};
