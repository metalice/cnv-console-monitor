import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { Button, Label, Flex, FlexItem, Spinner, Content } from '@patternfly/react-core';
import { BanIcon, LightbulbIcon, TimesIcon } from '@patternfly/react-icons';
import { useMutation } from '@tanstack/react-query';
import { marked } from 'marked';
import { apiFetch } from '../../api/client';

interface TestBlock {
  name: string;
  line: number;
  type: string;
  skipped?: boolean;
}

interface MonacoViewerProps {
  content: string;
  fileName: string;
  readOnly?: boolean;
  highlightLines?: number[];
  scrollToLine?: number;
  testBlocks?: TestBlock[];
  onContentChange?: (value: string) => void;
  onQuarantine?: (testName: string, line: number) => void;
}

function getLanguage(fileName: string): string {
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript';
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
  if (fileName.endsWith('.md')) return 'markdown';
  if (fileName.endsWith('.json')) return 'json';
  if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return 'yaml';
  return 'plaintext';
}

function useMonacoTheme(): string {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('pf-v6-theme-dark') ? 'vs-dark' : 'vs',
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('pf-v6-theme-dark') ? 'vs-dark' : 'vs');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

export const MonacoViewer: React.FC<MonacoViewerProps> = ({
  content, fileName, readOnly = true, highlightLines, scrollToLine, testBlocks, onContentChange, onQuarantine,
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
        if (block.type === 'test' || block.type === 'it') map.set(block.line, block);
      }
    }
    return map;
  }, [testBlocks]);

  const skippedCount = useMemo(() => testBlocks?.filter(b => b.skipped).length || 0, [testBlocks]);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;

    const decorations: MonacoEditor.IModelDeltaDecoration[] = [];

    if (highlightLines) {
      for (const line of highlightLines) {
        decorations.push({
          range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
          options: { isWholeLine: true, className: 'app-monaco-highlight-line', glyphMarginClassName: 'app-monaco-highlight-glyph' },
        });
      }
    }

    if (testBlocks) {
      for (const block of testBlocks) {
        if (block.type !== 'test' && block.type !== 'it') continue;
        decorations.push({
          range: { startLineNumber: block.line, startColumn: 1, endLineNumber: block.line, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: block.skipped ? 'app-monaco-skipped-line' : 'app-monaco-test-line',
            glyphMarginClassName: block.skipped ? 'app-monaco-skipped-glyph' : 'app-monaco-test-glyph',
            glyphMarginHoverMessage: { value: `**${block.name}**${block.skipped ? ' *(SKIPPED)*' : ''}` },
          },
        });
      }
    }

    if (decorations.length > 0) editor.deltaDecorations([], decorations);
    if (scrollToLine) editor.revealLineInCenter(scrollToLine);

    editor.onMouseMove((e) => {
      const lineNum = e.target.position?.lineNumber;
      if (lineNum && blockByLine.has(lineNum)) {
        setHoveredLine(lineNum);
        const top = editor.getTopForLineNumber(lineNum) - editor.getScrollTop();
        setActionBarTop(top);
      } else if (!selectedBlock) {
        setHoveredLine(null);
      }
    });

    editor.onMouseDown((e) => {
      const lineNum = e.target.position?.lineNumber;
      if (lineNum && blockByLine.has(lineNum)) {
        setSelectedBlock(blockByLine.get(lineNum)!);
        setAiInsight(null);
        const top = editor.getTopForLineNumber(lineNum) - editor.getScrollTop();
        setActionBarTop(top);
      }
    });
  }, [highlightLines, scrollToLine, testBlocks, blockByLine, selectedBlock]);

  useEffect(() => { setSelectedBlock(null); setAiInsight(null); setHoveredLine(null); }, [content, fileName]);

  const activeBlock = selectedBlock || (hoveredLine ? blockByLine.get(hoveredLine) : null);

  const aiMutation = useMutation({
    mutationFn: async (block: TestBlock) => {
      const lines = content.split('\n');
      const startLine = Math.max(0, block.line - 1);
      let endLine = startLine;
      let braceDepth = 0;
      let foundOpen = false;
      for (let i = startLine; i < lines.length && i < startLine + 100; i++) {
        for (const ch of lines[i]) { if (ch === '{') { braceDepth++; foundOpen = true; } if (ch === '}') braceDepth--; }
        endLine = i;
        if (foundOpen && braceDepth <= 0) break;
      }
      const testCode = lines.slice(startLine, endLine + 1).join('\n');
      const response = await apiFetch<{ content?: string; response?: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Analyze this test concisely:\n1. **What it tests**\n2. **Requirements**\n3. **Key assertions**\n4. **Risk if quarantined**\n5. **Related areas**\n\nTest: "${block.name}"\n\`\`\`typescript\n${testCode}\n\`\`\`\n\nUse markdown.` }],
          maxTokens: 500,
        }),
      });
      return response.content || response.response || 'No response';
    },
    onSuccess: (data) => setAiInsight(data),
    onError: (err) => setAiInsight(`**Error:** ${err instanceof Error ? err.message : 'Failed'}`),
  });

  return (
    <div className="app-monaco-container" ref={containerRef}>
      {skippedCount > 0 && (
        <div className="app-monaco-skip-banner">
          <Label color="orange" isCompact>{skippedCount} skipped test{skippedCount > 1 ? 's' : ''}</Label>
        </div>
      )}

      {selectedBlock && (
        <div className="app-code-action-bar">
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }} flexWrap={{ default: 'nowrap' }}>
            <FlexItem grow={{ default: 'grow' }}>
              <Label isCompact color={selectedBlock.skipped ? 'orange' : 'blue'} className="app-text-mono">
                {selectedBlock.skipped && '⊘ '}{selectedBlock.name}
              </Label>
            </FlexItem>
            <FlexItem>
              <Button variant="secondary" size="sm" icon={<BanIcon />} onClick={() => onQuarantine?.(selectedBlock.name, selectedBlock.line)}>Quarantine</Button>
            </FlexItem>
            <FlexItem>
              <Button variant="secondary" size="sm" icon={<LightbulbIcon />} onClick={() => aiMutation.mutate(selectedBlock)} isLoading={aiMutation.isPending}>AI Insight</Button>
            </FlexItem>
            <FlexItem>
              <Button variant="plain" size="sm" icon={<TimesIcon />} onClick={() => { setSelectedBlock(null); setAiInsight(null); }} />
            </FlexItem>
          </Flex>
          {aiMutation.isPending && <div className="app-code-ai-panel"><Spinner size="md" /> <span className="app-text-muted app-ml-sm">Analyzing...</span></div>}
          {aiInsight && <div className="app-code-ai-panel app-doc-content" dangerouslySetInnerHTML={{ __html: marked.parse(aiInsight, { async: false }) as string }} />}
        </div>
      )}

      <div className="app-monaco-editor-wrap">
        {activeBlock && !selectedBlock && (
          <div className="app-monaco-hover-actions" style={{ top: actionBarTop }}>
            <button type="button" className="app-monaco-hover-btn" title="Quarantine" onClick={() => onQuarantine?.(activeBlock.name, activeBlock.line)}>
              <BanIcon /> Quarantine
            </button>
            <button type="button" className="app-monaco-hover-btn app-monaco-hover-btn--ai" title="AI Insight" onClick={() => { setSelectedBlock(activeBlock); aiMutation.mutate(activeBlock); }}>
              <LightbulbIcon /> AI Insight
            </button>
          </div>
        )}
        <Editor
          height="calc(100vh - 450px)"
          language={language}
          value={content}
          theme={theme}
          onMount={handleMount}
          onChange={(value) => onContentChange?.(value || '')}
          options={{
            readOnly,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: language === 'markdown' ? 'on' : 'off',
            fontSize: 13,
            glyphMargin: !!testBlocks && testBlocks.length > 0,
            folding: true,
            automaticLayout: true,
            renderLineHighlight: 'all',
            tabSize: 2,
          }}
          loading={<div className="app-page-spinner"><Spinner /></div>}
        />
      </div>
    </div>
  );
};
