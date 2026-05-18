/**
 * PDF 报告第2页 — 体态评估结果 (评分 + 照片 + 问题列表)
 */

import React from 'react';
import { Member, Language } from '../../types';

interface PosturePageProps {
  member: Member;
  lang: Language;
  studioName: string;
}

const severityColors: Record<string, { border: string; bg: string; text: string }> = {
  '正常': { border: '#059669', bg: 'rgba(5,150,105,0.1)', text: '#34d399' },
  '中度': { border: '#d97706', bg: 'rgba(217,119,6,0.1)', text: '#fbbf24' },
  '严重': { border: '#dc2626', bg: 'rgba(220,38,38,0.1)', text: '#f87171' },
  '低置信度': { border: '#52525b', bg: 'rgba(82,82,91,0.1)', text: '#71717a' },
};

const PosturePage: React.FC<PosturePageProps> = ({ member, lang, studioName }) => {
  const latestAssessment = member.assessments?.[0];

  if (!latestAssessment) {
    return (
      <div style={{
        width: 794, height: 1123, backgroundColor: '#09090b', color: '#f4f4f5',
        padding: '60px 50px', fontFamily: 'system-ui, sans-serif',
        boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 18, color: '#52525b' }}>
          {lang === 'zh' ? '暂无体态评估数据' : 'No posture assessment data'}
        </span>
      </div>
    );
  }

  const { report } = latestAssessment;

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
        {lang === 'zh' ? '体态评估' : 'Posture Assessment'}
      </h2>

      {/* 评分 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, gap: 24 }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          border: `4px solid ${report.score >= 70 ? '#a3e635' : report.score >= 40 ? '#f59e0b' : '#f43f5e'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#18181b',
        }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{report.score}</span>
          <span style={{ fontSize: 11, color: '#71717a' }}>/ 100</span>
        </div>
        <div>
          <p style={{ fontSize: 14, color: '#71717a', margin: '0 0 4px 0' }}>
            {lang === 'zh' ? '置信度' : 'Confidence'}
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#a3e635', margin: 0 }}>
            {(report.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* 照片预览 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {[
          { src: latestAssessment.frontImage, label: lang === 'zh' ? '正面' : 'Front' },
          { src: latestAssessment.sideImage, label: lang === 'zh' ? '侧面' : 'Side' },
          { src: latestAssessment.backImage, label: lang === 'zh' ? '背面' : 'Back' },
        ].filter(p => p.src).map((photo, idx) => (
          <div key={idx} style={{
            flex: 1, backgroundColor: '#18181b', borderRadius: 8, overflow: 'hidden',
            border: '1px solid #27272a', position: 'relative',
          }}>
            <img src={photo.src} style={{ width: '100%', height: 180, objectFit: 'cover' }} alt={photo.label} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.7)', padding: '6px 12px',
              textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#a3e635',
            }}>
              {photo.label}
            </div>
          </div>
        ))}
      </div>

      {/* 问题列表 */}
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 16px 0' }}>
          {lang === 'zh' ? '检测结果' : 'Detection Results'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {report.issues.map((issue, idx) => {
            const colors = severityColors[issue.severity] || severityColors['中度'];
            return (
              <div key={idx} style={{
                backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: 10, padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                    {lang === 'zh' ? issue.name : issue.nameEn}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 12,
                    backgroundColor: colors.border, color: colors.text,
                    fontWeight: 600,
                  }}>
                    {issue.value.toFixed(1)} {issue.unit}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#71717a' }}>
                    {lang === 'zh' ? issue.description : issue.descriptionEn}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 12,
                    backgroundColor: colors.border, color: colors.text,
                  }}>
                    {issue.severity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 页脚 */}
      <div style={{ borderTop: '1px solid #27272a', paddingTop: 15, marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#52525b' }}>{studioName}</span>
        <span style={{ fontSize: 11, color: '#52525b' }}>
          {lang === 'zh' ? '第 2 页' : 'Page 2'} / {new Date().toISOString().split('T')[0]}
        </span>
      </div>
    </div>
  );
};

export default PosturePage;
