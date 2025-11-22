import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faCheckCircle, faTimesCircle, faArrowRightLong } from '@fortawesome/free-solid-svg-icons';

export interface AgentPipelineState {
  intent: { status: 'idle' | 'detecting' | 'valid' | 'error'; intentName?: string };
  retriever: { status: 'idle' | 'waiting' | 'retrieving' | 'success' | 'empty' | 'error'; info?: string; eCount?: number; rCount?: number; dCount?: number };
  applicability: { status: 'idle' | 'processing' | 'done' | 'error'; summary?: string };
  citation: { status: 'idle' | 'auditing' | 'passed' | 'flagged' | 'error'; issues?: string };
  llm: { status: 'idle' | 'intentPending' | 'intentDone' | 'answerPending' | 'answerGenerating' | 'answerDone' | 'error'; intentName?: string };
}

interface AgentPipelineProps {
  state: AgentPipelineState;
}

const statusIcon = (s: string) => {
  switch (s) {
    case 'detecting':
    case 'retrieving':
    case 'intentPending':
    case 'answerPending':
    case 'answerGenerating':
    case 'processing':
    case 'auditing':
      return <FontAwesomeIcon icon={faCircleNotch} spin />;
    case 'valid':
    case 'success':
    case 'intentDone':
    case 'answerDone':
    case 'done':
    case 'passed':
    case 'flagged': // still processed, show tick but flagged badge later
      return <FontAwesomeIcon icon={faCheckCircle} style={{ color: 'var(--success-color,#16a34a)' }} />;
    case 'empty':
    case 'error':
      return <FontAwesomeIcon icon={faTimesCircle} style={{ color: 'var(--error-color,#dc2626)' }} />;
    default:
      return <span style={{ opacity: 0.4 }}>•</span>;
  }
};

const badge = (text: string, tone: 'info' | 'success' | 'warn' | 'error') => {
  const colors: Record<string, string> = {
    info: 'var(--badge-info,#2563eb)',
    success: 'var(--badge-success,#16a34a)',
    warn: 'var(--badge-warn,#d97706)',
    error: 'var(--badge-error,#dc2626)'
  };
  return <span style={{ background: colors[tone], color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>{text}</span>;
};

const AgentCard: React.FC<{ title: string; children: React.ReactNode; status: string }> = ({ title, children, status }) => (
  <div className="agent-card" style={{ flex: 1, minWidth: 200, background: 'var(--agent-bg,rgba(255,255,255,0.5))', backdropFilter: 'blur(4px)', border: '1px solid var(--border-color,#ccc)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
      {statusIcon(status)} <span>{title}</span>
    </div>
    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{children}</div>
  </div>
);

const Arrow: React.FC<{ label?: string }>= ({ label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
    <FontAwesomeIcon icon={faArrowRightLong} style={{ opacity: 0.7 }} />
    {label && <div style={{ fontSize: 11, marginTop: 4, whiteSpace: 'nowrap', maxWidth: 140, textAlign: 'center' }}>{label}</div>}
  </div>
);

const AgentPipeline: React.FC<AgentPipelineProps> = ({ state }) => {
  const { intent, retriever, applicability, citation, llm } = state as any;

  const intentContent = () => {
    if (intent.status === 'detecting') return <>Đang xác định Intent…</>;
    if (intent.status === 'valid') return <>{badge('Intent hợp lệ','success')} {intent.intentName}</>;
    if (intent.status === 'error') return <>{badge('Lỗi','error')} Không xác định được intent</>;
    return <>Chờ yêu cầu…</>;
  };

  const retrieverContent = () => {
    switch (retriever.status) {
      case 'waiting': return <>Chờ Intent…</>;
      case 'retrieving': return <>Đang truy xuất từ CSDL + KG…</>;
      case 'success': return <>{badge('OK','success')} {(retriever.eCount!=null)&&(retriever.rCount!=null)&&(retriever.dCount!=null)?`E${retriever.eCount} R${retriever.rCount} D${retriever.dCount}`:retriever.info}</>;
      case 'empty': return <>{badge('Trống','warn')} Không có tài liệu.</>;
      case 'error': return <>{badge('Lỗi','error')} Thất bại truy xuất.</>;
      default: return <>Chờ Intent…</>;
    }
  };

  const applicabilityContent = () => {
    switch (applicability.status) {
      case 'processing': return <>Đánh giá hiệu lực & phạm vi…</>;
      case 'done': return <>{badge('Hiệu lực','info')} {applicability.summary || 'Hoàn tất'}</>;
      case 'error': return <>{badge('Lỗi','error')} Không xử lý được.</>;
      default: return <>Chờ Retriever…</>;
    }
  };

  const citationContent = () => {
    switch (citation.status) {
      case 'auditing': return <>Hậu kiểm trích dẫn…</>;
      case 'passed': return <>{badge('Guardrail','success')} OK</>;
      case 'flagged': return <>{badge('Cảnh báo','warn')} {citation.issues || 'Vấn đề'} </>;
      case 'error': return <>{badge('Lỗi','error')} Guardrail lỗi.</>;
      default: return <>Chờ Applicability…</>;
    }
  };

  const llmContent = () => {
    switch (llm.status) {
      case 'intentPending': return <>Phân loại intent…</>;
      case 'intentDone': return <>{badge('Intent','info')} {llm.intentName}</>;
      case 'answerPending': return <>Chuẩn bị sinh câu trả lời…</>;
      case 'answerGenerating': return <>Đang sinh câu trả lời…</>;
      case 'answerDone': return <>{badge('Hoàn tất','success')} Đã tạo câu trả lời.</>;
      case 'error': return <>{badge('Lỗi','error')} LLM lỗi.</>;
      default: return <>Nhàn rỗi.</>;
    }
  };

  // Arrow labels (simple; could be enhanced)
  const arrowIntentToRetriever = intent.status === 'valid' ? (intent.intentName || 'Intent') : undefined;
  const arrowRetrieverToApplic = retriever.status === 'success' ? 'Context' : undefined;
  const arrowApplicToCitation = applicability.status === 'done' ? 'Badges' : undefined;
  const arrowCitationToLLM = citation.status === 'passed' ? 'Verified ctx' : (citation.status === 'flagged' ? 'Issues found' : undefined);

  return (
    <div className="agent-pipeline" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, justifyContent: 'space-between', overflowX: 'auto', paddingBottom: 4 }}>
        <AgentCard title="Intent & Normalize" status={intent.status}>{intentContent()}</AgentCard>
        <Arrow label={arrowIntentToRetriever} />
        <AgentCard title="Retriever" status={retriever.status}>{retrieverContent()}</AgentCard>
        <Arrow label={arrowRetrieverToApplic} />
        <AgentCard title="Applicability & Effectivity" status={applicability.status}>{applicabilityContent()}</AgentCard>
        <Arrow label={arrowApplicToCitation} />
        <AgentCard title="Citation & Guardrail" status={citation.status}>{citationContent()}</AgentCard>
        <Arrow label={arrowCitationToLLM} />
        <AgentCard title="LLM" status={llm.status}>{llmContent()}</AgentCard>
      </div>
    </div>
  );
};

export default AgentPipeline;
