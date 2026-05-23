/**
 * 训练-体态关联分析 — 分析哪些动作与体态改善相关
 */

import React from 'react';
import { Member, Language } from '../types';

interface CorrelationAnalysisProps { member: Member; lang: Language; }

const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({ member, lang }) => {
  const assessments = member.assessments || [];
  if (assessments.length < 2) {
    return (
      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 className="text-sm font-bold text-gray-800 mb-3">{lang === 'zh' ? '训练-体态关联' : 'Training × Posture'}</h3>
        <p className="text-xs text-gray-400">{lang === 'zh' ? '需要至少 2 次体态评估才能分析' : 'At least 2 assessments needed'}</p>
      </div>
    );
  }

  // Sort assessments by date
  const sorted = [...assessments].sort((a, b) => a.date.localeCompare(b.date));
  const improved = sorted[sorted.length - 1].report.score > sorted[0].report.score;
  const delta = (sorted[sorted.length - 1].report.score - sorted[0].report.score).toFixed(0);

  // Analyze exercises between assessments
  const exerciseStats: Record<string, { count: number; volume: number; sets: number }> = {};
  for (let i = 1; i < sorted.length; i++) {
    const periodWorkouts = member.workouts.filter(
      w => w.date >= sorted[i - 1].date && w.date <= sorted[i].date
    );
    periodWorkouts.forEach(w => {
      if (!exerciseStats[w.exercise]) exerciseStats[w.exercise] = { count: 0, volume: 0, sets: 0 };
      exerciseStats[w.exercise].count++;
      exerciseStats[w.exercise].volume += w.weight * w.sets * w.reps;
      exerciseStats[w.exercise].sets += w.sets;
    });
  }

  const topExercises = Object.entries(exerciseStats)
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h3 className="text-sm font-bold text-gray-800 mb-2">{lang === 'zh' ? '训练-体态关联' : 'Training × Posture'}</h3>
      <div className="flex items-center gap-3 mb-4">
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${improved ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
          {improved ? '↑' : '↓'} {delta} pts
        </div>
        <span className="text-[10px] text-gray-400">{sorted[0].date} → {sorted[sorted.length - 1].date}</span>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-2">{lang === 'zh' ? '期间主要训练' : 'Key Exercises'}</p>
        {topExercises.map(([ex, stats], i) => (
          <div key={ex} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-300 w-4">{i + 1}</span>
            <span className="text-xs font-semibold text-gray-800 flex-1 truncate">{ex}</span>
            <span className="text-[10px] text-gray-400">{stats.count}x · {(stats.volume / 1000).toFixed(1)}k</span>
          </div>
        ))}
      </div>

      {improved && (
        <p className="text-[10px] text-[#34C759] mt-3 bg-[#34C759]/5 rounded-lg p-2.5 leading-relaxed">
          {lang === 'zh'
            ? `体态改善 ${delta} 分。期间主要训练${topExercises[0]?.[0] || 'N/A'}等动作，建议继续保持该方向。`
            : `Posture improved by ${delta} pts. Continue focusing on ${topExercises[0]?.[0] || 'key exercises'}.`}
        </p>
      )}
    </div>
  );
};

export default CorrelationAnalysis;
