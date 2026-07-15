import React from 'react';
import type { Language, Member } from '../../types';
import { MetricPill, REPORT, ReportFooter, ReportHeader, reportPageStyle } from './reportTheme';

interface HistoryPageProps { member: Member; lang: Language; studioName: string; pageNumber?: number; }

const HistoryPage: React.FC<HistoryPageProps> = ({ member, lang, studioName, pageNumber = 5 }) => {
  const rows = [...member.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 17);
  const sessions = new Set(member.workouts.map(item => item.date)).size;
  const volume = member.workouts.reduce((sum, item) => sum + item.weight * item.sets * item.reps, 0);
  const maxLoad = member.workouts.reduce((max, item) => Math.max(max, item.weight), 0);
  const latest = member.workouts.map(item => item.date).sort().at(-1) || '—';
  const assessmentDate = member.assessments?.[0]?.date || new Date().toISOString().split('T')[0];

  return (
    <div style={reportPageStyle}>
      <ReportHeader studioName={studioName} section={`${String(pageNumber).padStart(2, '0')} · TRAINING AUDIT`} title={lang === 'zh' ? '训练记录与复评准备' : 'Training audit & reassessment preparation'}
        subtitle={lang === 'zh' ? '汇总训练负荷、动作完成情况与下一次体态复评准备。' : 'A consolidated view of training load, exercise completion, and preparation for the next posture reassessment.'} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <MetricPill label={lang === 'zh' ? '累计训练日' : 'Training days'} value={`${sessions}`} />
        <MetricPill label={lang === 'zh' ? '记录总容量' : 'Logged volume'} value={`${(volume / 1000).toFixed(1)} t`} />
        <MetricPill label={lang === 'zh' ? '最大记录负荷' : 'Max logged load'} value={`${maxLoad} kg`} />
        <MetricPill label={lang === 'zh' ? '最近记录' : 'Latest entry'} value={latest} />
      </div>

      <div style={{ border: `1px solid ${REPORT.line}`, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '78px 1.55fr 78px 90px 92px', background: REPORT.navy, color: '#FFFFFF', padding: '9px 12px', fontSize: 8, fontWeight: 800 }}>
          <span>{lang === 'zh' ? '日期' : 'DATE'}</span><span>{lang === 'zh' ? '动作' : 'EXERCISE'}</span><span>{lang === 'zh' ? '负荷' : 'LOAD'}</span><span>{lang === 'zh' ? '组 × 次' : 'SETS × REPS'}</span><span>{lang === 'zh' ? '容量' : 'VOLUME'}</span>
        </div>
        {rows.length ? rows.map((item, index) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '78px 1.55fr 78px 90px 92px', padding: '9px 12px', alignItems: 'center', borderTop: index ? `1px solid ${REPORT.line}` : 0, background: index % 2 ? '#FBFCFE' : '#FFFFFF', color: REPORT.ink, fontSize: 8.7 }}>
            <span style={{ color: REPORT.blue, fontWeight: 750 }}>{item.date}</span><span style={{ fontWeight: 700 }}>{item.exercise}</span><span>{item.weight} kg</span><span>{item.sets} × {item.reps}</span><span>{(item.weight * item.sets * item.reps).toLocaleString()} kg</span>
          </div>
        )) : <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: REPORT.muted, fontSize: 10 }}>{lang === 'zh' ? '尚无训练记录；从本期处方开始记录动作、剂量和症状反应。' : 'No training log yet; begin recording exercise, dose, and symptom response with this plan.'}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
        <div style={{ border: `1px solid ${REPORT.line}`, background: REPORT.pale, padding: 14 }}>
          <p style={{ margin: 0, color: REPORT.navy, fontSize: 9, fontWeight: 850 }}>{lang === 'zh' ? '每次训练后记录' : 'LOG AFTER EACH SESSION'}</p>
          <ul style={{ margin: '9px 0 0', paddingLeft: 15, color: REPORT.muted, fontSize: 8.2, lineHeight: 1.55 }}>
            <li>{lang === 'zh' ? '完成的动作、组数、次数和阻力' : 'Exercise, sets, reps, and resistance completed'}</li>
            <li>{lang === 'zh' ? '训练前后疼痛/不适评分（0–10）' : 'Pre/post pain or discomfort score (0–10)'}</li>
            <li>{lang === 'zh' ? '动作质量：稳定 / 需提示 / 无法完成' : 'Movement quality: stable / cued / unable'}</li>
            <li>{lang === 'zh' ? '是否使用退阶或提前停止' : 'Whether regression or early stopping was needed'}</li>
          </ul>
        </div>
        <div style={{ border: `1px solid ${REPORT.line}`, background: REPORT.pale, padding: 14 }}>
          <p style={{ margin: 0, color: REPORT.navy, fontSize: 9, fontWeight: 850 }}>{lang === 'zh' ? '复评前检查' : 'BEFORE REASSESSMENT'}</p>
          <ul style={{ margin: '9px 0 0', paddingLeft: 15, color: REPORT.muted, fontSize: 8.2, lineHeight: 1.55 }}>
            <li>{lang === 'zh' ? '使用相同镜头高度、距离和拍摄协议' : 'Use the same camera height, distance, and protocol'}</li>
            <li>{lang === 'zh' ? '尽量在相近时段、训练状态下复拍' : 'Repeat at a similar time and training state'}</li>
            <li>{lang === 'zh' ? '复核相同解剖贴点，记录人工修正' : 'Review the same markers and log manual corrections'}</li>
            <li>{lang === 'zh' ? '先比较是否超过 MDC，再解释变化方向' : 'Check MDC before interpreting change direction'}</li>
          </ul>
        </div>
      </div>

      <div style={{ border: `1px solid ${REPORT.line}`, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><p style={{ margin: 0, color: REPORT.navy, fontSize: 9, fontWeight: 850 }}>{lang === 'zh' ? '教练复评记录' : 'COACH REASSESSMENT NOTE'}</p><span style={{ color: REPORT.muted, fontSize: 8 }}>{lang === 'zh' ? `本次基线 ${assessmentDate}` : `Current baseline ${assessmentDate}`}</span></div>
        <div style={{ marginTop: 12, height: 76, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 24px, ${REPORT.line} 25px)`, backgroundSize: '100% 25px' }} />
      </div>

      <ReportFooter studioName={studioName} page={pageNumber} date={assessmentDate} />
    </div>
  );
};

export default HistoryPage;
