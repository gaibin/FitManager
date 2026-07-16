import React, { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Language, Workout } from '../types';
import { TRANSLATIONS } from '../constants';
import {
  buildWorkoutChartData,
  getAvailableExercises,
  getWorkoutSummary,
  type WorkoutChartMetric,
} from '../services/workoutAnalytics';

const EXERCISE_COLORS = [
  '#007AFF', '#5856D6', '#FF2D55', '#34C759', '#FF9500',
  '#5AC8FA', '#AF52DE', '#FF3B30', '#00C7BE', '#8E8E93',
];

interface HistoryChartProps {
  workouts: Workout[];
  lang: Language;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ workouts, lang }) => {
  const [metric, setMetric] = useState<WorkoutChartMetric>(() =>
    workouts.some(workout => workout.weight > 0) ? 'weight' : 'sets',
  );
  const [visibleExercises, setVisibleExercises] = useState<string[]>([]);

  const availableExercises = useMemo(
    () => getAvailableExercises(workouts, metric),
    [metric, workouts],
  );
  const availableKey = availableExercises.join('\u0000');

  useEffect(() => {
    setVisibleExercises(previous => {
      const retained = previous.filter(exercise => availableExercises.includes(exercise));
      return retained.length > 0 ? retained : availableExercises.slice(0, 4);
    });
  }, [availableKey]);

  const colorMap = useMemo(() => Object.fromEntries(
    availableExercises.map((exercise, index) => [exercise, EXERCISE_COLORS[index % EXERCISE_COLORS.length]]),
  ), [availableKey]);
  const chartData = useMemo(() => buildWorkoutChartData(workouts, metric), [metric, workouts]);
  const summary = useMemo(() => getWorkoutSummary(workouts), [workouts]);

  const metricConfig: Record<WorkoutChartMetric, { label: string; unit: string }> = {
    weight: { label: TRANSLATIONS.metricWeight[lang], unit: 'kg' },
    volume: { label: TRANSLATIONS.metricVolume[lang], unit: 'kg' },
    sets: { label: lang === 'zh' ? '完成组数' : 'Completed sets', unit: lang === 'zh' ? '组' : 'sets' },
  };

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border border-gray-100 text-gray-400" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <svg className="w-8 h-8 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.5" d="M4 19V9m5 10V5m5 14v-7m5 7V3" /></svg>
        <span className="text-sm">{lang === 'zh' ? '暂无训练趋势，保存首次记录后显示' : 'No training trend yet'}</span>
      </div>
    );
  }

  const toggleExercise = (exercise: string) => {
    setVisibleExercises(previous => previous.includes(exercise)
      ? previous.filter(item => item !== exercise)
      : [...previous, exercise]);
  };

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-5 gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-[#007AFF] to-[#5856D6]" />
            {TRANSLATIONS.history[lang]}
          </h3>
          <p className="text-xs text-gray-400 mt-1 ml-3">
            {summary.sessionCount} {lang === 'zh' ? '次训练 · ' : 'sessions · '}
            {summary.completedSets} {lang === 'zh' ? '个完成组' : 'completed sets'}
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 self-start">
          {(Object.keys(metricConfig) as WorkoutChartMetric[]).map(item => (
            <button key={item} onClick={() => setMetric(item)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                metric === item ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {metricConfig[item].label}
            </button>
          ))}
        </div>
      </div>

      {availableExercises.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {availableExercises.map(exercise => {
            const color = colorMap[exercise];
            const active = visibleExercises.includes(exercise);
            return (
              <button key={exercise} onClick={() => toggleExercise(exercise)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${active ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                style={{ backgroundColor: active ? `${color}14` : 'transparent' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active ? color : '#D1D1D6' }} />
                {exercise}
              </button>
            );
          })}
        </div>
      )}

      {chartData.length === 0 || availableExercises.length === 0 ? (
        <div className="h-[260px] rounded-xl bg-gray-50 flex items-center justify-center text-sm text-gray-400 text-center px-6">
          {metric === 'sets'
            ? (lang === 'zh' ? '暂无已完成的训练组数' : 'No completed sets yet')
            : (lang === 'zh' ? '当前动作没有负重数据，请切换到“完成组数”查看体态训练。' : 'No loaded data. Use Completed sets for posture exercises.')}
        </div>
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6E6E73', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={{ fill: '#6E6E73', fontSize: 11 }} tickLine={false} axisLine={false} width={44}
                domain={metric === 'weight' ? ['dataMin - 5', 'dataMax + 5'] : [0, 'auto']}
                tickFormatter={value => Number(value).toLocaleString()} />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `${Number(value).toLocaleString()} ${metricConfig[metric].unit}`,
                  name,
                ]}
                labelFormatter={(_label: any, payload: any[]) => payload?.[0]?.payload?.fullDate || _label}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                itemStyle={{ color: '#1D1D1F', fontSize: 12 }}
                labelStyle={{ color: '#6E6E73', marginBottom: 6, fontSize: 11 }}
                cursor={{ stroke: '#D1D1D6', strokeWidth: 1 }}
              />
              {visibleExercises.map(exercise => (
                <Line key={exercise} type="monotone" dataKey={exercise} name={exercise}
                  stroke={colorMap[exercise]} strokeWidth={2.5} connectNulls
                  dot={{ fill: '#fff', stroke: colorMap[exercise], strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: colorMap[exercise], stroke: '#fff', strokeWidth: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default HistoryChart;
