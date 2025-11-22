import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faFilter, 
    faPlus, 
    faFilePdf, 
    faFileWord, 
    faEllipsisH, 
    faArrowLeft 
} from '@fortawesome/free-solid-svg-icons';
import UploadView from './UploadView'; // Import component Upload bạn đã làm

// Giả lập dữ liệu văn bản
const MOCK_DOCUMENTS = [
    { id: 1, code: '10/2023/NĐ-CP', title: 'Nghị định về việc sửa đổi, bổ sung một số điều của các nghị định hướng dẫn thi hành Luật Đất đai', type: 'pdf', date: '20/05/2023', size: '2.4 MB' },
    { id: 2, code: '19/2016/TT-NHNN', title: 'Thông tư quy định về hoạt động thẻ ngân hàng', type: 'doc', date: '30/06/2016', size: '1.1 MB' },
    { id: 3, code: '06/2023/TT-NHNN', title: 'Thông tư sửa đổi, bổ sung một số điều của Thông tư số 40/2011/TT-NHNN', type: 'pdf', date: '28/06/2023', size: '3.5 MB' },
    { id: 4, code: 'Luật Các TCTD 2024', title: 'Luật Các tổ chức tín dụng (sửa đổi)', type: 'pdf', date: '18/01/2024', size: '5.0 MB' },
    { id: 5, code: 'QĐ-1234/QĐ-NH', title: 'Quy định nội bộ về quy trình thẩm định tín dụng khách hàng cá nhân', type: 'doc', date: '15/02/2024', size: '850 KB' },
];

export default function DocumentsView() {
    const [viewMode, setViewMode] = useState<'list' | 'upload'>('list');
    const [searchTerm, setSearchTerm] = useState('');

    // Lọc dữ liệu theo ô tìm kiếm
    const filteredDocs = MOCK_DOCUMENTS.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        doc.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="documents-layout">
            {/* --- HEADER: Tiêu đề + Nút hành động --- */}
            <div className="doc-header">
                <div>
                    <h2 style={{ margin: 0, color: '#2c3e50' }}>
                        {viewMode === 'list' ? 'Kho Văn Bản Pháp Quy' : 'Tải Lên Tài Liệu Mới'}
                    </h2>
                    <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#7f8c8d' }}>
                        {viewMode === 'list' 
                            ? 'Quản lý và tra cứu văn bản pháp luật đã được số hóa.' 
                            : 'Thêm văn bản mới vào hệ thống Knowledge Base.'}
                    </p>
                </div>
                
                {/* Nút chuyển đổi chế độ */}
                {viewMode === 'list' ? (
                    <button className="primary-btn" onClick={() => setViewMode('upload')}>
                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: 8 }} />
                        Tải tài liệu
                    </button>
                ) : (
                    <button className="secondary-btn" onClick={() => setViewMode('list')}>
                        <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 8 }} />
                        Quay lại danh sách
                    </button>
                )}
            </div>

            {/* --- BODY: Hiển thị theo ViewMode --- */}
            <div className="doc-body">
                {viewMode === 'upload' ? (
                    // Nhúng Component UploadView vào đây
                    <UploadView />
                ) : (
                    // Giao diện Danh sách văn bản
                    <>
                        <div className="filter-bar">
                            <div className="search-box">
                                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                                <input 
                                    placeholder="Tìm theo số hiệu, trích yếu..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button className="filter-btn">
                                <FontAwesomeIcon icon={faFilter} /> Lọc
                            </button>
                        </div>

                        <div className="table-wrapper">
                            <table className="doc-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th style={{ width: '150px' }}>Số hiệu</th>
                                        <th>Trích yếu nội dung</th>
                                        <th style={{ width: '120px' }}>Ngày BH</th>
                                        <th style={{ width: '100px' }}>Định dạng</th>
                                        <th style={{ width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDocs.length > 0 ? (
                                        filteredDocs.map((doc, index) => (
                                            <tr key={doc.id}>
                                                <td style={{ textAlign: 'center', color: '#95a5a6' }}>{index + 1}</td>
                                                <td style={{ fontWeight: 600, color: '#3498db' }}>{doc.code}</td>
                                                <td>
                                                    <div className="doc-title" title={doc.title}>{doc.title}</div>
                                                </td>
                                                <td style={{ color: '#7f8c8d' }}>{doc.date}</td>
                                                <td>
                                                    <span className={`file-tag ${doc.type}`}>
                                                        <FontAwesomeIcon icon={doc.type === 'pdf' ? faFilePdf : faFileWord} />
                                                        {doc.type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', cursor: 'pointer', color: '#95a5a6' }}>
                                                    <FontAwesomeIcon icon={faEllipsisH} />
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#95a5a6' }}>
                                                Không tìm thấy văn bản nào phù hợp.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}