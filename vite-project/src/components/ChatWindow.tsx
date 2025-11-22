import React, { useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import type { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface ChatWindowProps {
    messages: Message[];
    inputValue: string;
    setInputValue: (value: string) => void;
    onSendMessage: (query: string) => void;
    onOpenReasoningModal: () => void;
    hasRetrievalContext: boolean;
    reasoningLine?: string;
    onUploadClick: () => void; // <--- THÊM DÒNG NÀY: Hàm xử lý khi bấm nút upload
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
    messages, 
    inputValue, 
    setInputValue, 
    onSendMessage, 
    onOpenReasoningModal, 
    hasRetrievalContext, 
    reasoningLine,
    onUploadClick // <--- THÊM DÒNG NÀY: Nhận prop
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleSendClick = () => {
        onSendMessage(inputValue);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage(inputValue);
        }
    };

    return (
        <main className="chat" aria-live="polite">
            <div className="chat-header">
                <div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Trò chuyện với</div>
                    <div className="title">Trợ lý Pháp lý AI LEGAL </div>
                    {reasoningLine && (
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
                            {reasoningLine}
                        </div>
                    )}
                </div>
                <div className="meta" id="model-status">AI Legal Assistant 2025</div>
            </div>

            <div className="messages" id="messages" tabIndex={0} role="log" aria-label="Tin nhắn">
                {messages.map((msg, idx) => {
                    const isThinkingMessage = msg.content.includes('fa-spinner');
                    const isLastBotMessage = msg.sender === 'bot' && idx === messages.length - 1;
                    const showReasoningButton = (isThinkingMessage || (hasRetrievalContext && isLastBotMessage));

                    return (
                        <div
                            key={msg.id}
                            className={`msg ${msg.sender}`}
                            role="article"
                            aria-label={`Tin nhắn từ ${msg.sender}`}
                        >
                            {isThinkingMessage ? (
                                <div>
                                    <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                                </div>
                            ) : (
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                    {msg.content}
                                </ReactMarkdown>
                            )}
                            {showReasoningButton && (
                                <div style={{ marginTop: 6 }}>
                                    <button
                                        style={{ fontSize: 12 }}
                                        className="choose-plan-btn"
                                        onClick={onOpenReasoningModal}
                                    >
                                        Xem tiến trình suy luận
                                    </button>
                                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
                                        ⚠️ Dữ liệu ngữ cảnh không được lưu vào cuộc trò chuyện và sẽ mất nếu bạn refresh trang.
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="composer" role="region" aria-label="Khung soạn tin">
                <div className="composer-main">
                    <div className="composer-input">
                        <input
                            id="message-input"
                            placeholder="Nhập câu hỏi của bạn (vd: quy định về TSĐB)..."
                            aria-label="Đặt một câu hỏi"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyPress}
                        />
                        <div className="composer-tools">
                            {/* SỬA Ở ĐÂY: Thêm sự kiện onClick */}
                            <button 
                                className="tool-btn" 
                                title="Đính kèm tệp" 
                                onClick={onUploadClick} 
                            >
                                <FontAwesomeIcon icon={faPaperclip} />
                            </button>
                        </div>
                    </div>
                </div>
                <button type="button" className="send-btn" onClick={handleSendClick}>
                    <FontAwesomeIcon icon={faPaperPlane} />
                </button>
            </div>
        </main>
    );
};

export default ChatWindow;