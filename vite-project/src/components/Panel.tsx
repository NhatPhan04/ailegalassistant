import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileAlt, 
  faTasks, 
  faExchangeAlt, 
  faQuoteRight, 
  faExternalLinkAlt 
} from '@fortawesome/free-solid-svg-icons';

// Định nghĩa kiểu dữ liệu cho trích dẫn
export interface Citation {
  id: string;
  content: string; // Nội dung trích dẫn
  source: string;  // Nguồn (VD: Điều 5, Thông tư 39)
}

interface PanelProps {
  onShortcutClick: (text: string) => void;
  citations?: Citation[]; // Thêm prop này (dấu ? nghĩa là không bắt buộc)
}

const Panel: React.FC<PanelProps> = ({ onShortcutClick, citations = [] }) => {
  
  // Dữ liệu mẫu (Fake data) để bạn thấy giao diện ngay lập tức
  // Sau này khi có API thật thì xóa dòng demoCitations này đi và dùng biến `citations` từ props
  const demoCitations: Citation[] = citations.length > 0 ? citations : [
    {
      id: '1',
      content: 'Tổ chức tín dụng có quyền tự chủ trong hoạt động kinh doanh và tự chịu trách nhiệm về kết quả kinh doanh của mình.',
      source: 'Điều 7, Luật Các tổ chức tín dụng 2010'
    }
  ];

  return (
    <aside className="panel" aria-label="Tài liệu tham khảo">
      {/* --- Phần 1: Tham chiếu nhanh --- */}
      <h3>Tham chiếu nhanh</h3>
      <div className="doc-card">
        <div className="title"><FontAwesomeIcon icon={faFileAlt} /> Thông tư 39/2016/TT-NHNN</div>
        <div className="meta">Quy định về hoạt động cho vay</div>
      </div>
      <div className="doc-card">
        <div className="title"><FontAwesomeIcon icon={faFileAlt} /> Thông tư 19/2016/TT-NHNN</div>
        <div className="meta">Quy định về hoạt động thẻ ngân hàng</div>
      </div>

      {/* --- Phần 2: Trích dẫn văn bản (MỚI THÊM) --- */}
      {demoCitations.length > 0 && (
        <>
          <h3 style={{ marginTop: '24px', color: '#d97706' }}>
             <FontAwesomeIcon icon={faQuoteRight} style={{ marginRight: '8px' }} />
             Trích dẫn liên quan
          </h3>
          <div className="citations-list">
            {demoCitations.map((cit) => (
              <div key={cit.id} className="doc-card citation-card" style={{ borderLeft: '3px solid #d97706', backgroundColor: '#fffbf0' }}>
                <div className="meta" style={{ fontStyle: 'italic', color: '#333', marginBottom: '8px' }}>
                  "{cit.content}"
                </div>
                <div className="title" style={{ fontSize: '0.85rem', color: '#d97706', display: 'flex', justifyContent: 'space-between' }}>
                  <span>— {cit.source}</span>
                  <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: '0.7rem', cursor: 'pointer' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- Phần 3: Tác vụ nâng cao --- */}
      <h3 style={{ marginTop: '24px' }}>Tác vụ Nâng cao</h3>
      <div className="shortcuts">
        <div className="chip" onClick={() => onShortcutClick('Tạo checklist tuân thủ cho việc mở thẻ tín dụng')}>
          <FontAwesomeIcon icon={faTasks} /> Tạo Checklist
        </div>
        <div className="chip" onClick={() => onShortcutClick('So sánh Nghị định 10/2023 và 99/2022 về đăng ký tsđb')}>
          <FontAwesomeIcon icon={faExchangeAlt} /> So sánh Văn bản
        </div>
      </div>
    </aside>
  );
};

export default Panel;