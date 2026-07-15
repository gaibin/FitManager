import React from 'react';
import type { Language, Member } from '../../types';
import { MetricPill, REPORT, ReportFooter, reportPageStyle } from './reportTheme';

interface CoverPageProps { member: Member; lang: Language; studioName: string; studioLogo?: string; coachName?: string; accentColor?: string; }

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${18 + index * 108},${156 - (value / max) * 112}`).join(' ');
  return (
    <svg viewBox="0 0 576 176" style={{ display: 'block', width: '100%', height: 176 }}>
      {[44, 88, 132, 156].map(y => <line key={y} x1="18" y1={y} x2="558" y2={y} stroke={REPORT.line} strokeWidth="1" />)}
      <polyline points={points} fill="none" stroke={REPORT.blue} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((value, index) => <circle key={index} cx={18 + index * 108} cy={156 - (value / max) * 112} r="4" fill="#FFFFFF" stroke={REPORT.blue} strokeWidth="2.5" />)}
    </svg>
  );
}

const CoverPage: React.FC<CoverPageProps> = ({ member, lang, studioName, studioLogo, coachName }) => {
  const assessment = member.assessments?.[0];
  const reportDate = assessment?.date || new Date().toISOString().split('T')[0];
  const monthlyCount = member.workouts.filter(item => item.date.startsWith(reportDate.slice(0, 7))).length;
  const totalVolume = member.workouts.reduce((sum, item) => sum + item.weight * item.sets * item.reps, 0);
  const recentMonths = Array.from({ length: 6 }, (_, offset) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - offset));
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { month: month.slice(5), volume: member.workouts.filter(item => item.date.startsWith(month)).reduce((sum, item) => sum + item.weight * item.sets * item.reps, 0) / 1000 };
  });
  const priorities = assessment?.recommendation?.priorities || [];

  return (
    <div style={reportPageStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 18, borderBottom: `2px solid ${REPORT.navy}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {studioLogo ? <img src={studioLogo} alt="Studio logo" style={{ width: 34, height: 34, objectFit: 'contain' }} /> : <div style={{ width: 34, height: 34, background: REPORT.navy, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 850, fontSize: 12 }}>NF</div>}
          <div><p style={{ margin: 0, color: REPORT.navy, fontSize: 11, fontWeight: 850, letterSpacing: 1.1 }}>{studioName}</p><p style={{ margin: '3px 0 0', color: REPORT.muted, fontSize: 8 }}>{coachName ? `${lang === 'zh' ? '主教练' : 'Lead coach'} · ${coachName}` : 'POSTURE & PERFORMANCE LAB'}</p></div>
        </div>
        <div style={{ textAlign: 'right' }}><p style={{ margin: 0, color: REPORT.muted, fontSize: 8, letterSpacing: 1 }}>CONFIDENTIAL</p><p style={{ margin: '4px 0 0', color: REPORT.ink, fontSize: 9, fontWeight: 750 }}>REPORT {reportDate.replaceAll('-', '')}-{member.id.slice(0, 6).toUpperCase()}</p></div>
      </header>

      <div style={{ padding: '38px 0 31px' }}>
        <p style={{ margin: 0, color: REPORT.blue, fontSize: 10, fontWeight: 850, letterSpacing: 2 }}>MEMBER SCIENCE REPORT</p>
        <h1 style={{ margin: '10px 0 0', maxWidth: 610, color: REPORT.ink, fontSize: 39, lineHeight: 1.12, fontWeight: 850, letterSpacing: -1.2 }}>{lang === 'zh' ? '体态摄影测量与训练处方报告' : 'Posture Photogrammetry & Training Prescription'}</h1>
        <p style={{ margin: '13px 0 0', maxWidth: 570, color: REPORT.muted, fontSize: 11, lineHeight: 1.55 }}>{lang === 'zh' ? '将可追溯节点、原始角度、定位不确定度和四周训练进阶整合在同一份会员报告中。' : 'A member-facing synthesis of traceable landmarks, raw angles, localisation uncertainty, and a four-week training progression.'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr .9fr .9fr .8fr', borderTop: `1px solid ${REPORT.line}`, borderBottom: `1px solid ${REPORT.line}`, padding: '16px 0', marginBottom: 22 }}>
        {[
          [lang === 'zh' ? '会员姓名' : 'MEMBER', member.name],
          [lang === 'zh' ? '身高' : 'HEIGHT', `${member.heightCm} cm`],
          [lang === 'zh' ? '入会日期' : 'JOINED', member.joinDate],
          [lang === 'zh' ? '报告日期' : 'REPORT', reportDate],
        ].map(([label, value], index) => <div key={label} style={{ paddingLeft: index ? 16 : 0, borderLeft: index ? `1px solid ${REPORT.line}` : 0 }}><p style={{ margin: 0, color: REPORT.muted, fontSize: 8, fontWeight: 750, letterSpacing: .7 }}>{label}</p><p style={{ margin: '6px 0 0', color: REPORT.ink, fontSize: 13, fontWeight: 800 }}>{value}</p></div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
        <MetricPill label={lang === 'zh' ? '本月训练' : 'Monthly sessions'} value={`${monthlyCount}`} />
        <MetricPill label={lang === 'zh' ? '累计训练容量' : 'Total volume'} value={`${(totalVolume / 1000).toFixed(1)} t`} />
        <MetricPill label={lang === 'zh' ? '摄影测量置信度' : 'Photo confidence'} value={assessment ? `${Math.round(assessment.report.confidence * 100)}%` : '—'} tone={assessment && assessment.report.confidence >= .7 ? 'green' : 'amber'} />
        <MetricPill label={lang === 'zh' ? '趋势指数' : 'Trend index'} value={assessment?.report.trendIndex == null ? (lang === 'zh' ? '基线' : 'Baseline') : `${assessment.report.trendIndex}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 13, marginBottom: 18 }}>
        <div style={{ border: `1px solid ${REPORT.line}`, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 style={{ margin: 0, color: REPORT.navy, fontSize: 12, fontWeight: 850 }}>{lang === 'zh' ? '近六个月训练容量' : 'Six-month training volume'}</h2><span style={{ color: REPORT.muted, fontSize: 8 }}>TONNES</span></div>
          <Sparkline values={recentMonths.map(item => item.volume)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px', color: REPORT.muted, fontSize: 7 }}>{recentMonths.map(item => <span key={item.month}>{item.month}</span>)}</div>
        </div>
        <div style={{ border: `1px solid ${REPORT.line}`, padding: '14px 15px', background: REPORT.pale }}>
          <h2 style={{ margin: 0, color: REPORT.navy, fontSize: 12, fontWeight: 850 }}>{lang === 'zh' ? '本期摘要' : 'Executive summary'}</h2>
          <div style={{ marginTop: 13 }}>
            <p style={{ margin: 0, color: REPORT.muted, fontSize: 8, fontWeight: 750, letterSpacing: .6 }}>{lang === 'zh' ? '训练优先级' : 'TRAINING PRIORITIES'}</p>
            {priorities.length ? priorities.slice(0, 2).map((item, index) => <div key={item.measurementId} style={{ display: 'flex', gap: 8, marginTop: 8 }}><span style={{ color: REPORT.blue, fontSize: 9, fontWeight: 850 }}>0{index + 1}</span><div><p style={{ margin: 0, color: REPORT.ink, fontSize: 9, fontWeight: 780 }}>{lang === 'zh' ? item.name : item.nameEn}</p><p style={{ margin: '2px 0 0', color: REPORT.muted, fontSize: 7.5 }}>{lang === 'zh' ? item.goal : item.goalEn}</p></div></div>) : <p style={{ margin: '8px 0 0', color: REPORT.muted, fontSize: 8.5 }}>{lang === 'zh' ? '基础控制与对称承重' : 'Foundation control and symmetrical loading'}</p>}
          </div>
          <div style={{ marginTop: 17, paddingTop: 12, borderTop: `1px solid ${REPORT.line}` }}>
            <p style={{ margin: 0, color: REPORT.muted, fontSize: 8, fontWeight: 750, letterSpacing: .6 }}>{lang === 'zh' ? '拍摄协议' : 'CAPTURE PROTOCOL'}</p>
            <p style={{ margin: '6px 0 0', color: REPORT.ink, fontSize: 9, lineHeight: 1.45 }}>{assessment?.protocolVersion || (lang === 'zh' ? '未记录' : 'Not recorded')}</p>
            <p style={{ margin: '4px 0 0', color: REPORT.green, fontSize: 8, fontWeight: 750 }}>{lang === 'zh' ? '三视图节点评估 · 已生成训练处方' : 'Three-view landmark assessment · Plan generated'}</p>
          </div>
        </div>
      </div>

      <div style={{ borderLeft: `4px solid ${REPORT.navy}`, padding: '9px 12px', background: REPORT.pale, color: REPORT.muted, fontSize: 8.3, lineHeight: 1.45 }}>
        {lang === 'zh' ? '阅读顺序：先核对第 2 页真人节点证据，再阅读第 3 页角度与训练优先级，最后使用第 4 页四周训练处方编排课程。' : 'Reading order: verify the member landmark evidence on page 2, review angles and priorities on page 3, then programme sessions from the four-week prescription on page 4.'}
      </div>

      <ReportFooter studioName={studioName} page={1} date={reportDate} />
    </div>
  );
};

export default CoverPage;
