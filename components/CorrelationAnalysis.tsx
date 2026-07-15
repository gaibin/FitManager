/** Descriptive training log shown alongside posture change; no causal claims. */

import React from 'react';
import type { Language, Member } from '../types';
import { buildPostureSeries } from '../services/postureSeries';
import { isWorkoutCompleted } from '../services/workoutAnalytics';

interface CorrelationAnalysisProps {
  member: Member;
  lang: Language;
}

const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({ member, lang }) => {
  const series = buildPostureSeries(member.assessments ?? []);
  if (series.points.length < 2) return null;

  const first = series.points[0];
  const latest = series.points[series.points.length - 1];
  const delta = latest.value - first.value;
  const periodWorkouts = member.workouts.filter(
    workout => workout.date >= first.date && workout.date <= latest.date,
  );
  const exerciseStats: Record<string, { dates: Set<string>; volume: number }> = {};
  periodWorkouts.forEach(workout => {
    if (!isWorkoutCompleted(workout)) return;
    const stats = exerciseStats[workout.exercise] ?? { dates: new Set<string>(), volume: 0 };
    stats.dates.add(workout.date);
    stats.volume += workout.weight * workout.sets * workout.reps;
    exerciseStats[workout.exercise] = stats;
  });
  const topExercises = Object.entries(exerciseStats)
    .sort((a, b) => b[1].dates.size - a[1].dates.size || b[1].volume - a[1].volume)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800">
            {lang === 'zh' ? '同期训练记录（描述性）' : 'Concurrent Training Log (descriptive)'}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">
            {lang === 'zh'
              ? '仅展示同一时期发生的变化，不代表训练动作导致体态变化。'
              : 'Changes occurred in the same period; this does not establish causation.'}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${delta >= 0 ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(0)} {series.version === 'v2' ? (lang === 'zh' ? '趋势点' : 'trend pts') : 'pts'}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mb-3">{first.date} → {latest.date}</p>
      {topExercises.length > 0 ? (
        <div className="space-y-1.5">
          {topExercises.map(([exercise, stats], index) => (
            <div key={exercise} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-300 w-4">{index + 1}</span>
              <span className="text-xs font-semibold text-gray-800 flex-1 truncate">{exercise}</span>
              <span className="text-[10px] text-gray-400">
                {stats.dates.size}{lang === 'zh' ? ' 次' : ' sessions'}
                {stats.volume > 0 ? ` · ${(stats.volume / 1000).toFixed(1)}k kg` : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">{lang === 'zh' ? '该区间没有训练记录。' : 'No workouts recorded in this interval.'}</p>
      )}
    </div>
  );
};

export default CorrelationAnalysis;
