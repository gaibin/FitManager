/**
 * PDF 报告第1页 — 封面 + 会员概览 + 统计卡片 + 趋势图（Apple HIG 风格）
 */

import React from 'react';
import { Member, Language } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CoverPageProps { member: Member; lang: Language; studioName: string; studioLogo?: string; coachName?: string; accentColor?: string; }

const STYLE = {
  page: { width: 794, height: 1123, backgroundColor: '#ffffff', color: '#1D1D1F', padding: '60px 50px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', boxSizing: 'border-box' as const, display: 'flex', flexDirection: 'column' as const },
  header: { borderBottom: '1px solid #E5E5EA', paddingBottom: 15, marginBottom: 30 },
  headerText: { fontSize: 12, color: '#8E8E93', letterSpacing: 2, fontWeight: 500 },
  title: { fontSize: 36, fontWeight: 900, color: '#007AFF', margin: '0 0 8px 0', letterSpacing: -1 },
  accent: { width: 60, height: 3, background: 'linear-gradient(90deg, #007AFF, #5856D6)' },
  infoCard: { backgroundColor: '#F2F2F7', borderRadius: 16, padding: '20px 24px', marginBottom: 30 },
  infoLabel: { fontSize: 11, color: '#8E8E93', textTransform: 'uppercase' as const, fontWeight: 600 },
  infoValue: { fontSize: 18, fontWeight: 700, color: '#1D1D1F', margin: '4px 0 0 0' },
  statCard: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 16, padding: '20px', textAlign: 'center' as const },
  statLabel: { fontSize: 11, color: '#8E8E93', textTransform: 'uppercase' as const, letterSpacing: 1, fontWeight: 600 },
  statValue: { fontSize: 32, fontWeight: 800, margin: '8px 0 0 0', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1 },
  chartCard: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 16, padding: '20px 24px' },
  chartTitle: { fontSize: 14, fontWeight: 700, color: '#1D1D1F', margin: '0 0 16px 0' },
  footer: { borderTop: '1px solid #E5E5EA', paddingTop: 15, marginTop: 24, display: 'flex', justifyContent: 'space-between' as const },
  footerText: { fontSize: 11, color: '#8E8E93' },
};

const CoverPage: React.FC<CoverPageProps> = ({ member, lang, studioName, studioLogo, coachName, accentColor = '#007AFF' }) => {
  const monthlyCount = member.workouts.filter(w => w.date.startsWith(new Date().toISOString().slice(0, 7))).length || 0;
  const maxWeight = member.workouts.reduce((max, w) => w.weight > max ? w.weight : max, 0) || 0;
  const totalVolume = member.workouts.reduce((sum, w) => sum + (w.weight * w.sets * w.reps), 0) || 0;

  const now = new Date();
  const trendData: { month: string; volume: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    trendData.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, volume: Math.round(member.workouts.filter(w => w.date.startsWith(monthStr)).reduce((s, w) => s + w.weight * w.sets * w.reps, 0) / 100) / 10 });
  }

  const a = { color: accentColor };
  return (
    <div style={STYLE.page}>
      <div style={{ ...STYLE.header, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {studioLogo && <img src={studioLogo} style={{ width: 32, height: 32, borderRadius: 8 }} alt="Logo" />}
          <div>
            <span style={{ ...STYLE.headerText, fontWeight: 700, color: accentColor }}>{studioName}</span>
            {coachName && <span style={{ fontSize: 11, color: '#8E8E93', marginLeft: 8, fontWeight: 400 }}>{lang === 'zh' ? `教练: ${coachName}` : `Coach: ${coachName}`}</span>}
          </div>
        </div>
        <span style={{ fontSize: 11, color: '#C7C7CC' }}>{lang === 'zh' ? '机密' : 'CONFIDENTIAL'}</span>
      </div>
      <div style={{ marginBottom: 40 }}><h1 style={{ ...STYLE.title, color: accentColor }}>{lang === 'zh' ? '会员训练报告' : 'Member Training Report'}</h1><div style={{ ...STYLE.accent, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} /></div>
      <div style={STYLE.infoCard}>
        <div style={{ display: 'flex', gap: 60 }}>
          <div><span style={STYLE.infoLabel}>{lang === 'zh' ? '姓名' : 'Name'}</span><p style={STYLE.infoValue}>{member.name}</p></div>
          <div><span style={STYLE.infoLabel}>{lang === 'zh' ? '入会日期' : 'Join Date'}</span><p style={STYLE.infoValue}>{member.joinDate}</p></div>
          <div><span style={STYLE.infoLabel}>{lang === 'zh' ? '报告日期' : 'Report Date'}</span><p style={STYLE.infoValue}>{new Date().toISOString().split('T')[0]}</p></div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 30 }}>
        {[
          { label: lang === 'zh' ? '本月训练' : 'Monthly Sessions', value: monthlyCount, unit: lang === 'zh' ? '次' : 'sessions', color: '#007AFF' },
          { label: lang === 'zh' ? '最大重量' : 'Max Weight', value: maxWeight, unit: 'kg', color: '#FF2D55' },
          { label: lang === 'zh' ? '总容量' : 'Total Volume', value: (totalVolume / 1000).toFixed(1) + 'k', unit: 'kg', color: '#5856D6' },
        ].map((c, i) => (
          <div key={i} style={STYLE.statCard}><span style={STYLE.statLabel}>{c.label}</span><p style={{ ...STYLE.statValue, color: c.color }}>{c.value} <span style={{ fontSize: 14, color: '#8E8E93', marginLeft: 4 }}>{c.unit}</span></p></div>
        ))}
      </div>
      <div style={STYLE.chartCard}>
        <h3 style={STYLE.chartTitle}>{lang === 'zh' ? '训练容量趋势 (近 6 个月)' : 'Training Volume Trend (Last 6 Months)'}</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
            <XAxis dataKey="month" stroke="#C7C7CC" tick={{ fontSize: 11, fill: '#8E8E93' }} />
            <YAxis stroke="#C7C7CC" tick={{ fontSize: 11, fill: '#8E8E93' }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} />
            <Line type="monotone" dataKey="volume" stroke="#007AFF" strokeWidth={3} dot={{ fill: '#007AFF', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={STYLE.footer}><span style={STYLE.footerText}>{studioName}</span><span style={STYLE.footerText}>{lang === 'zh' ? '第 1 页' : 'Page 1'} / {new Date().toISOString().split('T')[0]}</span></div>
    </div>
  );
};

export default CoverPage;
