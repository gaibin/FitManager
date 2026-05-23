/**
 * PDF 报告第3页 — 4周矫正训练方案 + AI 建议（Apple HIG 风格）
 */

import React from 'react';
import { Member, Language } from '../../types';

interface PlanPageProps { member: Member; lang: Language; studioName: string; }

const S = {
  page: { width: 794, height: 1123, backgroundColor: '#ffffff', color: '#1D1D1F', padding: '60px 50px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', boxSizing: 'border-box' as const, display: 'flex', flexDirection: 'column' as const },
  hdr: { borderBottom: '1px solid #E5E5EA', paddingBottom: 15, marginBottom: 30 },
  hdrTxt: { fontSize: 12, color: '#8E8E93', letterSpacing: 2, fontWeight: 500 },
  h2: { fontSize: 24, fontWeight: 800, color: '#1D1D1F', margin: '0 0 24px 0' },
  badge: (bg: string, fg: string) => ({ display: 'inline-block', backgroundColor: bg, color: fg, padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 14 }),
  exItem: { backgroundColor: '#F2F2F7', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 },
  exNum: (bg: string, fg: string) => ({ width: 28, height: 28, borderRadius: '50%', backgroundColor: bg + '18', border: `1px solid ${bg}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: fg, lineHeight: 1 } as const),
  exSet: (c: string) => ({ fontSize: 12, fontWeight: 700, color: c, backgroundColor: c + '12', padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace', lineHeight: 1 } as const),
  aiCard: { backgroundColor: '#F2F2F7', borderRadius: 14, padding: '20px 24px', border: '1px solid #007AFF18', flex: 1 },
  footer: { borderTop: '1px solid #E5E5EA', paddingTop: 15, marginTop: 24, display: 'flex', justifyContent: 'space-between' as const },
  fText: { fontSize: 11, color: '#8E8E93' },
};

const PlanPage: React.FC<PlanPageProps> = ({ member, lang, studioName }) => {
  const a = member.assessments?.[0];
  if (!a) return <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 18, color: '#8E8E93' }}>{lang === 'zh' ? '暂无矫正方案数据' : 'No correction plan data'}</span></div>;

  const { correctionPlan, aiRecommendation } = a;

  return (
    <div style={S.page}>
      <div style={S.hdr}><span style={S.hdrTxt}>{studioName}</span></div>
      <h2 style={S.h2}>{lang === 'zh' ? '4周矫正训练方案' : '4-Week Correction Plan'}</h2>

      <div style={{ marginBottom: 28 }}>
        <div style={S.badge('#007AFF12', '#007AFF')}>{lang === 'zh' ? '第 1–2 周（放松激活）' : 'Week 1–2 (Activation)'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {correctionPlan.week1_2.length === 0 ? <span style={{ fontSize: 12, color: '#8E8E93', padding: '10px 0' }}>{lang === 'zh' ? '暂无该阶段动作' : 'No exercises'}</span>
            : correctionPlan.week1_2.map((ex, i) => (
              <div key={i} style={S.exItem}>
                <div style={S.exNum('#007AFF', '#007AFF')}>{i + 1}</div>
                <div style={{ flex: 1 }}><span style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }}>{lang === 'zh' ? ex.name : ex.nameEn}</span>{(lang === 'zh' ? ex.description : ex.descriptionEn) && <p style={{ fontSize: 11, color: '#8E8E93', margin: '2px 0 0 0' }}>{lang === 'zh' ? ex.description : ex.descriptionEn}</p>}</div>
                <span style={S.exSet('#007AFF')}>{ex.sets}</span>
              </div>
            ))}
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={S.badge('#5856D612', '#5856D6')}>{lang === 'zh' ? '第 3–4 周（强化整合）' : 'Week 3–4 (Integration)'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {correctionPlan.week3_4.length === 0 ? <span style={{ fontSize: 12, color: '#8E8E93', padding: '10px 0' }}>{lang === 'zh' ? '暂无该阶段动作' : 'No exercises'}</span>
            : correctionPlan.week3_4.map((ex, i) => (
              <div key={i} style={S.exItem}>
                <div style={S.exNum('#5856D6', '#5856D6')}>{i + 1}</div>
                <div style={{ flex: 1 }}><span style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }}>{lang === 'zh' ? ex.name : ex.nameEn}</span>{(lang === 'zh' ? ex.description : ex.descriptionEn) && <p style={{ fontSize: 11, color: '#8E8E93', margin: '2px 0 0 0' }}>{lang === 'zh' ? ex.description : ex.descriptionEn}</p>}</div>
                <span style={S.exSet('#5856D6')}>{ex.sets}</span>
              </div>
            ))}
        </div>
      </div>

      {aiRecommendation && (
        <div style={S.aiCard}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#007AFF', margin: '0 0 12px 0' }}><span style={{ fontSize: 16 }}>&#9889;</span> {lang === 'zh' ? 'AI 综合建议' : 'AI Recommendations'}</h3>
          <p style={{ fontSize: 13, color: '#3C3C43', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const, margin: 0 }}>{aiRecommendation}</p>
        </div>
      )}

      <div style={S.footer}><span style={S.fText}>{studioName}</span><span style={S.fText}>{lang === 'zh' ? '第 3 页' : 'Page 3'} / {new Date().toISOString().split('T')[0]}</span></div>
    </div>
  );
};

export default PlanPage;
