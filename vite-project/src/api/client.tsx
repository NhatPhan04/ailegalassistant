import axios from 'axios';
import type { AxiosInstance } from 'axios';

// Central configurable API settings
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9621';
let apiKey: string | null = null;
let apiKeyTransport: 'header' | 'query' = 'header';
let axiosInstance: AxiosInstance | null = null;

interface ConfigureOptions {
  baseURL?: string;
  key?: string | null;
  transport?: 'header' | 'query';
}

export function configureApi(options: ConfigureOptions) {
  if (options.baseURL) API_BASE_URL = options.baseURL.replace(/\/$/, '');
  if (typeof options.key !== 'undefined') apiKey = options.key;
  if (options.transport) apiKeyTransport = options.transport;
  axiosInstance = null; // reset so it recreates with new config
}

function getAxios(): AxiosInstance {
  if (!axiosInstance) {
    axiosInstance = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
  }
  return axiosInstance;
}

// Helper to build auth placement
function applyAuth() {
  const headers: Record<string, string> = {};
  const params: Record<string, string> = {};
  if (apiKey) {
    if (apiKeyTransport === 'query') {
      params['api_key_header_value'] = apiKey;
    } else {
      headers['api_key_header_value'] = apiKey;
    }
  }
  return { headers, params };
}

export async function getDocuments() {
  const { headers, params } = applyAuth();
  const res = await getAxios().get('/documents', { headers, params });
  return res.data;
}

// Optional convenience to set key quickly
export function setApiKey(key: string, transport: 'header' | 'query' = 'header') {
  apiKey = key; apiKeyTransport = transport; axiosInstance = null;
}

export function setApiBaseUrl(url: string) { configureApi({ baseURL: url }); }

export function getApiConfig() {
  return { baseURL: API_BASE_URL, apiKey, apiKeyTransport };
}

export interface PaginatedDocumentsRequest {
  page: number;
  page_size: number;
  sort_direction?: 'asc' | 'desc';
  sort_field?: string;
  status_filter?: string; // e.g. processed
}

export interface DocumentSummary { id: string; [key: string]: unknown; }
export interface PaginatedDocumentsResponse {
  documents: DocumentSummary[];
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  status_counts: Record<string, number>;
}

export async function getDocumentsPaginated(req: PaginatedDocumentsRequest): Promise<PaginatedDocumentsResponse> {
  const { headers, params } = applyAuth();
  const body: PaginatedDocumentsRequest = {
    page: req.page,
    page_size: req.page_size,
    sort_direction: req.sort_direction || 'desc',
    sort_field: req.sort_field || 'updated_at',
    status_filter: req.status_filter || 'processed'
  };
  const res = await getAxios().post('/documents/paginated', body, { headers, params });
  return res.data;
}

export interface ChatHistoryItem { role: 'user' | 'assistant'; content: string; }
export interface ChatRequestBody {
  mode: string;
  response_type: string;
  top_k: number;
  chunk_top_k: number;
  max_entity_tokens: number;
  max_relation_tokens: number;
  max_total_tokens: number;
  only_need_context: boolean;
  only_need_prompt: boolean;
  stream: boolean;
  history_turns: number;
  user_prompt: string;
  enable_rerank: boolean;
  query: string;
  conversation_history: ChatHistoryItem[];
}

// Utility to build conversation history from existing messages
import type { Message } from '../types';

function buildConversationHistory(messages: Message[], maxTurns: number | undefined): ChatHistoryItem[] {
  // Exclude any in-progress spinner / placeholder messages
  const filtered = messages.filter(m => !m.content.includes('fa-spinner'));
  // Map to ChatHistoryItem
  const history: ChatHistoryItem[] = filtered.map(m => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.content
  }));
  if (!maxTurns || maxTurns <= 0) return history;
  // A "turn" is a user+assistant pair. We slice from the end.
  let turns = 0;
  const result: ChatHistoryItem[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    result.unshift(history[i]);
    if (history[i].role === 'user') {
      // Count turns when we encounter a user (assuming pattern user->assistant)
      turns++;
      if (turns >= maxTurns) break;
    }
  }
  return result;
}

export interface StreamChatParams {
  query: string;
  messages: Message[];
  historyTurns?: number; // number of previous user turns to include; 0 = none; undefined = all
  overrides?: Partial<Omit<ChatRequestBody, 'query' | 'conversation_history' | 'history_turns' | 'stream'>>;
  onToken: (delta: string) => void;
  signal?: AbortSignal;
  onError?: (err: unknown) => void;
  onComplete?: () => void;
}

export async function streamChatQuery(params: StreamChatParams): Promise<void> {
  const { query, messages, historyTurns, overrides, onToken, signal, onError, onComplete } = params;
  const conversation_history = buildConversationHistory(messages, historyTurns === undefined ? undefined : historyTurns);
  const body: ChatRequestBody = {
    mode: 'global',
    response_type: 'Multiple Paragraphs',
    top_k: 40,
    chunk_top_k: 20,
    max_entity_tokens: 6000,
    max_relation_tokens: 8000,
    max_total_tokens: 30000,
    only_need_context: false,
    only_need_prompt: false,
    stream: true,
    history_turns: historyTurns ?? conversation_history.filter(h => h.role === 'user').length,
    user_prompt: '',
    enable_rerank: true,
    query,
    conversation_history,
    ...overrides,
  } as ChatRequestBody;

  // Build URL with query param auth if needed
  let url = API_BASE_URL.replace(/\/$/, '') + '/query/stream';
  const { headers, params: queryParams } = applyAuth();
  if (Object.keys(queryParams).length) {
    const usp = new URLSearchParams(queryParams);
    url += (url.includes('?') ? '&' : '?') + usp.toString();
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json', ...headers },
      body: JSON.stringify(body),
      signal
    });
    if (!res.body) {
      if (onError) onError(new Error('No response body for stream'));
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim() !== '');
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) onToken(json.response);
        } catch {
          // ignore malformed line
        }
      }
    }
    if (onComplete) onComplete();
  } catch (err) {
    if (onError) onError(err);
  }
}

// New helper: retrieve context (only_need_context=true) expecting a single JSON object with 'response' field.
import type { Message as ChatMsg } from '../types';
export interface RetrieveContextParams {
  query: string;
  messages: ChatMsg[];
  historyTurns?: number;
  signal?: AbortSignal;
  onResult: (content: string) => void;
  onError?: (err: unknown) => void;
}
export async function retrieveContextOnce(params: RetrieveContextParams): Promise<void> {
  const { query, messages, historyTurns, signal, onResult, onError } = params;
  try {
    const conversation_history = buildConversationHistory(messages, historyTurns === undefined ? undefined : historyTurns);
    const body: ChatRequestBody = {
      mode: 'global',
      response_type: 'Multiple Paragraphs',
      top_k: 40,
      chunk_top_k: 20,
      max_entity_tokens: 6000,
      max_relation_tokens: 8000,
      max_total_tokens: 30000,
      only_need_context: true,
      only_need_prompt: false,
      stream: true, // backend still uses stream endpoint but will likely send one JSON line
      history_turns: historyTurns ?? conversation_history.filter(h => h.role === 'user').length,
      user_prompt: '',
      enable_rerank: true,
      query,
      conversation_history
    };

    let url = API_BASE_URL.replace(/\/$/, '') + '/query/stream';
    const { headers, params: queryParams } = applyAuth();
    if (Object.keys(queryParams).length) {
      const usp = new URLSearchParams(queryParams);
      url += (url.includes('?') ? '&' : '?') + usp.toString();
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json', ...headers },
      body: JSON.stringify(body),
      signal
    });
    if (!res.body) throw new Error('No response body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    // Split by newlines, parse each candidate line for JSON with 'response'
    let aggregated = '';
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const jsonStr = trimmed.startsWith('data:') ? trimmed.replace(/^data:\s*/, '') : trimmed;
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed.response === 'string') {
          aggregated += parsed.response; // accumulate if multiple
        }
      } catch {
        // ignore non-JSON lines
      }
    }
    if (!aggregated) {
      // fallback: return raw full text
      aggregated = text;
    }
    onResult(aggregated);
  } catch (err) {
    console.error("API Chat Error:", err);
    if (onError) onError(err);
  }
}

// ============================================================================
// 4. HÀM GIẢ LẬP (STUBS) - ĐỂ APP.TSX KHÔNG BỊ LỖI
// ============================================================================

// Hàm này App.tsx cũ có dùng, cần giữ lại vỏ rỗng
export async function retrieveContextOnce(params: any) {
  console.warn("retrieveContextOnce: Backend Python không dùng tính năng này, bỏ qua.");
  if (params && params.onResult) {
    params.onResult(""); 
  }
}

// Các hàm tài liệu (Backend chưa hỗ trợ -> trả về rỗng)
export async function getDocuments() {
  return [];
}

export async function getDocumentsPaginated(req: any) {
  return { 
    documents: [], 
    pagination: { 
      page: 1, total_count: 0, total_pages: 0, has_next: false, has_prev: false 
    },
    status_counts: {} 
  };
}