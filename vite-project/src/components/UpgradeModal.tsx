import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faPlusCircle } from '@fortawesome/free-solid-svg-icons';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
    const currentUserPlan = 'TEAM'; // This can be passed as a prop if dynamic

    const choosePlan = (planName: string) => {
        alert(`Bạn đã chọn gói "${planName}". Cảm ơn bạn đã quan tâm! Chức năng này chỉ mang tính minh họa.`);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div id="upgrade-modal" className="modal-overlay active" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="modal-close" onClick={onClose}>&times;</span>
                <div className="modal-header">
                    <h2>Nâng cấp gói URA-xLaw</h2>
                    <p style={{ color: 'var(--muted)' }}>Chọn gói phù hợp với nhu cầu của bạn để mở khóa các tính năng cao cấp.</p>
                </div>
                <div className="plans-container">
                    {/* Plan 1: SOLO */}
                    <div className={`plan-card ${currentUserPlan === 'SOLO' ? 'current' : ''}`}>
                        {currentUserPlan === 'SOLO' && <span className="current-badge">Gói hiện tại</span>}
                        <h3>SOLO</h3>
                        <div className="audience">Cá nhân/SME</div>
                        <ul>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> Chat tra cứu + trích dẫn</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> LawGraph viewer</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> 500–1.500 câu hỏi/tháng</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> Export cơ bản</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> Email support</li>
                        </ul>
                        <div className="price">199k–399k <small>/người/tháng</small></div>
                        <button className="choose-plan-btn" onClick={() => choosePlan('SOLO')} disabled={currentUserPlan === 'SOLO'}>
                            {currentUserPlan === 'SOLO' ? 'Gói hiện tại' : 'Chọn gói SOLO'}
                        </button>
                    </div>

                    {/* Plan 2: TEAM */}
                    <div className={`plan-card ${currentUserPlan === 'TEAM' ? 'current' : ''}`}>
                        {currentUserPlan === 'TEAM' && <span className="current-badge">Gói hiện tại</span>}
                        <h3>TEAM</h3>
                        <div className="audience">Phòng pháp chế nhỏ/fintech (10–30 user)</div>
                        <ul>
                            <li><FontAwesomeIcon icon={faPlusCircle} /> Mọi quyền lợi gói SOLO</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> <strong>Diff & Redline</strong></li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> <strong>Checklist tuân thủ tự động</strong></li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> Báo cáo tuần</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> Webhook cảnh báo, SSO cơ bản</li>
                        </ul>
                        <div className="price">8–12 triệu <small>/tháng/tổ chức</small></div>
                        <button className="choose-plan-btn" onClick={() => choosePlan('TEAM')} disabled={currentUserPlan === 'TEAM'}>
                            {currentUserPlan === 'TEAM' ? 'Gói hiện tại' : 'Chọn gói TEAM'}
                        </button>
                    </div>

                    {/* Plan 3: ENTERPRISE CLOUD */}
                    <div className={`plan-card ${currentUserPlan === 'ENTERPRISE CLOUD' ? 'current' : ''}`}>
                        {currentUserPlan === 'ENTERPRISE CLOUD' && <span className="current-badge">Gói hiện tại</span>}
                        <h3>ENTERPRISE CLOUD</h3>
                        <div className="audience">TCTD/đơn vị lớn</div>
                        <ul>
                            <li><FontAwesomeIcon icon={faPlusCircle} /> Mọi quyền lợi gói TEAM</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> User theo domain</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> API</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> Namespace dữ liệu riêng</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> SLA 99%, hỗ trợ ưu tiên</li>
                        </ul>
                        <div className="price">60–120 triệu <small>/tháng</small></div>
                        <button className="choose-plan-btn" onClick={() => choosePlan('ENTERPRISE CLOUD')} disabled={currentUserPlan === 'ENTERPRISE CLOUD'}>
                            {currentUserPlan === 'ENTERPRISE CLOUD' ? 'Gói hiện tại' : 'Chọn gói Enterprise'}
                        </button>
                    </div>

                    {/* Plan 4: ENTERPRISE SUITE */}
                    <div className={`plan-card ${currentUserPlan === 'ENTERPRISE SUITE' ? 'current' : ''}`}>
                        {currentUserPlan === 'ENTERPRISE SUITE' && <span className="current-badge">Gói hiện tại</span>}
                        <h3>ENTERPRISE SUITE</h3>
                        <div className="audience">Ngân hàng cần triển khai nội bộ (on-prem)</div>
                        <ul>
                            <li><FontAwesomeIcon icon={faPlusCircle} /> Mọi quyền lợi gói Enterprise</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> Cài đặt nội bộ (UI + hệ thống)</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> SSO/SAML, audit trail</li>
                            <li><FontAwesomeIcon icon={faCheckCircle} /> Giám sát Prometheus, handover CI/CD</li>
                        </ul>
                        <div className="price">Liên hệ <small><br />Phí triển khai & vận hành</small></div>
                        <button className="choose-plan-btn" onClick={() => choosePlan('ENTERPRISE SUITE')} disabled={currentUserPlan === 'ENTERPRISE SUITE'}>
                            {currentUserPlan === 'ENTERPRISE SUITE' ? 'Gói hiện tại' : 'Liên hệ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;