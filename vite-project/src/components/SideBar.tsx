import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faComments, faFileAlt, faTasks, faHistory,
    faRocket, faSun, faMoon, faSignOutAlt
} from '@fortawesome/free-solid-svg-icons';

interface SidebarProps {
    theme: string;
    onToggleTheme: () => void;
    onLogout: () => void;
    onOpenUpgradeModal: () => void;
    onNavigate: (section: 'chat' | 'documents' | 'checklist' | 'history') => void;
    activeSection?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ theme, onToggleTheme, onLogout, onOpenUpgradeModal, onNavigate, activeSection = 'chat' }) => {
    return (
        <aside className="sidebar" aria-label="Thanh điều hướng chính">
            <div>
                <div className="brand" role="banner" style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    paddingBottom: '20px',
    marginBottom: '20px',
    borderBottom: '1px solid #eee',
    overflow: 'hidden'
}}>
    {/* Phần Logo: Nền VÀNG, chữ TỐI */}
    <div className="logo" style={{ 
        width: '40px', 
        height: '40px', 
        backgroundColor: '#FFC107', // <-- ĐÃ ĐỔI THÀNH MÀU VÀNG (Amber)
        color: '#2c3e50',           // <-- Đổi màu chữ thành xám đen cho dễ đọc trên nền vàng
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '18px',
        flexShrink: 0,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)' // Thêm chút bóng đổ cho nổi bật
    }}>
        AI
    </div>

    {/* Phần Text */}
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ 
            fontSize: '16px', 
            margin: '0 0 2px 0', 
            fontWeight: '700',
            color: '#2c3e50',
            whiteSpace: 'nowrap'
        }}>
            AI Legal Assistant
        </h1>
        <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            color: '#7f8c8d',
            whiteSpace: 'nowrap' 
        }}>
            Pháp lý cho doanh nghiệp
        </p>
    </div>
</div>

                <nav className="nav" aria-label="Điều hướng chính">
                    <a href="#" className={activeSection==='chat' ? 'active' : ''} onClick={(e)=>{e.preventDefault();onNavigate('chat');}}><FontAwesomeIcon icon={faComments} /> <span>Chat AI</span></a>
                    
                </nav>

                {/* Keep recent block for now only when chat view */}
                {activeSection === 'chat' && (
                    <div className="recent" style={{ marginTop: '14px' }}>
                        {/* <div style={{ fontWeight: 700, color: 'var(--muted)' }}>Gần đây</div>
                        <div className="item"><div>Checklist mở thẻ tín dụng</div><small>14:02 • hôm nay</small></div>
                        <div className="item"><div>So sánh NĐ 10 và 99</div><small>11:51 • hôm nay</small></div>
                        <div className="item"><div>Điều kiện vay thế chấp</div><small>09:33 • 2 Thg 8</small></div> */}
                    </div>
                )}
            </div>
            <div className="sidebar-footer">
                <button className="upgrade-btn" onClick={onOpenUpgradeModal}>
                    <FontAwesomeIcon icon={faRocket} /> Nâng cấp
                </button>
                <button className="footer-btn" id="theme-switcher" title="Chuyển đổi giao diện" onClick={onToggleTheme}>
                    <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
                    <span className="footer-btn-text">{theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}</span>
                </button>
                <button className="footer-btn" onClick={onLogout} title="Đăng xuất">
                    <FontAwesomeIcon icon={faSignOutAlt} />
                    <span className="footer-btn-text">Đăng xuất</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;