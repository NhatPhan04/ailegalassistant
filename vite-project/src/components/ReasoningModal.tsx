import React, { useMemo, useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Network } from 'vis-network';
import AgentPipeline from './AgentPipeline';
import CircularAgentPipeline from './CircularAgentPipeline';
import type { AgentPipelineState } from './AgentPipeline';

// Force-directed graph
// import ForceGraph2D from 'react-force-graph';

export type ReasoningPhase = 'idle' | 'retrieving' | 'retrieved' | 'generating';

interface ReasoningModalProps {
  isOpen: boolean;
  phase: ReasoningPhase;
  retrievalContent: string;
  pipelineState?: AgentPipelineState;
  onClose: () => void;
}

const phaseTitleMap: Record<ReasoningPhase, string> = {
  idle: 'Tiến trình suy luận',
  retrieving: 'Đang truy vấn nguồn dữ liệu',
  retrieved: 'Kết quả truy vấn dữ liệu',
  generating: 'Đang suy luận & tạo câu trả lời'
};

interface ParsedSections {
  entities: any[] | string | null;
  relationships: any[] | string | null;
  documentChunks: any[] | string | null;
}

function parseDelimitedJson(retrieval: string): ParsedSections {
  const full = retrieval || '';
  const getSectionRaw = (sectionName: string) => {
    const regex = new RegExp(`-----${sectionName}-----\\s*([\\s\\S]*?)(?=-----|$)`);
    const match = full.match(regex);
    return match && match[1] ? match[1].trim() : null;
  };
  const tryHardParse = (raw: string): any[] | string => {
    let txt = raw.trim();
    // Strip markdown fences
    if (txt.startsWith('```')) {
      txt = txt.replace(/^```[a-zA-Z0-9_-]*\s*/, '');
      const fenceIdx = txt.lastIndexOf('```');
      if (fenceIdx !== -1) txt = txt.slice(0, fenceIdx).trim();
    }
    // Remove wrapping backticks accidentally copied
    txt = txt.replace(/^`+|`+$/g, '').trim();
    // Quick heuristic: extract first JSON array/object block
    const firstBracket = txt.indexOf('[');
    const firstBrace = txt.indexOf('{');
    let candidate: string | null = null;
    if (firstBracket !== -1 && (firstBracket < firstBrace || firstBrace === -1)) {
      const lastBracket = txt.lastIndexOf(']');
      if (lastBracket > firstBracket) candidate = txt.slice(firstBracket, lastBracket + 1);
    } else if (firstBrace !== -1) {
      const lastBrace = txt.lastIndexOf('}');
      if (lastBrace > firstBrace) candidate = txt.slice(firstBrace, lastBrace + 1);
    }
    const attempts = [txt];
    if (candidate && candidate !== txt) attempts.unshift(candidate);
    for (const attempt of attempts) {
      try {
        return JSON.parse(attempt);
      } catch {/* continue */}
    }
    return raw; // fallback raw
  };
  const safeParse = (raw: string | null): any[] | string | null => {
    if (!raw) return null;
    return tryHardParse(raw);
  };
  return {
    entities: safeParse(getSectionRaw('Entities\\(KG\\)')),
    relationships: safeParse(getSectionRaw('Relationships\\(KG\\)')),
    documentChunks: safeParse(getSectionRaw('Document Chunks\\(DC\\)'))
  };
}

const ReasoningModal: React.FC<ReasoningModalProps> = ({ isOpen, phase, retrievalContent, pipelineState, onClose }) => {
   if (!isOpen) return null;

  // Derive progress message & percent from pipelineState
  const { progressMessage, progressPercent } = useMemo(() => {
    if (!pipelineState) return { progressMessage: '', progressPercent: 0 };
    const s = pipelineState;
    const steps: { match: boolean; msg: string }[] = [];
    // Intent detecting
    steps.push({
      match: s.intent.status === 'detecting',
      msg: 'Intent & Normalize Agent đang phát hiện ý định'
    });
    steps.push({
      match: s.intent.status === 'valid',
      msg: `Intent & Normalize Agent đã phát hiện ý định hợp lệ: ${s.intent.intentName || ''}`.trim()
    });
    steps.push({
      match: s.retriever.status === 'retrieving',
      msg: 'Retriever Agent đang truy hồi tài liệu (semantic + LawGraph)…'
    });
    steps.push({
      match: s.retriever.status === 'success',
      msg: `Retriever Agent đã thu thập ${s.retriever.eCount!=null?`E${s.retriever.eCount}`:'E?'} / ${s.retriever.rCount!=null?`R${s.retriever.rCount}`:'R?'} / ${s.retriever.dCount!=null?`D${s.retriever.dCount}`:'D?'} (entities / relationships / document chunks)`
    });
    steps.push({
      match: s.applicability.status === 'processing',
      msg: 'Applicability & Effectivity Agent đang đánh giá hiệu lực & phạm vi áp dụng…'
    });
    steps.push({
      match: s.applicability.status === 'done',
      msg: `Applicability & Effectivity Agent hoàn tất: ${s.applicability.summary || ''}`.trim()
    });
    steps.push({
      match: s.citation.status === 'auditing',
      msg: 'Citation & Guardrail Agent đang hậu kiểm trích dẫn & áp dụng guardrail…'
    });
    steps.push({
      match: s.citation.status === 'passed',
      msg: 'Citation & Guardrail Agent xác nhận hợp lệ (no citation → no answer OK)'
    });
    steps.push({
      match: s.citation.status === 'flagged',
      msg: `Citation & Guardrail Agent cảnh báo: ${s.citation.issues || 'Có vấn đề trích dẫn'}`
    });
    steps.push({
      match: s.llm.status === 'answerGenerating',
      msg: 'LLM đang tổng hợp câu trả lời cuối cùng…'
    });
    steps.push({
      match: s.llm.status === 'answerDone',
      msg: 'Hoàn tất. Bạn có thể xem câu trả lời ở cửa sổ chat.'
    });
    // Determine latest (last) matching index instead of first
    let activeIndex = 0;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].match) activeIndex = i; // keep moving forward
    }
    const total = steps.length - 1;
    const percent = Math.min(100, Math.max(0, (activeIndex / total) * 100));
    return { progressMessage: steps[activeIndex].msg, progressPercent: percent };
  }, [pipelineState]);

  const parsed = useMemo(() => parseDelimitedJson(retrievalContent), [retrievalContent]);
  const hasStructured = !!(parsed.entities || parsed.relationships || parsed.documentChunks);
  const entitiesArray = Array.isArray(parsed.entities) ? parsed.entities : null;
  const relationshipsArray = Array.isArray(parsed.relationships) ? parsed.relationships : null;
  const showGraph = !!(entitiesArray && relationshipsArray && entitiesArray.length && relationshipsArray.length);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    entities: true,
    relationships: true,
    documentChunks: true,
    raw: false
  });
  const [graphCollapsed, setGraphCollapsed] = useState(false);
  const graphRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);

  // Build and render vis-network graph
  useEffect(() => {
    if (!isOpen || !showGraph || graphCollapsed) return;
    if (!graphRef.current) return;
    const MAX_NODES = 600;
    const entityItems = entitiesArray ? entitiesArray.slice(0, MAX_NODES) : [];
    const nameSet = new Set(entityItems.map(e => String(e.entity || e.id)));
    const linksRaw = relationshipsArray || [];
    const edgesFiltered = linksRaw.filter(r => nameSet.has(String(r.entity1)) && nameSet.has(String(r.entity2)));
    const nodes = entityItems.map((e: any, idx: number) => ({
      id: String(e.entity || e.id || idx),
      label: String(e.entity || e.id || idx),
      group: e.type || 'other',
      title: `<b>${e.entity || e.id}</b><br/>Type: ${e.type || '—'}${e.description ? '<br/>' + String(e.description).split('<SEP>').join('<br/>') : ''}`
    }));
    const shorten = (txt: string) => {
      const t = txt.replace(/\s+/g, ' ').trim();
      return t.length > 60 ? t.slice(0,57) + '…' : t;
    };
    const edges = edgesFiltered.map((r: any, idx: number) => {
      const desc = r.description || '';
      // Try to extract a compact relation phrase (first sentence / up to first period)
      let label = desc.split(/[.!?]/)[0];
      if (!label || label.length < 3) label = desc;
      label = shorten(label);
      return {
        id: idx,
        from: String(r.entity1),
        to: String(r.entity2),
        arrows: 'to',
        title: desc ? desc : '',
        label
      };
    });
    const data = { nodes, edges } as any;
    const options = {
      interaction: { hover: true, tooltipDelay: 120 },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: { damping: 0.4, gravitationalConstant: -50 },
        stabilization: { iterations: 120, updateInterval: 25 }
      },
      layout: { improvedLayout: true },
      nodes: {
        shape: 'dot',
        size: 16,
        font: { color: '#111', size: 12, face: 'Inter', strokeWidth: 0 },
        borderWidth: 1,
      },
      groups: {
        event: { color: { background: '#bfdbfe', border: '#60a5fa' } },
        category: { color: { background: '#bbf7d0', border: '#34d399' } },
        other: { color: { background: '#e9d5ff', border: '#c084fc' } }
      },
      edges: {
        color: { color: '#555', highlight: '#d97706' },
        width: 1,
        smooth: { type: 'dynamic' },
        font: { color: '#111', size: 10, strokeWidth: 0, background: 'rgba(255,255,255,0.6)' }
      }
    } as any;
    // Destroy previous network before re-creating
    if (networkRef.current) {
      networkRef.current.destroy();
      networkRef.current = null;
    }
    networkRef.current = new Network(graphRef.current, data, options);
  }, [isOpen, showGraph, graphCollapsed, retrievalContent]);

  const toggle = (k: string) => setOpenSections(s => ({ ...s, [k]: !s[k] }));

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(()=>{});
  };

  const renderEntities = () => {
    if (!parsed.entities) return null;
    if (typeof parsed.entities === 'string') {
      return <pre className="raw-block">{parsed.entities}</pre>;
    }
    return (
      <div className="detail-grid" style={{ gridTemplateColumns: 'minmax(140px,160px) 1fr 1fr' }}>
        {parsed.entities.slice(0, 200).map((e: any, i: number) => (
          <div key={i} className="detail-item" style={{ alignItems: 'flex-start' }}>
            <div className="detail-key" style={{ fontSize: 12 }}>{e.entity || e.id || '—'}</div>
            <div className="detail-value" style={{ fontSize: 12 }}>
              <div><strong>Type:</strong> {e.type || '—'}</div>
              {e.description && <div style={{ marginTop: 4, opacity: 0.85 }}>{String(e.description).split('<SEP>').map((seg: string, idx: number) => <div key={idx}>{seg}</div>)}</div>}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, textAlign: 'right' }}>#{e.id}</div>
          </div>
        ))}
        {parsed.entities.length > 200 && <div style={{ gridColumn: '1/-1', fontSize: 12, opacity: 0.7 }}>… Đã cắt bớt còn 200 mục đầu.</div>}
      </div>
    );
  };

  const renderRelationships = () => {
    if (!parsed.relationships) return null;
    if (typeof parsed.relationships === 'string') return <pre className="raw-block">{parsed.relationships}</pre>;
    return (
      <div className="detail-grid" style={{ gridTemplateColumns: 'minmax(160px,220px) minmax(160px,220px) 1fr' }}>
        {parsed.relationships.slice(0, 300).map((r: any, i: number) => (
          <div key={i} className="detail-item" style={{ alignItems: 'flex-start' }}>
            <div className="detail-key" style={{ fontSize: 12 }}>{r.entity1}</div>
            <div className="detail-key" style={{ fontSize: 12 }}>{r.entity2}</div>
            <div className="detail-value" style={{ fontSize: 12 }}>{r.description}</div>
          </div>
        ))}
        {parsed.relationships.length > 300 && <div style={{ gridColumn: '1/-1', fontSize: 12, opacity: 0.7 }}>… Đã cắt bớt còn 300 quan hệ đầu.</div>}
      </div>
    );
  };

  const renderDocumentChunks = () => {
    if (!parsed.documentChunks) return null;
    if (typeof parsed.documentChunks === 'string') return <pre className="raw-block">{parsed.documentChunks}</pre>;
    return (
      <div className="detail-grid" style={{ gridTemplateColumns: '110px 1fr' }}>
        {parsed.documentChunks.slice(0, 120).map((c: any, i: number) => {
          const snippet = typeof c.content === 'string' ? c.content.replace(/\n/g, ' ').replace(/\s+/g, ' ').slice(0, 180) : '';
          return (
            <div key={i} className="detail-item" style={{ alignItems: 'flex-start' }}>
              <div className="detail-key" style={{ fontSize: 12 }}>{c.id || c.file_path || `#${i+1}`}</div>
              <div className="detail-value" style={{ fontSize: 12 }}>
                {snippet || JSON.stringify(c).slice(0, 180)}{snippet.length === 180 && '…'}
              </div>
            </div>
          );
        })}
        {parsed.documentChunks.length > 120 && <div style={{ gridColumn: '1/-1', fontSize: 12, opacity: 0.7 }}>… Đã cắt bớt còn 120 chunk đầu.</div>}
      </div>
    );
  };

  const renderRawFallback = () => (
    <div className="raw-wrapper">
      <pre style={{ maxHeight: 300, overflow: 'auto' }}>{retrievalContent.slice(0, 50000)}</pre>
    </div>
  );

  const graphSection = () => {
    if (!showGraph) return null;
    // Build truncated info for counts only
    const MAX_NODES = 600;
    const entityItems = entitiesArray ? entitiesArray.slice(0, MAX_NODES) : [];
    const nameSet = new Set(entityItems.map(e => String(e.entity || e.id)));
    const linksRaw = relationshipsArray || [];
    const edgesFiltered = linksRaw.filter(r => nameSet.has(String(r.entity1)) && nameSet.has(String(r.entity2)));
    const exportPayload = { entities: entityItems, relationships: edgesFiltered };
    return (
      <section style={{ marginBottom: 16 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button aria-label="toggle graph" onClick={() => setGraphCollapsed(c => !c)} className="icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
              <FontAwesomeIcon icon={graphCollapsed ? faChevronRight : faChevronDown} />
            </button>
            Knowledge Graph Preview
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>({entityItems.length} nodes • {edgesFiltered.length} edges{entitiesArray && entitiesArray.length > MAX_NODES ? ' • truncated' : ''})</span>
          </h3>
          <button className="docs-btn" style={{ fontSize: 11 }} onClick={() => copyText(JSON.stringify(exportPayload, null, 2))}><FontAwesomeIcon icon={faCopy} /> Export JSON</button>
        </header>
        {!graphCollapsed && (
          <div style={{ border: '1px solid var(--border-color,#333)', borderRadius: 8, padding: 4, marginTop: 8, background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0))' }}>
            <div ref={graphRef} style={{ height: 380 }} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6, fontSize: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: '50%' }} /> event</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#10b981', borderRadius: '50%' }} /> category</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#a855f7', borderRadius: '50%' }} /> other</div>
            </div>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="modal-overlay active" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860 }}>
        <span className="modal-close" onClick={onClose}>&times;</span>
        <div className="modal-header">
          <h2>{phaseTitleMap[phase]}</h2>
          {phase === 'retrieving' && <p style={{ color: 'var(--muted)' }}>Đang truy vấn cơ sở dữ liệu tài liệu pháp luật và đồ thị tri thức…</p>}
          {phase === 'generating' && <p style={{ color: 'var(--muted)' }}>Đang suy luận và tạo ra câu trả lời…</p>}
          {phase === 'retrieved' && <p style={{ color: 'var(--muted)' }}>Dữ liệu đã truy xuất. Mô hình đang chuẩn bị tạo câu trả lời.</p>}
        </div>
        <div style={{ maxHeight: '60vh', overflow: 'auto', paddingRight: 4 }}>
          {pipelineState && (
            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <CircularAgentPipeline state={pipelineState} size={360} />
              {progressMessage && (
                <div style={{ width: '100%', maxWidth: 640 }}>
                  <style>{`
                    @keyframes reasoning-blink { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
                  `}</style>
                  <div style={{ fontSize: 13, fontWeight: 500, animation: 'reasoning-blink 1.6s linear infinite', textAlign: 'center', marginBottom: 6 }}>
                    {progressMessage}
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: 'linear-gradient(90deg,#e2e8f0,#f1f5f9)', overflow: 'hidden', boxShadow: 'inset 0 0 2px rgba(0,0,0,0.15)' }} aria-label="Tiến độ" role="progressbar" aria-valuenow={Math.round(progressPercent)} aria-valuemin={0} aria-valuemax={100}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg,#2563eb,#16a34a)', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )}
            </div>
          )}
          {phase === 'retrieving' && (
            <div className="spinner-line" style={{ fontSize: 14 }}>
              <i className="fas fa-spinner fa-spin" /> Đang truy vấn…
            </div>
          )}
          {retrievalContent && (
            <>
              {graphSection()}
               <div style={{ margin: '8px 0 12px', fontSize: 12, color: 'var(--muted)' }}>
                Dữ liệu ngữ cảnh tạm thời — không được lưu vào lịch sử, sẽ mất khi refresh trang.
              </div>
              {hasStructured ? (
                <div className="structured-context">
                  {/* Entities Section */}
                  {parsed.entities && (
                    <section style={{ marginBottom: 16 }}>
                      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button aria-label="toggle entities" onClick={() => toggle('entities')} className="icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                            <FontAwesomeIcon icon={openSections.entities ? faChevronDown : faChevronRight} />
                          </button>
                          Entities (KG){Array.isArray(parsed.entities) && ` • ${parsed.entities.length}`}
                        </h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="docs-btn" style={{ fontSize: 11 }} onClick={() => copyText(typeof parsed.entities === 'string' ? parsed.entities : JSON.stringify(parsed.entities, null, 2))}><FontAwesomeIcon icon={faCopy} /> Copy</button>
                        </div>
                      </header>
                      {openSections.entities && <div style={{ marginTop: 8 }}>{renderEntities()}</div>}
                    </section>
                  )}
                  {/* Relationships Section */}
                  {parsed.relationships && (
                    <section style={{ marginBottom: 16 }}>
                      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button aria-label="toggle relationships" onClick={() => toggle('relationships')} className="icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                            <FontAwesomeIcon icon={openSections.relationships ? faChevronDown : faChevronRight} />
                          </button>
                          Relationships (KG){Array.isArray(parsed.relationships) && ` • ${parsed.relationships.length}`}
                        </h3>
                        <button className="docs-btn" style={{ fontSize: 11 }} onClick={() => copyText(typeof parsed.relationships === 'string' ? parsed.relationships : JSON.stringify(parsed.relationships, null, 2))}><FontAwesomeIcon icon={faCopy} /> Copy</button>
                      </header>
                      {openSections.relationships && <div style={{ marginTop: 8 }}>{renderRelationships()}</div>}
                    </section>
                  )}
                  {/* Document Chunks Section */}
                  {parsed.documentChunks && (
                    <section style={{ marginBottom: 16 }}>
                      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button aria-label="toggle document chunks" onClick={() => toggle('documentChunks')} className="icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                            <FontAwesomeIcon icon={openSections.documentChunks ? faChevronDown : faChevronRight} />
                          </button>
                          Document Chunks (DC){Array.isArray(parsed.documentChunks) && ` • ${parsed.documentChunks.length}`}
                        </h3>
                        <button className="docs-btn" style={{ fontSize: 11 }} onClick={() => copyText(typeof parsed.documentChunks === 'string' ? parsed.documentChunks : JSON.stringify(parsed.documentChunks, null, 2))}><FontAwesomeIcon icon={faCopy} /> Copy</button>
                      </header>
                      {openSections.documentChunks && <div style={{ marginTop: 8 }}>{renderDocumentChunks()}</div>}
                    </section>
                  )}
                  {/* Raw toggle */}
                  <section style={{ marginBottom: 8 }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button aria-label="toggle raw" onClick={() => toggle('raw')} className="icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                          <FontAwesomeIcon icon={openSections.raw ? faChevronDown : faChevronRight} />
                        </button>
                        Raw Context
                      </h3>
                      <button className="docs-btn" style={{ fontSize: 11 }} onClick={() => copyText(retrievalContent)}><FontAwesomeIcon icon={faCopy} /> Copy All</button>
                    </header>
                    {openSections.raw && <div style={{ marginTop: 6 }}>{renderRawFallback()}</div>}
                  </section>
                </div>
              ) : (
                <div className="retrieval-block">
                  <h3 style={{ marginTop: 0 }}>Ngữ cảnh / Trích xuất</h3>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {(() => {
                      const trimmed = retrievalContent.trim();
                      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                        return '```json\n' + trimmed.slice(0, 50000) + '\n```';
                      }
                      return retrievalContent.slice(0, 50000);
                    })()}
                  </ReactMarkdown>
                </div>
              )}
            </>
          )}
          {phase === 'generating' && (
            <div style={{ marginTop: 16, fontSize: 14 }}>
              <i className="fas fa-cog fa-spin" /> Mô hình đang suy luận trên ngữ cảnh…
            </div>
          )}
        </div>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button onClick={onClose} className="choose-plan-btn">Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default ReasoningModal;
