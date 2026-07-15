import React from 'react';
import type { Language, Member, PostureMeasurement, PostureView } from '../../types';
import { REPORT, ReportFooter, ReportHeader, reportPageStyle } from './reportTheme';

interface FindingsPageProps { member: Member; lang: Language; studioName: string; }

const viewName = (view: PostureView, lang: Language) => lang === 'zh' ? ({ front: '正面', side: '侧面', back: '背面' }[view]) : view.toUpperCase();

function reliabilityLabel(item: PostureMeasurement, lang: Language) {
  if (item.trackable) return lang === 'zh' ? '趋势 + 训练' : 'Trend + plan';
  return lang === 'zh' ? '训练参考' : 'Plan reference';
}

const FindingsPage: React.FC<FindingsPageProps> = ({ member, lang, studioName }) => {
  const assessment = member.assessments?.[0];
  const measurements = assessment?.measurements || assessment?.report.measurements || [];
  const recommendation = assessment?.recommendation;
  if (!assessment) return <div style={reportPageStyle} />;

  const frontShoulder = measurements.find(item => item.id === 'shoulder_line');
  const backShoulder = measurements.find(item => item.id === 'back_shoulder_line');
  const shoulderAgreement = frontShoulder && backShoulder ? Math.abs(frontShoulder.value - backShoulder.value) : null;

  return (
    <div style={reportPageStyle}>
      <ReportHeader studioName={studioName} section="03 · QUANTITATIVE FINDINGS" title={lang === 'zh' ? '量化结果与训练优先级' : 'Quantitative findings & training priorities'}
        subtitle={lang === 'zh' ? '保留每项角度的正负方向、节点置信度和定位误差，并据此排序本次训练优先级。' : 'Each angle retains direction, landmark confidence, and localisation error and is then ranked for training priority.'} />

      <div style={{ display: 'grid', gridTemplateColumns: recommendation?.priorities?.length ? `repeat(${recommendation.priorities.length}, 1fr)` : '1fr', gap: 10, marginBottom: 15 }}>
        {(recommendation?.priorities?.length ? recommendation.priorities : [{ measurementId: 'baseline', name: '基础动作控制', nameEn: 'Foundation movement control', value: 0, unit: '', goal: recommendation?.goal, goalEn: recommendation?.goalEn }]).map((priority, index) => (
          <div key={priority.measurementId} style={{ border: `1px solid ${REPORT.line}`, borderLeft: `4px solid ${REPORT.blue}`, padding: '12px 14px', background: '#FBFCFE' }}>
            <p style={{ margin: 0, color: REPORT.blue, fontSize: 8.5, fontWeight: 800, letterSpacing: 1 }}>PRIORITY {index + 1}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', marginTop: 5 }}>
              <p style={{ margin: 0, color: REPORT.ink, fontSize: 12, fontWeight: 800 }}>{lang === 'zh' ? priority.name : priority.nameEn}</p>
              {priority.unit && <span style={{ color: REPORT.navy, fontSize: 14, fontWeight: 850, whiteSpace: 'nowrap' }}>{Number(priority.value).toFixed(1)}{priority.unit}</span>}
            </div>
            <p style={{ margin: '6px 0 0', color: REPORT.muted, fontSize: 8.5, lineHeight: 1.4 }}>{lang === 'zh' ? priority.goal : priority.goalEn}</p>
          </div>
        ))}
      </div>

      <div style={{ border: `1px solid ${REPORT.line}`, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '64px 1.55fr 92px 92px 100px', background: REPORT.navy, color: '#FFFFFF', padding: '9px 11px', fontSize: 8, fontWeight: 800, letterSpacing: 0.5 }}>
          <span>{lang === 'zh' ? '视图' : 'VIEW'}</span><span>{lang === 'zh' ? '测量指标' : 'MEASUREMENT'}</span><span>{lang === 'zh' ? '结果' : 'RESULT'}</span><span>{lang === 'zh' ? '置信度' : 'CONFIDENCE'}</span><span>{lang === 'zh' ? '用途' : 'USE'}</span>
        </div>
        {measurements.slice(0, 12).map((item, index) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '64px 1.55fr 92px 92px 100px', padding: '8px 11px', alignItems: 'center', borderTop: index ? `1px solid ${REPORT.line}` : 0, background: index % 2 ? '#FBFCFE' : '#FFFFFF' }}>
            <span style={{ color: REPORT.blue, fontSize: 8, fontWeight: 800 }}>{viewName(item.view, lang)}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, color: REPORT.ink, fontSize: 9, fontWeight: 750 }}>{lang === 'zh' ? item.name : item.nameEn}</p>
              <p style={{ margin: '2px 0 0', color: REPORT.muted, fontSize: 7.2, lineHeight: 1.25 }}>{item.direction}</p>
            </div>
            <span style={{ color: REPORT.ink, fontSize: 10, fontWeight: 800 }}>{item.value.toFixed(1)}{item.unit} <small style={{ color: REPORT.muted, fontWeight: 500 }}>±{item.uncertainty.toFixed(1)}</small></span>
            <span style={{ color: item.confidence >= .7 ? REPORT.green : REPORT.amber, fontSize: 8.5, fontWeight: 750 }}>{Math.round(item.confidence * 100)}%</span>
            <span style={{ color: item.trackable ? REPORT.green : REPORT.blue, fontSize: 7.8, fontWeight: 700 }}>{reliabilityLabel(item, lang)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
        <div style={{ border: `1px solid ${REPORT.line}`, background: REPORT.pale, padding: 13 }}>
          <p style={{ margin: 0, color: REPORT.navy, fontSize: 9, fontWeight: 800 }}>{lang === 'zh' ? '跨视图一致性' : 'CROSS-VIEW CONSISTENCY'}</p>
          <p style={{ margin: '8px 0 0', color: REPORT.ink, fontSize: 11, fontWeight: 750 }}>
            {shoulderAgreement == null ? (lang === 'zh' ? '缺少可配对的正/背面肩峰角' : 'No paired front/back acromion angles') : `${lang === 'zh' ? '肩峰角差值' : 'Acromion-angle difference'} ${shoulderAgreement.toFixed(1)}°`}
          </p>
          <p style={{ margin: '5px 0 0', color: REPORT.muted, fontSize: 8, lineHeight: 1.4 }}>{lang === 'zh' ? '差值较大时优先复核拍摄旋转、贴点位置和站姿一致性。' : 'A larger difference prompts review of rotation, marker placement, and stance consistency.'}</p>
        </div>
        <div style={{ border: `1px solid ${REPORT.line}`, background: REPORT.pale, padding: 13 }}>
          <p style={{ margin: 0, color: REPORT.navy, fontSize: 9, fontWeight: 800 }}>{lang === 'zh' ? '趋势状态' : 'TREND STATUS'}</p>
          <p style={{ margin: '8px 0 0', color: REPORT.ink, fontSize: 11, fontWeight: 750 }}>{assessment.report.trendIndex == null ? (lang === 'zh' ? '本次建立基线' : 'Baseline established') : `${assessment.report.trendIndex} / 100`}</p>
          <p style={{ margin: '5px 0 0', color: REPORT.muted, fontSize: 8, lineHeight: 1.4 }}>{lang === 'zh' ? '趋势用于观察连续评估的变化；本页所有角度均已用于本次训练编排。' : 'The trend summarises change across assessments; all current angles inform this training plan.'}</p>
        </div>
      </div>

      <div style={{ padding: '11px 13px', border: `1px solid ${REPORT.line}`, borderLeft: `4px solid ${REPORT.amber}`, color: REPORT.muted, fontSize: 8.3, lineHeight: 1.45 }}>
        <b style={{ color: REPORT.ink }}>{lang === 'zh' ? '训练应用：' : 'Training application: '}</b>
        {lang === 'zh' ? '优先项决定四周计划的动作主题；其余角度用于教练在热身、技术提示和复评时交叉参考。' : 'Priority items determine the four-week exercise themes; remaining angles support warm-up selection, coaching cues, and reassessment.'}
      </div>

      <ReportFooter studioName={studioName} page={3} date={assessment.date} />
    </div>
  );
};

export default FindingsPage;
