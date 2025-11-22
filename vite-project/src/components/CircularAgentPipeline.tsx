import React, { useMemo } from 'react';
import type { AgentPipelineState } from './AgentPipeline';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import intentImg from '../assets/ailegal/intent.png';
import retrieverImg from '../assets/ailegal/retriever.png';
import applicabilityImg from '../assets/ailegal/applicability.png';
import citeImg from '../assets/ailegal/cite_guardrail.png';
import llmImg from '../assets/ailegal/llm.png';

interface CircularAgentPipelineProps {
  state: AgentPipelineState;
  size?: number; // diameter px
  
}

const nodeIcon = (status: string) => {
  switch (status) {
    case 'detecting':
    case 'retrieving':
    case 'intentPending':
    case 'answerGenerating':
    case 'answerPending':
    case 'processing':
    case 'auditing':
      return <FontAwesomeIcon icon={faCircleNotch} spin />;
    case 'valid':
    case 'success':
    case 'intentDone':
    case 'answerDone':
    case 'done':
    case 'passed':
    case 'flagged':
      return <FontAwesomeIcon icon={faCheckCircle} style={{ color: 'var(--success-color,#16a34a)' }} />;
    case 'error':
    case 'empty':
      return <FontAwesomeIcon icon={faTimesCircle} style={{ color: 'var(--error-color,#dc2626)' }} />;
    default:
      return <span style={{ opacity: 0.4 }}>•</span>;
  }
};

// Determine which directional arrows to show based on pipeline lifecycle.
// Only one active arrow at a time per spec.
function deriveArrows(state: AgentPipelineState) {
  const arrows: { from: string; to: string }[] = [];
  // Intent classification phase
  if (state.intent.status === 'detecting' || state.llm.status === 'intentPending') {
    arrows.push({ from: 'intent', to: 'llm' });
    return arrows;
  }
  // Intent validated -> retrieval
  if (state.intent.status === 'valid' && state.retriever.status === 'retrieving') {
    arrows.push({ from: 'intent', to: 'retriever' });
    return arrows;
  }
  // Retrieval done -> applicability
  if (state.retriever.status === 'success' && state.applicability?.status === 'processing') {
    arrows.push({ from: 'retriever', to: 'applicability' });
    return arrows;
  }
  // Applicability done -> citation
  if (state.applicability?.status === 'done' && (state.citation?.status === 'auditing')) {
    arrows.push({ from: 'applicability', to: 'citation' });
    return arrows;
  }
  // Citation passed/flagged -> LLM answer pending/generating
  if ((state.citation?.status === 'passed' || state.citation?.status === 'flagged') && (state.llm.status === 'answerPending' || state.llm.status === 'answerGenerating')) {
    arrows.push({ from: 'citation', to: 'llm' });
    return arrows;
  }
  return arrows;
}

const CircularAgentPipeline: React.FC<CircularAgentPipelineProps> = ({ state, size = 260 }) => {
  const radius = size / 2 - 40; // padding
  const center = { x: size / 2, y: size / 2 };
  // Layout angles (degrees)
  const layout = [
    { key: 'intent', label: 'Intent', angle: -90 },
    { key: 'retriever', label: 'Retriever', angle: -18 },
    { key: 'applicability', label: 'Applicability', angle: 54 },
    { key: 'citation', label: 'Citation', angle: 126 },
    { key: 'llm', label: 'LLM', angle: 198 }
  ];
  const nodes = layout.map(n => {
    const rad = (n.angle * Math.PI) / 180;
    return {
      ...n,
      x: center.x + radius * Math.cos(rad),
      y: center.y + radius * Math.sin(rad)
    };
  });

  const arrows = deriveArrows(state);

  const arrowLines = useMemo(() => {
    return arrows.map(a => {
      const from = nodes.find(n => n.key === a.from)!;
      const to = nodes.find(n => n.key === a.to)!;
      const dxFull = to.x - from.x;
      const dyFull = to.y - from.y;
      const distFull = Math.sqrt(dxFull * dxFull + dyFull * dyFull);
      const ux = dxFull / distFull;
      const uy = dyFull / distFull;
      const nodeR = 36;
      const startX = from.x + ux * nodeR;
      const startY = from.y + uy * nodeR;
      const endX = to.x - ux * nodeR;
      const endY = to.y - uy * nodeR;
      const dx = endX - startX;
      const dy = endY - startY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      return { id: `${a.from}-${a.to}`, startX, startY, len, angle };
    });
  }, [arrows, nodes]);

  const pulse = `circular-agent-pulse`;

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <defs>
          <style>{`
            /* Movement ONLY (translateX) */
            @keyframes doc-stream-move-forward {0% {transform: translateX(var(--offset));}100% {transform: translateX(calc(var(--offset) + var(--len)));}}
            /* Opacity + subtle scale handled on inner wrapper so it does not overwrite translateX */
            @keyframes doc-stream-fade {0% {opacity:0;}15%{opacity:1;}80%{opacity:1;}100%{opacity:0;}}
          `}</style>
        </defs>
        {arrowLines.map(l => {
          const packetCount = 5;
          const gap = l.len / packetCount;
          return (
            <g key={l.id} transform={`translate(${l.startX} ${l.startY}) rotate(${l.angle})`} style={{ transformOrigin: '0 0' }}>
              <path d={`M ${l.len} 0 l -11 -6 v 12 z`} fill="#2563eb" opacity={0.9} />
              {Array.from({ length: packetCount }).map((_, i) => {
                const delay = (i / packetCount) * 1.1; // stagger
                return (
                  <g key={i}
                     style={{ '--offset': `${gap * i}px`, '--len': `${l.len}px`, animation: 'doc-stream-move-forward 1.1s linear infinite', animationDelay: `-${delay}s`, willChange: 'transform' } as React.CSSProperties}>
                    <g style={{ animation: 'doc-stream-fade 1.1s linear infinite', animationDelay: `-${delay}s`, willChange: 'opacity' }}>
                      <rect x={-8} y={-10} width={16} height={20} rx={2.5} ry={2.5} fill="#fff" stroke="#2563eb" strokeWidth={1.5} />
                      <rect x={-5} y={-6} width={10} height={2} fill="#2563eb" opacity={0.8} />
                      <rect x={-5} y={-2} width={10} height={2} fill="#2563eb" opacity={0.6} />
                      <rect x={-5} y={2} width={6} height={2} fill="#2563eb" opacity={0.45} />
                    </g>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {nodes.map(n => {
        // image per agent (exclude llm for now)
        const agentImg = n.key === 'intent'
          ? intentImg
          : n.key === 'retriever'
          ? retrieverImg
          : n.key === 'applicability'
          ? applicabilityImg
          : n.key === 'citation'
          ? citeImg
          : n.key === 'llm'
          ? llmImg
          : undefined;
        const st = (state as any)[n.key]?.status || 'idle';
        const extra = (state as any)[n.key];
        const intentName = extra?.intentName;
        return (
          <div key={n.key} style={{ position: 'absolute', left: n.x - 60, top: n.y - 46, width: 120, height: 92, border: '1px solid var(--border-color,#d1d5db)', borderRadius: 14, background: 'linear-gradient(180deg,#ffffff,#f1f5f9)', boxShadow: '0 2px 6px rgba(0,0,0,0.10)', padding: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontSize: 11, textAlign: 'center' }}>
            {agentImg && (
              <div style={{ width: 40, height: 40, marginBottom: 2, position: 'relative' }}>
                <img src={agentImg} alt={n.label + ' avatar'} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: st==='error'||st==='empty'? 'grayscale(0.6)' : 'none', opacity: st==='idle'?0.5:1 }} />
                {st === 'success' || st === 'valid' || st === 'done' || st === 'passed' || st === 'flagged' || st === 'intentDone' || st === 'answerDone' ? (
                  <span style={{ position: 'absolute', right: -4, top: -4, background: '#16a34a', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                ) : null}
              </div>
            )}
            {!agentImg && (
              <div style={{ marginBottom: 2 }}>{nodeIcon(st)}</div>
            )}
            <div style={{ fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>{!agentImg && nodeIcon(st)}<span>{n.label}</span></div>
            <div style={{ lineHeight: 1.15 }}>
              {n.key === 'intent' && (
                st === 'detecting' ? 'Đang xác định…' : st === 'valid' ? `✔ ${intentName}` : st === 'error' ? 'Lỗi intent' : ''
              )}
              {n.key === 'retriever' && (
                st === 'retrieving' ? 'Truy xuất…' : st === 'success' ? ((state as any).retriever?.eCount!=null ? `E${(state as any).retriever.eCount} R${(state as any).retriever.rCount} D${(state as any).retriever.dCount}` : 'OK') : st === 'empty' ? 'Không có TL' : st === 'error' ? 'Lỗi' : ''
              )}
              {n.key === 'applicability' && (
                st === 'processing' ? 'Đánh giá…' : st === 'done' ? 'Hiệu lực OK' : st === 'error' ? 'Lỗi' : ''
              )}
              {n.key === 'citation' && (
                st === 'auditing' ? 'Kiểm tra…' : st === 'passed' ? 'Guardrail OK' : st === 'flagged' ? 'Cảnh báo' : st === 'error' ? 'Lỗi' : ''
              )}
              {n.key === 'llm' && (
                st === 'intentPending' ? 'Nhận intent…' : st === 'intentDone' ? intentName : st === 'answerGenerating' ? 'Tạo đáp án…' : st === 'answerDone' ? 'Xong' : st === 'error' ? 'Lỗi' : ''
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CircularAgentPipeline;

