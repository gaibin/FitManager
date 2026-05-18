/**
 * PDF 报告第3页 — 4周矫正训练方案 + AI 建议
 */

import React from 'react';
import { Member, Language } from '../../types';

interface PlanPageProps {
  member: Member;
  lang: Language;
  studioName: string;
}

const PlanPage: React.FC<PlanPageProps> = ({ member, lang, studioName }) => {
  const latestAssessment = member.assessments?.[0];

  if (!latestAssessment) {
    return (
      <div style={{
        width: 794, height: 1123, backgroundColor: '#09090b', color: '#f4f4f5',
        padding: '60px 50px', fontFamily: 'system-ui, sans-serif',
        boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 18, color: '#52525b' }}>
          {lang === 'zh' ? '暂无矫正方案数据' : 'No correction plan data'}
        </span>
      </div>
    );
  }

  const { correctionPlan, aiRecommendation } = latestAssessment;

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
        {lang === 'zh' ? '4周矫正训练方案' : '4-Week Correction Plan'}
      </h2>

      {/* Week 1-2 */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          backgroundColor: '#a3e635', color: '#000', display: 'inline-block',
          padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, marginBottom: 14,
        }}>
          {lang === 'zh' ? '第 1-2 周（放松激活）' : 'Week 1-2 (Activation)'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {correctionPlan.week1_2.length === 0 ? (
            <span style={{ fontSize: 12, color: '#52525b', padding: '10px 0' }}>
              {lang === 'zh' ? '暂无该阶段动作' : 'No exercises for this phase'}
            </span>
          ) : (
            correctionPlan.week1_2.map((ex, idx) => (
              <div key={idx} style={{
                backgroundColor: '#18181b', borderRadius: 8, padding: '14px 18px',
                border: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  backgroundColor: 'rgba(163,230,53,0.1)', border: '1px solid rgba(163,230,53,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#a3e635',
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{ex.name}</span>
                  {ex.description && (
                    <p style={{ fontSize: 11, color: '#71717a', margin: '2px 0 0 0' }}>{ex.description}</p>
                  )}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#a3e635',
                  backgroundColor: 'rgba(163,230,53,0.1)', padding: '4px 10px', borderRadius: 4,
                  fontFamily: 'monospace',
                }}>
                  {ex.sets}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Week 3-4 */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          backgroundColor: '#3b82f6', color: '#fff', display: 'inline-block',
          padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, marginBottom: 14,
        }}>
          {lang === 'zh' ? '第 3-4 周（强化整合）' : 'Week 3-4 (Integration)'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {correctionPlan.week3_4.length === 0 ? (
            <span style={{ fontSize: 12, color: '#52525b', padding: '10px 0' }}>
              {lang === 'zh' ? '暂无该阶段动作' : 'No exercises for this phase'}
            </span>
          ) : (
            correctionPlan.week3_4.map((ex, idx) => (
              <div key={idx} style={{
                backgroundColor: '#18181b', borderRadius: 8, padding: '14px 18px',
                border: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#3b82f6',
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{ex.name}</span>
                  {ex.description && (
                    <p style={{ fontSize: 11, color: '#71717a', margin: '2px 0 0 0' }}>{ex.description}</p>
                  )}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#3b82f6',
                  backgroundColor: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: 4,
                  fontFamily: 'monospace',
                }}>
                  {ex.sets}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI 综合建议 */}
      {aiRecommendation && (
        <div style={{
          backgroundColor: '#18181b', borderRadius: 12, padding: '20px 24px',
          border: '1px solid rgba(163,230,53,0.15)', flex: 1,
        }}>
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: '#a3e635',
            margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>&#9889;</span>
            {lang === 'zh' ? 'AI 综合建议' : 'AI Recommendations'}
          </h3>
          <p style={{
            fontSize: 13, color: '#d4d4d8', lineHeight: 1.7,
            whiteSpace: 'pre-wrap', margin: 0,
          }}>
            {aiRecommendation}
          </p>
        </div>
      )}

      {/* 页脚 */}
      <div style={{ borderTop: '1px solid #27272a', paddingTop: 15, marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#52525b' }}>{studioName}</span>
        <span style={{ fontSize: 11, color: '#52525b' }}>
          {lang === 'zh' ? '第 3 页' : 'Page 3'} / {new Date().toISOString().split('T')[0]}
        </span>
      </div>
    </div>
  );
};

export default PlanPage;
