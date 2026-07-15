import React, { useMemo } from 'react';
import type { Language, PostureLandmark, PostureMeasurement, PostureViewResult } from '../../types';
import { REPORT } from './reportTheme';

const CONNECTIONS: [string, string][] = [
  ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
];

function midpoint(a?: PostureLandmark, b?: PostureLandmark): PostureLandmark | undefined {
  if (!a || !b) return undefined;
  return { ...a, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, confidence: Math.min(a.confidence, b.confidence) };
}

function resolvePoint(name: string, points: Record<string, PostureLandmark>) {
  if (points[name]) return points[name];
  if (name === 'hip_mid') return midpoint(points.left_asis || points.left_hip, points.right_asis || points.right_hip);
  if (name === 'shoulder_mid') return midpoint(points.left_acromion || points.left_shoulder, points.right_acromion || points.right_shoulder);
  if (name === 'psis_mid') return midpoint(points.left_psis || points.left_hip, points.right_psis || points.right_hip);
  return undefined;
}

export default function ReportEvidenceFigure({ src, view, label, measurement, lang }: {
  src: string;
  view: PostureViewResult;
  label: string;
  measurement?: PostureMeasurement;
  lang: Language;
}) {
  const width = view.coordinateTransform?.image_width || 1000;
  const height = view.coordinateTransform?.image_height || 1500;
  const points = useMemo(() => ({ ...view.landmarks, ...view.markers }), [view]);
  const active = new Set(measurement?.landmarkIds || []);
  const evidencePoints = (measurement?.landmarkIds || []).map(name => resolvePoint(name, points)).filter(Boolean) as PostureLandmark[];

  return (
    <figure style={{ margin: 0, minWidth: 0 }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${width} / ${height}`, maxHeight: 340, overflow: 'hidden', background: '#101827', border: `1px solid ${REPORT.line}` }}>
        <img src={src} alt={`${label} evidence`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {CONNECTIONS.map(([a, b]) => {
            if (!points[a] || !points[b]) return null;
            const selected = active.has(a) || active.has(b);
            return <line key={`${a}-${b}`} x1={points[a].x * width} y1={points[a].y * height} x2={points[b].x * width} y2={points[b].y * height}
              stroke={selected ? '#F59E0B' : '#55B7D9'} strokeWidth={selected ? 5 : 2.5} vectorEffect="non-scaling-stroke" opacity={0.92} />;
          })}
          {evidencePoints.length >= 2 && (
            <line x1={evidencePoints[0].x * width} y1={evidencePoints[0].y * height}
              x2={evidencePoints[1].x * width} y2={evidencePoints[1].y * height}
              stroke="#F59E0B" strokeWidth={6} vectorEffect="non-scaling-stroke" />
          )}
          {(Object.entries(points) as [string, PostureLandmark][]).map(([name, point]) => (
            <circle key={name} cx={point.x * width} cy={point.y * height} r={active.has(name) ? 8 : point.source === 'pose' ? 4 : 6}
              fill={active.has(name) ? '#F59E0B' : point.source === 'pose' ? '#3182CE' : '#2F9E72'} stroke="#FFFFFF" strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={point.visibility < 0.5 ? 0.35 : 0.95} />
          ))}
        </svg>
        <span style={{ position: 'absolute', top: 8, left: 8, padding: '4px 7px', background: 'rgba(10,18,30,.72)', color: '#FFFFFF', fontSize: 8, fontWeight: 800, letterSpacing: 0.8 }}>{label}</span>
      </div>
      <figcaption style={{ border: `1px solid ${REPORT.line}`, borderTop: 0, padding: '8px 9px', minHeight: 42, background: '#FFFFFF' }}>
        {measurement ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 5 }}>
              <span style={{ color: REPORT.ink, fontSize: 9, fontWeight: 750 }}>{lang === 'zh' ? measurement.name : measurement.nameEn}</span>
              <span style={{ color: REPORT.blue, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>{measurement.value.toFixed(1)}{measurement.unit} ± {measurement.uncertainty.toFixed(1)}</span>
            </div>
            <p style={{ margin: '3px 0 0', color: REPORT.muted, fontSize: 7.5, lineHeight: 1.3 }}>{measurement.direction}</p>
          </>
        ) : <span style={{ color: REPORT.muted, fontSize: 8 }}>{lang === 'zh' ? '节点证据图' : 'Landmark evidence image'}</span>}
      </figcaption>
    </figure>
  );
}

