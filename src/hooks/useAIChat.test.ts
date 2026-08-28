import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIChat, extractThinkingAndClean } from './useAIChat';

// Mock dependencies
vi.mock('./usePromptConfig', () => ({
  usePromptConfig: () => ({
    activeProvider: 'ollama',
    ollamaModel: 'gemma:2b',
    systemPrompt: 'Custom Muse System Prompt',
    chatTemp: 0.7,
  }),
  getActiveModelName: () => 'gemma:2b',
}));

vi.mock('../context', () => ({
  useUI: () => ({
    setAiStatus: vi.fn(),
    registerTranslationAbort: vi.fn(),
  }),
}));

vi.mock('../lib/aiProviders', () => ({
  createAIProvider: vi.fn(() => ({
    chat: vi.fn(async (_messages, options) => {
      options?.onChunk?.('Hello from Muse!');
      return 'Hello from Muse!';
    }),
  })),
}));

describe('useAIChat (Muse Go! Chat Hook)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with default session', () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, 'file-1')
    );

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].title).toBe('New Conversation');
    expect(result.current.turns).toEqual([]);
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('creates a new session and switches to it', () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, 'file-1')
    );

    const firstId = result.current.activeSessionId;

    act(() => {
      result.current.newSession();
    });

    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.activeSessionId).not.toBe(firstId);
    expect(result.current.turns).toEqual([]);
  });

  it('selects an existing session', () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, 'file-1')
    );

    const firstId = result.current.activeSessionId;

    act(() => {
      result.current.newSession();
    });

    const secondId = result.current.activeSessionId;
    expect(secondId).not.toBe(firstId);

    act(() => {
      result.current.selectSession(firstId);
    });

    expect(result.current.activeSessionId).toBe(firstId);
  });

  it('deletes a session', () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, 'file-1')
    );

    act(() => {
      result.current.newSession();
    });

    expect(result.current.sessions).toHaveLength(2);
    const idToDelete = result.current.sessions[0].id;

    act(() => {
      result.current.deleteSession(idToDelete);
    });

    expect(result.current.sessions).toHaveLength(1);
  });

  it('recreates a session if the last one is deleted', () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, 'file-1')
    );

    const initialId = result.current.sessions[0].id;

    act(() => {
      result.current.deleteSession(initialId);
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).not.toBe(initialId);
  });

  it('sends message and appends turns', async () => {
    const { result } = renderHook(() =>
      useAIChat(() => null, null, 'file-1')
    );

    await act(async () => {
      await result.current.send('Hello Muse!', 'Hello Muse!');
    });

    expect(result.current.turns).toHaveLength(2);
    expect(result.current.turns[0].role).toBe('user');
    expect(result.current.turns[1].role).toBe('assistant');
    expect(result.current.turns[1].content).toBe('Hello from Muse!');
  });

  describe('extractThinkingAndClean', () => {
    it('strips completed think tags and returns clean content', () => {
      const input = '<think>Analyzing screenplay</think>Here is the answer.';
      const res = extractThinkingAndClean(input);
      expect(res.thinking).toBe('Analyzing screenplay');
      expect(res.cleanContent).toBe('Here is the answer.');
    });

    it('strips in-progress unclosed think tags during streaming', () => {
      const input = '<think>Analyzing screenplay in progress...';
      const res = extractThinkingAndClean(input);
      expect(res.thinking).toBe('Analyzing screenplay in progress...');
      expect(res.cleanContent).toBe('');
    });
  });
});
