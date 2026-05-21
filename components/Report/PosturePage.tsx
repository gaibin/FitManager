/**
 * PDF 报告第2页 — 体态评估结果（Apple HIG 风格 + 照片保持比例不压缩）
 */

import React from 'react';
import { Member, Language } from '../../types';

interface PosturePageProps { member: Member; lang: Language; studioName: string; }

const S = {
  page: { width: 794, height: 1123, backgroundColor: '#ffffff', color: '#1D1D1F', padding: '60px 50px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', boxSizing: 'border-box' as const, display: 'flex', flexDirection: 'column' as const },
  hdr: { borderBottom: '1px solid #E5E5EA', paddingBottom: 15, marginBottom: 30 },
  hdrTxt: { fontSize: 12, color: '#8E8E93', letterSpacing: 2, fontWeight: 500 },
  h2: { fontSize: 24, fontWeight: 800, color: '#1D1D1F', margin: '0 0 24px 0' },
  score: (c: string) => ({ width: 100, height: 100, borderRadius: '50%', border: `4px solid ${c}`, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F2F7' }),
  footer: { borderTop: '1px solid #E5E5EA', paddingTop: 15, marginTop: 24, display: 'flex', justifyContent: 'space-between' as const },
  fText: { fontSize: 11, color: '#8E8E93' },
};

const sevInfo: Record<string, { border: string; bg: string; text: string }> = {
  '正常': { border: '#34C759', bg: 'rgba(52,199,89,0.08)', text: '#248A3D' },
  '中度': { border: '#FF9500', bg: 'rgba(255,149,0,0.08)', text: '#C93400' },
  '严重': { border: '#FF3B30', bg: 'rgba(255,59,48,0.08)', text: '#BC1C17' },
  '低置信度': { border: '#8E8E93', bg: 'rgba(142,142,147,0.08)', text: '#636366' },
};

const PosturePage: React.FC<PosturePageProps> = ({ member, lang, studioName }) => {
  const a = member.assessments?.[0];
  if (!a) return <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 18, color: '#8E8E93' }}>{lang === 'zh' ? '暂无体态评估数据' : 'No posture assessment data'}</span></div>;

  const { report } = a;
  const sc = report.score >= 70 ? '#34C759' : report.score >= 40 ? '#FF9500' : '#FF3B30';

  return (
    <div style={S.page}>
      <div style={S.hdr}><span style={S.hdrTxt}>{studioName}</span></div>
      <h2 style={S.h2}>{lang === 'zh' ? '体态评估' : 'Posture Assessment'}</h2>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, gap: 24 }}>
        <div style={S.score(sc)}><span style={{ fontSize: 28, fontWeight: 900, color: '#1D1D1F' }}>{report.score}</span><span style={{ fontSize: 11, color: '#8E8E93' }}>/ 100</span></div>
        <div><p style={{ fontSize: 14, color: '#8E8E93', margin: '0 0 4px 0' }}>{lang === 'zh' ? '置信度' : 'Confidence'}</p><p style={{ fontSize: 18, fontWeight: 700, color: sc, margin: 0 }}>{(report.confidence * 100).toFixed(0)}%</p></div>
      </div>

      {/* Photos — use contain to preserve aspect ratio */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {[{ src: a.frontImage, lab: lang === 'zh' ? '正面' : 'Front' }, { src: a.sideImage, lab: lang === 'zh' ? '侧面' : 'Side' }, { src: a.backImage, lab: lang === 'zh' ? '背面' : 'Back' }].filter(p => p.src).map((p, i) => (
          <div key={i} style={{ flex: 1, backgroundColor: '#F2F2F7', borderRadius: 12, overflow: 'hidden', position: 'relative', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={p.src} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={p.lab} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', padding: '6px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#fff' }}>{p.lab}</div>
          </div>
        ))}
      </div>

      {/* Issues */}
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '0 0 16px 0' }}>{lang === 'zh' ? '检测结果' : 'Results'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {report.issues.map((issue, idx) => {
            const c = sevInfo[issue.severity] || sevInfo['中度'];
            return (
              <div key={idx} style={{ backgroundColor: c.bg, border: `1px solid ${c.border}20`, borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{lang === 'zh' ? issue.name : issue.nameEn}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, backgroundColor: c.border + '30', color: c.text, fontWeight: 600 }}>{issue.value.toFixed(1)} {issue.unit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#8E8E93' }}>{lang === 'zh' ? issue.description : issue.descriptionEn}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, backgroundColor: c.border, color: '#fff' }}>{issue.severity}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={S.footer}><span style={S.fText}>{studioName}</span><span style={S.fText}>{lang === 'zh' ? '第 2 页' : 'Page 2'} / {new Date().toISOString().split('T')[0]}</span></div>
    </div>
  );
};

export default PosturePage;
