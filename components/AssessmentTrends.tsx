/**
 * 体态评估历史趋势图 — 多评估折线对比
 */

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PostureAssessment, Language } from '../types';

interface AssessmentTrendsProps {
  assessments: PostureAssessment[];
  lang: Language;
}

const AssessmentTrends: React.FC<AssessmentTrendsProps> = ({ assessments, lang }) => {
  if (assessments.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 className="text-sm font-bold text-gray-800 mb-4">{lang === 'zh' ? '体态评估趋势' : 'Assessment Trends'}</h3>
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          {lang === 'zh' ? '暂无评估数据，完成首次体态评估后显示' : 'No assessment data yet'}
        </div>
      </div>
    );
  }

  const data = [...assessments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(a => ({ date: a.date.substring(5), score: a.report.score, confidence: Math.round(a.report.confidence * 100) }));

  const latest = data[data.length - 1];
  const first = data[0];
  const improved = latest.score > first.score;

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">{lang === 'zh' ? '体态评估趋势' : 'Assessment Trends'}</h3>
        {data.length >= 2 && (
          <div className={`flex items-center gap-1 text-[11px] font-semibold ${improved ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={improved ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
            </svg>
            <span>{improved ? '+' : ''}{(latest.score - first.score).toFixed(0)} pts</span>
          </div>
        )}
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
            <XAxis dataKey="date" stroke="#C7C7CC" tick={{ fill: '#8E8E93', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} stroke="#C7C7CC" tick={{ fill: '#8E8E93', fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} />
            <Line type="monotone" dataKey="score" stroke="#007AFF" strokeWidth={2.5}
              dot={{ fill: '#007AFF', stroke: '#fff', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, fill: '#007AFF', stroke: '#fff', strokeWidth: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AssessmentTrends;
