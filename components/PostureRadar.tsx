/**
 * 身体对称性雷达图 — 左右侧指标对比
 */

import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';

interface PostureRadarProps {
  issues: { name: string; nameEn: string; value: number; severity: string }[];
  lang: string;
}

const PostureRadar: React.FC<PostureRadarProps> = ({ issues, lang }) => {
  if (issues.length === 0) return null;

  const data = issues.map(i => ({
    name: lang === 'zh' ? i.name : i.nameEn,
    value: Math.min(100, Math.round((i.value / 90) * 100)), // normalize to 0-100
    threshold: i.severity === '严重' ? 80 : i.severity === '中度' ? 60 : 30,
  }));

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h3 className="text-sm font-bold text-gray-800 mb-2">{lang === 'zh' ? '对称性分析' : 'Symmetry Radar'}</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#E5E5EA" />
            <PolarAngleAxis dataKey="name" tick={{ fill: '#8E8E93', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#8E8E93', fontSize: 9 }} />
            <Radar name={lang === 'zh' ? '当前值' : 'Current'} dataKey="value" stroke="#007AFF" fill="#007AFF" fillOpacity={0.15} strokeWidth={2} />
            <Radar name={lang === 'zh' ? '警戒线' : 'Alert'} dataKey="threshold" stroke="#FF3B30" fill="#FF3B30" fillOpacity={0.05} strokeWidth={1} strokeDasharray="4 4" />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PostureRadar;
