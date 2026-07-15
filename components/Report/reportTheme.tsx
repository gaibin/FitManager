import type React from 'react';

export const REPORT = {
  width: 794,
  height: 1123,
  padX: 48,
  padTop: 42,
  ink: '#172033',
  navy: '#17365D',
  blue: '#245EA8',
  cyan: '#2C7A8A',
  green: '#2F7D5B',
  amber: '#A56817',
  red: '#A43C3C',
  muted: '#657186',
  pale: '#F4F7FA',
  line: '#D8E0E8',
};

export const reportPageStyle: React.CSSProperties = {
  width: REPORT.width,
  height: REPORT.height,
  boxSizing: 'border-box',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  color: REPORT.ink,
  padding: `${REPORT.padTop}px ${REPORT.padX}px 34px`,
  fontFamily: 'Inter, "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif',
  display: 'flex',
  flexDirection: 'column',
};

export const sectionLabelStyle: React.CSSProperties = {
  margin: 0,
  color: REPORT.blue,
  fontSize: 10,
  lineHeight: 1.2,
  fontWeight: 800,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
};

export const titleStyle: React.CSSProperties = {
  margin: '6px 0 0',
  color: REPORT.ink,
  fontSize: 26,
  lineHeight: 1.2,
  fontWeight: 800,
  letterSpacing: -0.4,
};

export function ReportHeader({ studioName, section, title, subtitle }: {
  studioName: string;
  section: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header style={{ borderBottom: `1px solid ${REPORT.line}`, paddingBottom: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
        <span style={{ color: REPORT.navy, fontSize: 10, fontWeight: 800, letterSpacing: 1.3 }}>{studioName}</span>
        <span style={{ color: REPORT.muted, fontSize: 9, letterSpacing: 1 }}>POSTURE & TRAINING SCIENCE REPORT</span>
      </div>
      <p style={sectionLabelStyle}>{section}</p>
      <h2 style={titleStyle}>{title}</h2>
      {subtitle && <p style={{ margin: '7px 0 0', color: REPORT.muted, fontSize: 10.5, lineHeight: 1.45 }}>{subtitle}</p>}
    </header>
  );
}

export function ReportFooter({ studioName, page, date }: { studioName: string; page: number; date: string }) {
  return (
    <footer style={{ borderTop: `1px solid ${REPORT.line}`, paddingTop: 11, marginTop: 'auto', display: 'flex', justifyContent: 'space-between', color: REPORT.muted, fontSize: 9 }}>
      <span>{studioName} · Confidential member report</span>
      <span>{String(page).padStart(2, '0')} / {date}</span>
    </footer>
  );
}

export function MetricPill({ label, value, tone = 'blue' }: { label: string; value: string; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
  const color = tone === 'green' ? REPORT.green : tone === 'amber' ? REPORT.amber : tone === 'red' ? REPORT.red : REPORT.blue;
  return (
    <div style={{ border: `1px solid ${REPORT.line}`, borderTop: `3px solid ${color}`, background: '#FFFFFF', padding: '10px 12px', minWidth: 0 }}>
      <p style={{ margin: 0, color: REPORT.muted, fontSize: 8.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '5px 0 0', color: REPORT.ink, fontSize: 15, lineHeight: 1.1, fontWeight: 800 }}>{value}</p>
    </div>
  );
}
