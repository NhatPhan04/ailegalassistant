// src/types.ts

/**
 * Defines the possible senders of a message in the chat.
 */
export type Sender = 'user' | 'bot';

/**
 * Represents a single message object in the chat history.
 */
export interface Message {
    id: string;     
    sender: Sender;  
    content: string; 
}

