/**
 * PDF 报告第4页 — 近期训练记录明细（Apple HIG 风格）
 */

import React from 'react';
import { Member, Language } from '../../types';

interface HistoryPageProps { member: Member; lang: Language; studioName: string; }

const COLS = (lang: string) => [
  { label: lang === 'zh' ? '日期' : 'Date', w: '18%' },
  { label: lang === 'zh' ? '动作' : 'Exercise', w: '34%' },
  { label: lang === 'zh' ? '重量' : 'Weight', w: '16%' },
  { label: lang === 'zh' ? '组 x 次' : 'Sets × Reps', w: '16%' },
  { label: lang === 'zh' ? '容量' : 'Volume', w: '16%' },
];

const S = {
  thStyle: { fontSize: 11, color: '#8E8E93', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
};

const HistoryPage: React.FC<HistoryPageProps> = ({ member, lang, studioName }) => {
  const rows = [...member.workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
  const cols = COLS(lang);

  return (
    <div style={{ width: 794, height: 1123, backgroundColor: '#ffffff', color: '#1D1D1F', padding: '60px 50px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid #E5E5EA', paddingBottom: 15, marginBottom: 30 }}><span style={{ fontSize: 12, color: '#8E8E93', letterSpacing: 2, fontWeight: 500 }}>{studioName}</span></div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D1D1F', margin: '0 0 24px 0' }}>{lang === 'zh' ? '近期训练记录' : 'Recent Training Records'}</h2>

      {rows.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 14, color: '#8E8E93' }}>{lang === 'zh' ? '暂无训练记录' : 'No training records yet'}</span></div>
      ) : (
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', backgroundColor: '#F2F2F7', borderRadius: '10px 10px 0 0', padding: '12px 16px', borderBottom: '2px solid #E5E5EA' }}>
            {cols.map((c, i) => <span key={i} style={{ ...S.thStyle, width: c.w }}>{c.label}</span>)}
          </div>
          <div style={{ border: '1px solid #E5E5EA', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
            {rows.map((w, i) => (
              <div key={w.id} style={{ display: 'flex', padding: '10px 16px', alignItems: 'center', backgroundColor: i % 2 === 0 ? '#FAFAFA' : '#ffffff', borderBottom: i < rows.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
                <span style={{ width: cols[0].w, fontSize: 12, color: '#007AFF', fontWeight: 500, fontFamily: 'monospace' }}>{w.date.slice(5)}</span>
                <span style={{ width: cols[1].w, fontSize: 13, color: '#1D1D1F', fontWeight: 500 }}>{w.exercise}</span>
                <span style={{ width: cols[2].w, fontSize: 13, color: '#636366' }}>{w.weight} kg</span>
                <span style={{ width: cols[3].w, fontSize: 13, color: '#636366' }}>{w.sets}×{w.reps}</span>
                <span style={{ width: cols[4].w, fontSize: 13, color: '#636366' }}>{(w.weight * w.sets * w.reps).toLocaleString()} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid #E5E5EA', paddingTop: 15, marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#8E8E93' }}>{studioName}</span>
        <span style={{ fontSize: 11, color: '#8E8E93' }}>{lang === 'zh' ? '第 4 页' : 'Page 4'} / {new Date().toISOString().split('T')[0]}</span>
      </div>
    </div>
  );
};

export default HistoryPage;
