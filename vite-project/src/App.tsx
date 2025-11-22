import React, { useState, useEffect, useRef } from 'react';

// Import Components
import Sidebar from './components/Sidebar'; 
import ChatWindow from './components/ChatWindow';
import Panel from './components/Panel';
import UpgradeModal from './components/UpgradeModal';
import DocumentsView from './components/DocumentsView';
import ReasoningModal, { type ReasoningPhase } from './components/ReasoningModal';
import type { AgentPipelineState } from './components/AgentPipeline';

// Import API Client & Types
import type { Message } from './types';
import { streamChatQuery, uploadContract, checkHealth } from './api/client';

// Helper function
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

type AppSection = 'chat' | 'documents' | 'checklist' | 'history';

function App() {
    // --- STATE UI & CONFIG ---
    const [theme, setTheme] = useState('light');
    const [isLoggedIn, setIsLoggedIn] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<AppSection>('chat');
    
    // --- STATE CHAT & DATA ---
    const [inputValue, setInputValue] = useState('');
    const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'initial-bot-message',
            sender: 'bot',
            content: `**Xin chào!** Tôi là trợ lý pháp lý URA-xLaw. Tôi có thể giúp bạn tra cứu, so sánh, và tạo checklist tuân thủ từ các văn bản pháp luật ngân hàng.  
  
Bạn có thể thử các câu hỏi sau hoặc dùng các nút "Tác vụ Nâng cao" ở thanh bên phải:

* \`Thủ tục thành lập công ty TNHH?\`
* \`Quy định về thuế GTGT mới nhất?\``
        }
    ]);

    // --- STATE REASONING (GIỮ LẠI ĐỂ UI ĐẸP) ---
    const [reasoningOpen, setReasoningOpen] = useState(false);
    const [pipeline, setPipeline] = useState<AgentPipelineState>({
        intent: { status: 'idle' },
        retriever: { status: 'idle' },
        applicability: { status: 'idle' },
        citation: { status: 'idle' },
        llm: { status: 'idle' }
    });
    const [reasoningPhase, setReasoningPhase] = useState<ReasoningPhase>('idle');
    const [retrievalContent, setRetrievalContent] = useState('');
    const [reasoningLine, setReasoningLine] = useState('');

    // Ref cho input upload file ẩn
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- EFFECT: CHECK SERVER SỨC KHỎE ---
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        // Kiểm tra kết nối Backend khi mở app
        checkHealth();
    }, []);

    // --- HANDLERS UI ---
    const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    const handleLogin = () => setIsLoggedIn(true);
    const handleLogout = () => setIsLoggedIn(false);

    // --- HANDLER 1: UPLOAD FILE (KẾT NỐI PYTHON) ---
    const handleUploadClick = () => {
        // Kích hoạt thẻ input ẩn
        fileInputRef.current?.click();
    };

    const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Giả lập UI loading một chút
            setReasoningLine(`Đang tải lên file: ${file.name}...`);
            
            // Gọi API Upload
            const res = await uploadContract(file);
            
            // Lưu đường dẫn file server trả về
            setCurrentFilePath(res.file_path);
            
            alert(`✅ Upload thành công!\nFile: ${file.name}\nPath: ${res.file_path}\n\nBây giờ bạn có thể hỏi về nội dung file này.`);
            setReasoningLine(`Đã sẵn sàng phân tích: ${file.name}`);

        } catch (err) {
            console.error(err);
            alert("❌ Upload thất bại. Kiểm tra Terminal Python.");
        }
    };

    // --- HANDLER 2: CHAT (KẾT NỐI PYTHON) ---
    const handleSendMessage = async (query: string) => {
        if (!query.trim()) return;

        // 1. Hiển thị tin nhắn User
        const userMsg: Message = { id: `user-${Date.now()}`, sender: 'user', content: query };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');

        // 2. Tạo tin nhắn Bot (Loading)
        const botMsgId = `bot-${Date.now()}`;
        const thinkingMsg: Message = { 
            id: botMsgId, 
            sender: 'bot', 
            content: `<i class="fas fa-spinner fa-spin"></i> URA đang áp dụng các agent (Retriever, Applicability, Citation...) để xử lý...` 
        };
        setMessages(prev => [...prev, thinkingMsg]);

        // --- CẬP NHẬT UI PIPELINE (ĐỂ VISUALIZATION CHẠY) ---
        setPipeline({
            intent: { status: 'processing', intentName: 'Xử lý pháp lý' },
            retriever: { status: 'waiting' },
            applicability: { status: 'idle' },
            citation: { status: 'idle' },
            llm: { status: 'idle' }
        });
        setReasoningLine('Đang gửi yêu cầu tới AI Engine...');

        // 3. GỌI API PYTHON
        try {
            let accumulatedResponse = "";

            await streamChatQuery({
                query: query,
                messages: messages,
                filePath: currentFilePath, // Gửi kèm file nếu đã upload
                onToken: (fullText) => {
                    // Python backend hiện trả về full text 1 lần
                    accumulatedResponse = fullText;
                    
                    // Cập nhật tin nhắn Bot
                    setMessages(prev => prev.map(m => 
                        m.id === botMsgId 
                            ? { ...m, content: fullText, isLoading: false } 
                            : m
                    ));
                },
                onComplete: () => {
                    // Hoàn tất Pipeline UI
                    setPipeline(prev => ({ 
                        ...prev, 
                        intent: { status: 'valid', intentName: 'Hoàn tất' },
                        llm: { status: 'answerDone', intentName: 'Done' }
                    }));
                    setReasoningLine('Đã trả lời xong.');
                },
                onError: (err) => {
                    setMessages(prev => prev.map(m => 
                        m.id === botMsgId 
                            ? { ...m, content: `❌ Lỗi kết nối: ${err}`, isLoading: false } 
                            : m
                    ));
                }
            });

        } catch (e) {
            console.error(e);
        }
    };

    const handleShortcut = (text: string) => {
        setInputValue(text);
        handleSendMessage(text);
    };

    // --- RENDER ---
    return (
        <>
            {/* Input ẩn để upload file */}
            <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={onFileSelected}
                accept=".docx,.pdf,.txt"
            />

            {!isLoggedIn ? (
                // Màn hình Login giả lập (giữ nguyên của bạn)
                <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>
                   <button onClick={handleLogin} style={{padding: '20px'}}>Bấm vào đây để Đăng nhập</button>
                </div>
            ) : (
                <div id="app-screen" className="screen active">
                    <div className={`app ${activeSection === 'documents' ? 'documents-mode' : ''}`}>
                        <Sidebar
                            theme={theme}
                            onToggleTheme={toggleTheme}
                            onLogout={handleLogout}
                            onOpenUpgradeModal={() => setIsModalOpen(true)}
                            onNavigate={(section: string) => setActiveSection(section as AppSection)}
                            activeSection={activeSection}
                        />
                        
                        {activeSection === 'chat' && (
                            <ChatWindow
                                messages={messages}
                                inputValue={inputValue}
                                setInputValue={setInputValue}
                                onSendMessage={handleSendMessage}
                                onOpenReasoningModal={() => setReasoningOpen(true)}
                                hasRetrievalContext={!!currentFilePath}
                                reasoningLine={reasoningLine}
                                
                                // SỬA Ở ĐÂY: Bấm nút upload sẽ gọi hàm mở file, chứ không chuyển trang
                                onUploadClick={handleUploadClick} 
                            />
                        )}

                        {activeSection === 'documents' && (
                            <DocumentsView />
                        )}

                        {activeSection !== 'documents' && activeSection === 'chat' && (
                            <Panel onShortcutClick={handleShortcut} />
                        )}

                        {/* Placeholder cho các trang chưa làm */}
                        {activeSection !== 'chat' && activeSection !== 'documents' && (
                            <main className="placeholder" style={{ padding: '24px', flex: 1 }}>
                                <h2>Chức năng đang phát triển</h2>
                            </main>
                        )}
                    </div>
                </div>
            )}

            <UpgradeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
            
            {/* Giữ ReasoningModal để hiển thị pipeline đẹp mắt */}
            <ReasoningModal
                isOpen={reasoningOpen}
                phase={reasoningPhase}
                retrievalContent={retrievalContent}
                pipelineState={pipeline}
                onClose={() => setReasoningOpen(false)}
            />
        </>
    );
}

export default App;