// src/types.ts
export interface Message {
  id?: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp?: number;
  isLoading?: boolean;
}