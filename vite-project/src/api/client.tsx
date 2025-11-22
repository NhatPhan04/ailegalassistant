import axios from 'axios';
import type { AxiosInstance } from 'axios';
// Import type Message từ file types của bạn
import type { Message } from '../types'; 

// ============================================================================
// 1. CẤU HÌNH (CONFIGURATION)
// ============================================================================

// Dùng 127.0.0.1 thay vì localhost để tránh lỗi kết nối trên Windows
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
let axiosInstance: AxiosInstance | null = null;

// Hàm khởi tạo Axios (Singleton)
function getAxios(): AxiosInstance {
  if (!axiosInstance) {
    axiosInstance = axios.create({ 
      baseURL: API_BASE_URL, 
      timeout: 60000, // Timeout 60s cho các câu hỏi dài
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
  return axiosInstance;
}

// Các hàm config cũ (giữ lại để tương thích code cũ)
export function configureApi(options: any) { 
  if (options.baseURL) API_BASE_URL = options.baseURL.replace(/\/$/, '');
  axiosInstance = null;
}
export function setApiKey(key: string, transport: any) { /* No-op */ }
export function setApiBaseUrl(url: string) { configureApi({ baseURL: url }); }

// ============================================================================
// 2. KIỂU DỮ LIỆU (TYPES)
// ============================================================================

// Payload gửi lên API Chat
export interface ChatRequest {
  query: string;
  file_path?: string | null;
  history?: ChatHistoryItem[];
}

// Định dạng lịch sử chat cho Python
export interface ChatHistoryItem { 
  role: 'user' | 'assistant'; 
  content: string; 
}

// Kết quả trả về khi Upload
export interface UploadResponse {
  file_path: string;
  message: string;
}

// Tham số cho hàm Chat ở Frontend
export interface StreamChatParams {
  query: string;
  messages: Message[];
  filePath?: string | null;
  onToken: (text: string) => void;
  onError?: (err: unknown) => void;
  onComplete?: () => void;
  // Thêm override để tương thích code cũ nếu cần
  overrides?: any; 
}

// ============================================================================
// 3. API CHÍNH (KẾT NỐI PYTHON BACKEND)
// ============================================================================

/**
 * API 0: Kiểm tra kết nối Server (Health Check)
 * Endpoint: GET /
 */
export async function checkHealth() {
  try {
    console.log("📡 Đang ping tới Backend...");
    const instance = getAxios();
    const res = await instance.get('/');
    console.log("✅ KẾT NỐI THÀNH CÔNG! Server trả lời:", res.data);
    // alert("✅ Đã kết nối được với AI Server!"); 
    return true;
  } catch (err) {
    console.error("❌ MẤT KẾT NỐI SERVER:", err);
    // alert("❌ Không tìm thấy Server Python (Port 8000). Hãy kiểm tra Terminal!");
    return false;
  }
}

/**
 * API 1: Upload File
 * Endpoint: POST /upload
 */
export async function uploadContract(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const instance = getAxios();
  const res = await instance.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Helper: Chuyển đổi lịch sử chat từ React (Message) sang Python (ChatHistoryItem)
 */
function buildConversationHistory(messages: Message[]): ChatHistoryItem[] {
  return messages
    .filter(m => !m.content.includes('fa-spinner') && !m.isLoading)
    .map(m => ({
      // Python dùng 'assistant', React của bạn dùng 'bot' -> cần map lại
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content
    }));
}

/**
 * API 2: Chat
 * Endpoint: POST /chat
 */
export async function streamChatQuery(params: StreamChatParams): Promise<void> {
  const { query, messages, filePath, onToken, onError, onComplete } = params;

  try {
    const body: ChatRequest = {
      query: query,
      file_path: filePath || null,
      history: buildConversationHistory(messages)
    };

    // Gọi API
    const res = await getAxios().post<string>('/chat', body);
    
    // Python trả về text trực tiếp
    const fullResponse = res.data;

    // Cập nhật UI
    if (onToken) onToken(fullResponse);
    if (onComplete) onComplete();

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