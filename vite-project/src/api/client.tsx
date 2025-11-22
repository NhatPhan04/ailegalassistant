// src/api/client.tsx
import axios, { type AxiosInstance } from 'axios';
import type { Message } from '../types';

// ================== CẤU HÌNH CHUNG ==================

let API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  axiosInstance = null; // reset để tạo instance mới
}

function getAxios(): AxiosInstance {
  if (!axiosInstance) {
    axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });
  }
  return axiosInstance;
}

// Áp dụng apiKey nếu có (header hoặc query)
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

export function setApiKey(key: string, transport: 'header' | 'query' = 'header') {
  apiKey = key;
  apiKeyTransport = transport;
  axiosInstance = null;
}

export function setApiBaseUrl(url: string) {
  configureApi({ baseURL: url });
}

export function getApiConfig() {
  return { baseURL: API_BASE_URL, apiKey, apiKeyTransport };
}

// ================== DOCUMENTS (STUB – cho hợp cấu trúc cũ) ==================

export interface PaginatedDocumentsRequest {
  page: number;
  page_size: number;
  sort_direction?: 'asc' | 'desc';
  sort_field?: string;
  status_filter?: string;
}

export interface DocumentSummary {
  id: string;
  [key: string]: unknown;
}

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

/** Backend mới chưa có /documents → trả rỗng cho UI không bị lỗi */
export async function getDocuments(): Promise<DocumentSummary[]> {
  return [];
}

export async function getDocumentsPaginated(
  req: PaginatedDocumentsRequest,
): Promise<PaginatedDocumentsResponse> {
  return {
    documents: [],
    pagination: {
      page: req.page,
      page_size: req.page_size,
      total_count: 0,
      total_pages: 0,
      has_next: false,
      has_prev: false,
    },
    status_counts: {},
  };
}

// ================== CHAT HISTORY ==================

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

function buildConversationHistory(
  messages: Message[],
  maxTurns: number | undefined,
): ChatHistoryItem[] {
  const filtered = messages.filter(
    (m) => !m.content.includes('fa-spinner'),
  );

  const history: ChatHistoryItem[] = filtered.map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  if (!maxTurns || maxTurns <= 0) return history;

  let turns = 0;
  const result: ChatHistoryItem[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    result.unshift(history[i]);
    if (history[i].role === 'user') {
      turns++;
      if (turns >= maxTurns) break;
    }
  }
  return result;
}

// ================== BACKEND LEGAL (FASTAPI) ==================

export interface UploadResponse {
  file_path: string;
  message: string;
}

/** Gọi /upload để upload hợp đồng DOCX */
export async function uploadContractToLegalBE(
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { headers, params } = applyAuth();

  const res = await getAxios().post('/upload', formData, {
    headers,
    params,
  });

  return res.data as UploadResponse;
}

export interface LegalChatRequest {
  query: string;
  file_path?: string | null;
  history?: ChatHistoryItem[];
}

/** Gọi /chat – backend trả về text/plain (markdown) */
export async function legalChatOnce(req: LegalChatRequest): Promise<string> {
  const { headers, params } = applyAuth();

  const res = await getAxios().post('/chat', req, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      Accept: 'text/plain',
    },
    params,
    responseType: 'text',
  });

  return res.data as string;
}

// ================== STREAM API GIẢ LẬP (cho ChatWindow) ==================

export interface StreamChatParams {
  query: string;
  messages: Message[];
  historyTurns?: number;
  overrides?: {
    file_path?: string | null;
  };
  onToken: (delta: string) => void;
  signal?: AbortSignal;
  onError?: (err: unknown) => void;
  onComplete?: () => void;
}

/** Giả stream: gọi /chat một lần, onToken nhận full text */
export async function streamChatQuery(
  params: StreamChatParams,
): Promise<void> {
  const {
    query,
    messages,
    historyTurns,
    overrides,
    onToken,
    signal,
    onError,
    onComplete,
  } = params;

  const conversation_history = buildConversationHistory(
    messages,
    historyTurns === undefined ? undefined : historyTurns,
  );

  try {
    const payload: LegalChatRequest = {
      query,
      file_path: overrides?.file_path ?? null,
      history: conversation_history,
    };

    const { headers, params: qs } = applyAuth();

    const res = await getAxios().post('/chat', payload, {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        Accept: 'text/plain',
      },
      params: qs,
      responseType: 'text',
      signal,
    });

    const text = res.data as string;
    onToken(text);
    if (onComplete) onComplete();
  } catch (err) {
    if (onError) onError(err);
  }
}

// ================== retrieveContextOnce đơn giản ==================

export interface RetrieveContextParams {
  query: string;
  messages: Message[];
  historyTurns?: number;
  signal?: AbortSignal;
  onResult: (content: string) => void;
  onError?: (err: unknown) => void;
}

export async function retrieveContextOnce(
  params: RetrieveContextParams,
): Promise<void> {
  const { query, messages, historyTurns, signal, onResult, onError } = params;
  const conversation_history = buildConversationHistory(
    messages,
    historyTurns === undefined ? undefined : historyTurns,
  );

  try {
    const payload: LegalChatRequest = {
      query,
      history: conversation_history,
    };

    const { headers, params: qs } = applyAuth();

    const res = await getAxios().post('/chat', payload, {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        Accept: 'text/plain',
      },
      params: qs,
      responseType: 'text',
      signal,
    });

    const text = res.data as string;
    onResult(text);
  } catch (err) {
    if (onError) onError(err);
  }
}
