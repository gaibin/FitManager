import React from 'react';
import type { Language, Member, PostureLandmark, PostureMeasurement, PostureView, PostureViewResult } from '../../types';
import ReportEvidenceFigure from './ReportEvidenceFigure';
import { MetricPill, REPORT, ReportFooter, ReportHeader, reportPageStyle } from './reportTheme';

interface PosturePageProps { member: Member; lang: Language; studioName: string; }

const VIEW_LABELS: Record<PostureView, { zh: string; en: string }> = {
  front: { zh: '正面证据', en: 'FRONT EVIDENCE' },
  side: { zh: '侧面证据', en: 'SIDE EVIDENCE' },
  back: { zh: '背面证据', en: 'BACK EVIDENCE' },
};

function evidenceMeasurement(measurements: PostureMeasurement[], view: PostureView) {
  return measurements
    .filter(item => item.view === view && item.status === 'measured')
    .sort((a, b) => Math.abs(b.value) / Math.max(b.uncertainty, 0.5) - Math.abs(a.value) / Math.max(a.uncertainty, 0.5))[0];
}

const PosturePage: React.FC<PosturePageProps> = ({ member, lang, studioName }) => {
  const assessment = member.assessments?.[0];
  if (!assessment) {
    return <div style={{ ...reportPageStyle, alignItems: 'center', justifyContent: 'center' }}>{lang === 'zh' ? '暂无体态评估数据' : 'No posture assessment data'}</div>;
  }

  if (assessment.schemaVersion !== 2) {
    return (
      <div style={reportPageStyle}>
        <ReportHeader studioName={studioName} section="02 · LEGACY ASSESSMENT" title={lang === 'zh' ? '旧版体态筛查结果' : 'Legacy posture screen'}
          subtitle={lang === 'zh' ? '保留旧版照片与角度记录，供教练回顾。' : 'Legacy images and angles are retained for coach review.'} />
        <div style={{ padding: 20, border: `1px solid ${REPORT.line}`, background: REPORT.pale }}>
          {(assessment.report.issues || []).map(item => <p key={item.name} style={{ fontSize: 11 }}>{lang === 'zh' ? item.name : item.nameEn}: {item.value.toFixed(1)} {item.unit}</p>)}
        </div>
        <ReportFooter studioName={studioName} page={2} date={assessment.date} />
      </div>
    );
  }

  const measurements = assessment.measurements || assessment.report.measurements || [];
  const views = (['front', 'side', 'back'] as PostureView[]).filter(view => assessment.views?.[view] && (view === 'front' ? assessment.frontImage : view === 'side' ? assessment.sideImage : assessment.backImage));
  const reviewedCount = (Object.values(assessment.views || {}) as (PostureViewResult | undefined)[]).reduce(
    (sum, view) => sum + (Object.values(view?.markers || {}) as PostureLandmark[]).filter(point => point.source === 'manual' || point.source === 'marker').length,
    0,
  );

  return (
    <div style={reportPageStyle}>
      <ReportHeader studioName={studioName} section="02 · PHOTOGRAMMETRY EVIDENCE" title={lang === 'zh' ? '真人照片、节点与角度证据' : 'Member images, landmarks & angle evidence'}
        subtitle={lang === 'zh' ? '三张原图保持真人原始比例，直接叠加识别节点、人工复核点与主要测量线。' : 'All member images retain their native proportions with landmarks, reviewed points, and primary measurement lines overlaid.'} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <MetricPill label={lang === 'zh' ? '证据视图' : 'Evidence views'} value={`${views.length}`} />
        <MetricPill label={lang === 'zh' ? '节点置信度' : 'Landmark confidence'} value={`${Math.round(assessment.report.confidence * 100)}%`} />
        <MetricPill label={lang === 'zh' ? '角度指标' : 'Angle metrics'} value={`${measurements.length}`} />
        <MetricPill label={lang === 'zh' ? '贴点/人工复核' : 'Reviewed markers'} value={`${reviewedCount}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(views.length, 1)}, 1fr)`, gap: 9, alignItems: 'start', marginBottom: 16 }}>
        {views.map(view => {
          const src = view === 'front' ? assessment.frontImage : view === 'side' ? assessment.sideImage : assessment.backImage!;
          return <div key={view}><ReportEvidenceFigure src={src} view={assessment.views![view]!} measurement={evidenceMeasurement(measurements, view)} label={lang === 'zh' ? VIEW_LABELS[view].zh : VIEW_LABELS[view].en} lang={lang} /></div>;
        })}
      </div>

      <div style={{ border: `1px solid ${REPORT.line}`, marginBottom: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: REPORT.navy, color: '#FFFFFF', padding: '9px 12px' }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: .7 }}>{lang === 'zh' ? '照片角度摘要' : 'IMAGE ANGLE SUMMARY'}</span>
          <span style={{ fontSize: 7.5, opacity: .8 }}>{lang === 'zh' ? '数值 · 方向 · 定位误差' : 'VALUE · DIRECTION · LOCALISATION ERROR'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(views.length, 1)}, 1fr)` }}>
          {views.map((view, viewIndex) => (
            <div key={view} style={{ padding: '11px 12px', borderLeft: viewIndex ? `1px solid ${REPORT.line}` : 0 }}>
              <p style={{ margin: 0, color: REPORT.blue, fontSize: 8, fontWeight: 850, letterSpacing: .7 }}>{lang === 'zh' ? VIEW_LABELS[view].zh : VIEW_LABELS[view].en}</p>
              {measurements.filter(item => item.view === view).slice(0, 3).map(item => (
                <div key={item.id} style={{ marginTop: 8, paddingTop: 7, borderTop: `1px solid ${REPORT.line}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: REPORT.ink, fontSize: 8.2, fontWeight: 750 }}>{lang === 'zh' ? item.name : item.nameEn}</span>
                    <span style={{ color: REPORT.navy, fontSize: 9, fontWeight: 850, whiteSpace: 'nowrap' }}>{item.value.toFixed(1)}{item.unit} ±{item.uncertainty.toFixed(1)}</span>
                  </div>
                  <p style={{ margin: '3px 0 0', color: REPORT.muted, fontSize: 7.1 }}>{item.direction}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', background: REPORT.pale, border: `1px solid ${REPORT.line}`, color: REPORT.muted, fontSize: 7.7 }}>
        <span><b style={{ color: '#3182CE' }}>●</b> {lang === 'zh' ? '模型节点' : 'Model landmark'}　<b style={{ color: '#2F9E72' }}>●</b> {lang === 'zh' ? '贴点/人工复核' : 'Marker/manual review'}　<b style={{ color: '#F59E0B' }}>●</b> {lang === 'zh' ? '当前测量线' : 'Primary measurement'}</span>
        <span>{assessment.protocolVersion} · {assessment.modelVersion}</span>
      </div>

      <ReportFooter studioName={studioName} page={2} date={assessment.date} />
    </div>
  );
};

export default PosturePage;
