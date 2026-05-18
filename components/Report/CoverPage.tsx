/**
 * PDF 报告第1页 — 封面 + 会员概览 + 统计卡片 + 趋势图
 */

import React from 'react';
import { Member, Language } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CoverPageProps {
  member: Member;
  lang: Language;
  studioName: string;
}

const CoverPage: React.FC<CoverPageProps> = ({ member, lang, studioName }) => {
  const monthlyCount = member.workouts.filter(w => w.date.startsWith(new Date().toISOString().slice(0, 7))).length || 0;
  const maxWeight = member.workouts.reduce((max, w) => w.weight > max ? w.weight : max, 0) || 0;
  const totalVolume = member.workouts.reduce((sum, w) => sum + (w.weight * w.sets * w.reps), 0) || 0;

  // 生成最近6个月的趋势数据
  const now = new Date();
  const trendData: { month: string; volume: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    const vol = member.workouts
      .filter(w => w.date.startsWith(monthStr))
      .reduce((sum, w) => sum + (w.weight * w.sets * w.reps), 0);
    trendData.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      volume: Math.round(vol / 100) / 10,
    });
  }

  return (
    <div style={{
      width: 794, height: 1123, backgroundColor: '#09090b', color: '#f4f4f5',
      padding: '60px 50px', fontFamily: 'system-ui, sans-serif',
      boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
    }}>
      {/* 页眉 */}
      <div style={{ borderBottom: '1px solid #27272a', paddingBottom: 15, marginBottom: 30 }}>
        <span style={{ fontSize: 12, color: '#52525b', letterSpacing: 2 }}>
          {studioName}
        </span>
      </div>

      {/* 标题 */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontSize: 36, fontWeight: 900, color: '#a3e635',
          margin: '0 0 8px 0', letterSpacing: -1,
        }}>
          {lang === 'zh' ? '会员训练报告' : 'Member Training Report'}
        </h1>
        <div style={{ width: 60, height: 3, backgroundColor: '#a3e635' }} />
      </div>

      {/* 会员信息 */}
      <div style={{
        backgroundColor: '#18181b', borderRadius: 12, padding: '20px 24px',
        marginBottom: 30, border: '1px solid #27272a',
      }}>
        <div style={{ display: 'flex', gap: 60 }}>
          <div>
            <span style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase' }}>
              {lang === 'zh' ? '姓名' : 'Name'}
            </span>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '4px 0 0 0' }}>{member.name}</p>
          </div>
          <div>
            <span style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase' }}>
              {lang === 'zh' ? '入会日期' : 'Join Date'}
            </span>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '4px 0 0 0' }}>{member.joinDate}</p>
          </div>
          <div>
            <span style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase' }}>
              {lang === 'zh' ? '报告日期' : 'Report Date'}
            </span>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '4px 0 0 0' }}>
              {new Date().toISOString().split('T')[0]}
            </p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 30 }}>
        {[
          { label: lang === 'zh' ? '本月训练' : 'Monthly Sessions', value: monthlyCount, unit: lang === 'zh' ? '次' : 'sessions', color: '#a3e635' },
          { label: lang === 'zh' ? '最大重量' : 'Max Weight', value: maxWeight, unit: 'kg', color: '#3b82f6' },
          { label: lang === 'zh' ? '总容量' : 'Total Volume', value: (totalVolume / 1000).toFixed(1) + 'k', unit: 'kg', color: '#f43f5e' },
        ].map((card, idx) => (
          <div key={idx} style={{
            flex: 1, backgroundColor: '#18181b', borderRadius: 12,
            padding: '20px', border: '1px solid #27272a', textAlign: 'center',
          }}>
            <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: 1 }}>
              {card.label}
            </span>
            <p style={{ fontSize: 32, fontWeight: 800, color: card.color, margin: '8px 0 0 0' }}>
              {card.value}
              <span style={{ fontSize: 14, color: '#71717a', marginLeft: 4 }}>{card.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 趋势图 */}
      <div style={{ flex: 1, backgroundColor: '#18181b', borderRadius: 12, padding: '20px 24px', border: '1px solid #27272a' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 16px 0' }}>
          {lang === 'zh' ? '训练容量趋势 (近6个月)' : 'Training Volume Trend (Last 6 Months)'}
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="month" stroke="#52525b" tick={{ fontSize: 11, fill: '#71717a' }} />
            <YAxis stroke="#52525b" tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8 }} />
            <Line type="monotone" dataKey="volume" stroke="#a3e635" strokeWidth={3} dot={{ fill: '#a3e635', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 页脚 */}
      <div style={{ borderTop: '1px solid #27272a', paddingTop: 15, marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#52525b' }}>{studioName}</span>
        <span style={{ fontSize: 11, color: '#52525b' }}>
          {lang === 'zh' ? '第 1 页' : 'Page 1'} / {new Date().toISOString().split('T')[0]}
        </span>
      </div>
    </div>
  );
};

export default CoverPage;
