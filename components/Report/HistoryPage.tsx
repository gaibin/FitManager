/**
 * PDF 报告第4页 — 近期训练记录明细
 */

import React from 'react';
import { Member, Language } from '../../types';

interface HistoryPageProps {
  member: Member;
  lang: Language;
  studioName: string;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ member, lang, studioName }) => {
  const recentWorkouts = member.workouts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  return (
    <div style={{
      width: 794, height: 1123, backgroundColor: '#09090b', color: '#f4f4f5',
      padding: '60px 50px', fontFamily: 'system-ui, sans-serif',
      boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
    }}>
      {/* 页眉 */}
      <div style={{ borderBottom: '1px solid #27272a', paddingBottom: 15, marginBottom: 30 }}>
        <span style={{ fontSize: 12, color: '#52525b', letterSpacing: 2 }}>{studioName}</span>
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 24px 0' }}>
        {lang === 'zh' ? '近期训练记录' : 'Recent Training Records'}
      </h2>

      {recentWorkouts.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: '#52525b' }}>
            {lang === 'zh' ? '暂无训练记录' : 'No training records yet'}
          </span>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          {/* 表头 */}
          <div style={{
            display: 'flex', backgroundColor: '#18181b', borderRadius: '8px 8px 0 0',
            padding: '12px 16px', border: '1px solid #27272a', borderBottom: '2px solid #3f3f46',
          }}>
            {[
              { label: lang === 'zh' ? '日期' : 'Date', width: '18%' },
              { label: lang === 'zh' ? '动作' : 'Exercise', width: '34%' },
              { label: lang === 'zh' ? '重量' : 'Weight', width: '16%' },
              { label: lang === 'zh' ? '组 x 次' : 'Sets x Reps', width: '16%' },
              { label: lang === 'zh' ? '容量' : 'Volume', width: '16%' },
            ].map((col, i) => (
              <span key={i} style={{
                width: col.width, fontSize: 11, color: '#71717a',
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {col.label}
              </span>
            ))}
          </div>

          {/* 数据行 */}
          <div style={{
            border: '1px solid #27272a', borderTop: 'none', borderRadius: '0 0 8px 8px',
            overflow: 'hidden',
          }}>
            {recentWorkouts.map((w, idx) => (
              <div key={w.id} style={{
                display: 'flex', padding: '10px 16px', alignItems: 'center',
                backgroundColor: idx % 2 === 0 ? '#09090b' : '#18181b',
                borderBottom: idx < recentWorkouts.length - 1 ? '1px solid #27272a' : 'none',
              }}>
                <span style={{ width: '18%', fontSize: 12, color: '#a3e635', fontWeight: 500, fontFamily: 'monospace' }}>
                  {w.date.slice(5)}
                </span>
                <span style={{ width: '34%', fontSize: 13, color: '#e4e4e7', fontWeight: 500 }}>
                  {w.exercise}
                </span>
                <span style={{ width: '16%', fontSize: 13, color: '#a1a1aa' }}>
                  {w.weight} kg
                </span>
                <span style={{ width: '16%', fontSize: 13, color: '#a1a1aa' }}>
                  {w.sets}x{w.reps}
                </span>
                <span style={{ width: '16%', fontSize: 13, color: '#a1a1aa' }}>
                  {(w.weight * w.sets * w.reps).toLocaleString()} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 页脚 */}
      <div style={{ borderTop: '1px solid #27272a', paddingTop: 15, marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#52525b' }}>{studioName}</span>
        <span style={{ fontSize: 11, color: '#52525b' }}>
          {lang === 'zh' ? '第 4 页' : 'Page 4'} / {new Date().toISOString().split('T')[0]}
        </span>
      </div>
    </div>
  );
};

export default HistoryPage;
