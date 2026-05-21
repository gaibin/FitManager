import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Workout, Language } from '../types';
import { TRANSLATIONS } from '../constants';

const EXERCISE_COLORS: string[] = [
  '#007AFF', '#5856D6', '#FF2D55', '#34C759', '#FF9500',
  '#5AC8FA', '#AF52DE', '#FF3B30', '#00C7BE', '#8E8E93',
  '#64D2FF', '#30D158', '#FFD60A', '#BF5AF2', '#FF375F',
];

interface HistoryChartProps {
  workouts: Workout[];
  lang: Language;
}

type MetricType = 'weight' | 'volume';

const HistoryChart: React.FC<HistoryChartProps> = ({ workouts, lang }) => {
  const [metric, setMetric] = useState<MetricType>('weight');
  const [visibleExercises, setVisibleExercises] = useState<string[]>([]);

  const availableExercises = useMemo(() => {
    const set = new Set<string>();
    workouts.forEach(w => { if (w.weight > 0) set.add(w.exercise); });
    return Array.from(set).sort();
  }, [workouts]);

  React.useEffect(() => {
    if (availableExercises.length > 0 && visibleExercises.length === 0) {
      setVisibleExercises(availableExercises.slice(0, 4));
    }
  }, [availableExercises]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    availableExercises.forEach((ex, i) => { map[ex] = EXERCISE_COLORS[i % EXERCISE_COLORS.length]; });
    return map;
  }, [availableExercises]);

  const chartData = useMemo(() => {
    const map: Record<string, any> = {};
    workouts.forEach(w => {
      if (w.weight <= 0) return;
      const dateStr = w.date.substring(5);
      if (!map[dateStr]) map[dateStr] = { date: dateStr, fullDate: w.date };
      let val = metric === 'weight' ? w.weight : w.weight * w.sets * w.reps;
      if (metric === 'weight') {
        if (map[dateStr][w.exercise]) val = Math.max(map[dateStr][w.exercise], w.weight);
      } else {
        val = (map[dateStr][w.exercise] || 0) + val;
      }
      map[dateStr][w.exercise] = val;
    });
    return Object.values(map).sort((a: any, b: any) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [workouts, metric]);

  const toggleExercise = (ex: string) => {
    setVisibleExercises(prev => prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]);
  };

  if (availableExercises.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        No tracked data available
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #007AFF, #5856D6)' }} />
          {TRANSLATIONS.history[lang]}
        </h3>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setMetric('weight')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              metric === 'weight' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {TRANSLATIONS.metricWeight[lang]}
          </button>
          <button onClick={() => setMetric('volume')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              metric === 'volume' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {TRANSLATIONS.metricVolume[lang]}
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {availableExercises.map(ex => {
          const color = colorMap[ex];
          const active = visibleExercises.includes(ex);
          return (
            <button key={ex} onClick={() => toggleExercise(ex)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                active ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'
              }`}
              style={{ backgroundColor: active ? `${color}14` : 'transparent' }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active ? color : '#D1D1D6' }} />
              {ex}
            </button>
          );
        })}
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
            <XAxis dataKey="date" stroke="#C7C7CC" tick={{ fill: '#8E8E93', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#C7C7CC" tick={{ fill: '#8E8E93', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
              itemStyle={{ color: '#1D1D1F', fontSize: 12 }}
              labelStyle={{ color: '#8E8E93', marginBottom: 6, fontSize: 11 }}
              cursor={{ stroke: '#E5E5EA', strokeWidth: 1 }}
            />
            <Legend wrapperStyle={{ paddingTop: 10 }} iconType="circle" iconSize={8} />
            {visibleExercises.map(ex => (
              <Line key={ex} connectNulls type="monotone" dataKey={ex} name={ex}
                stroke={colorMap[ex]} strokeWidth={2.5}
                dot={{ fill: '#fff', stroke: colorMap[ex], strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, fill: colorMap[ex], stroke: '#fff', strokeWidth: 2 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HistoryChart;
