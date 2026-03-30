import { useEffect, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  clearAICache,
  configureAI,
  fetchAIStatus,
  fetchAIUsage,
  testAIConnection,
} from '../../api/ai';

const TWO_MINUTES_MS = 2 * 60 * 1000;

export type AITestResult = {
  success: boolean;
  error?: string;
  model?: string;
};

export const useAISettings = () => {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<AITestResult | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [defaultModel, setDefaultModel] = useState('gemini');
  const [defaultModelId, setDefaultModelId] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [vertexProjectId, setVertexProjectId] = useState('');
  const [vertexRegion, setVertexRegion] = useState('us-east5');
  const [vertexAccessToken, setVertexAccessToken] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryFn: fetchAIStatus,
    queryKey: ['aiStatus'],
    staleTime: TWO_MINUTES_MS,
  });

  const { data: usage } = useQuery({
    queryFn: fetchAIUsage,
    queryKey: ['aiUsage'],
    staleTime: TWO_MINUTES_MS,
  });

  useEffect(() => {
    if (status && !initialized) {
      setEnabled(status.enabled);
      if (status.defaultModel) {
        setDefaultModel(status.defaultModel);
      }
      if (status.defaultModelId) {
        setDefaultModelId(status.defaultModelId);
      }
      setInitialized(true);
    }
  }, [status, initialized]);

  const saveMutation = useMutation({
    mutationFn: () =>
      configureAI({
        anthropicKey: anthropicKey || undefined,
        defaultModel,
        defaultModelId: defaultModelId || undefined,
        enabled,
        geminiKey: geminiKey || undefined,
        ollamaUrl: ollamaUrl || undefined,
        openaiKey: openaiKey || undefined,
        vertexAccessToken: vertexAccessToken || undefined,
        vertexProjectId: vertexProjectId || undefined,
        vertexRegion: vertexRegion || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['aiStatus'] });
      setTestResult(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: (provider: string) => testAIConnection(provider),
    onSuccess: data => setTestResult(data),
  });

  const cacheMutation = useMutation({
    mutationFn: clearAICache,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aiUsage'] }),
  });

  return {
    anthropicKey,
    cacheMutation,
    defaultModel,
    defaultModelId,
    enabled,
    geminiKey,
    isLoading,
    ollamaUrl,
    openaiKey,
    saveMutation,
    setAnthropicKey,
    setDefaultModel,
    setDefaultModelId,
    setEnabled,
    setGeminiKey,
    setOllamaUrl,
    setOpenaiKey,
    setVertexAccessToken,
    setVertexProjectId,
    setVertexRegion,
    status,
    testMutation,
    testResult,
    usage,
    vertexAccessToken,
    vertexProjectId,
    vertexRegion,
  };
};
