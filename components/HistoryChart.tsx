import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Workout, Language, CHART_COLORS } from '../types';
import { TRANSLATIONS } from '../constants';

interface HistoryChartProps {
  workouts: Workout[];
  lang: Language;
}

type MetricType = 'weight' | 'volume';

const HistoryChart: React.FC<HistoryChartProps> = ({ workouts, lang }) => {
  const [metric, setMetric] = useState<MetricType>('weight');
  const [visibleExercises, setVisibleExercises] = useState<string[]>([]);

  // 1. Extract Unique Exercises
  const availableExercises = useMemo(() => {
    const exercises = new Set<string>();
    workouts.forEach(w => {
      if (w.weight > 0) exercises.add(w.exercise);
    });
    return Array.from(exercises).sort();
  }, [workouts]);

  // Default selection
  React.useEffect(() => {
    if (availableExercises.length > 0 && visibleExercises.length === 0) {
      // Select top 3 by frequency by default, or just first 2
      setVisibleExercises(availableExercises.slice(0, 3));
    }
  }, [availableExercises]);

  // Create a stable color map for exercise names
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    availableExercises.forEach((ex, idx) => {
      map[ex] = CHART_COLORS[idx % CHART_COLORS.length];
    });
    return map;
  }, [availableExercises]);

  // 2. Prepare Chart Data
  const chartData = useMemo(() => {
    const dataByDate: Record<string, any> = {};

    workouts.forEach(w => {
      if (w.weight <= 0) return;
      // Use shorter date for X-Axis
      const dateStr = w.date.substring(5); // MM-DD
      
      if (!dataByDate[dateStr]) {
        dataByDate[dateStr] = { date: dateStr, fullDate: w.date };
      }

      let val = 0;
      if (metric === 'weight') {
        val = w.weight;
        if (dataByDate[dateStr][w.exercise]) {
           val = Math.max(dataByDate[dateStr][w.exercise], w.weight);
        }
      } else {
        // Volume
        val = w.weight * w.sets * w.reps;
        const current = dataByDate[dateStr][w.exercise] || 0;
        val = current + val;
      }

      dataByDate[dateStr][w.exercise] = val;
    });

    return Object.values(dataByDate).sort((a: any, b: any) => 
      new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
    );
  }, [workouts, metric]);

  const toggleExercise = (ex: string) => {
    setVisibleExercises(prev => 
      prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]
    );
  };

  if (availableExercises.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-zinc-900 rounded-2xl border border-zinc-800 text-zinc-500">
        No tracked data available
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-bold text-zinc-100 flex items-center">
            <span className="w-1 h-6 bg-lime-500 rounded-full mr-3"></span>
            {TRANSLATIONS.history[lang]}
        </h3>
        
        {/* Metric Toggle */}
        <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
          <button
            onClick={() => setMetric('weight')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              metric === 'weight' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {TRANSLATIONS.metricWeight[lang]}
          </button>
          <button
            onClick={() => setMetric('volume')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              metric === 'volume' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {TRANSLATIONS.metricVolume[lang]}
          </button>
        </div>
      </div>

      {/* Exercise Filter Chips - Strictly Matching Colors */}
      <div className="mb-6 flex flex-wrap gap-2">
         {availableExercises.map((ex) => {
           const color = colorMap[ex];
           const isActive = visibleExercises.includes(ex);
           return (
             <button
               key={ex}
               onClick={() => toggleExercise(ex)}
               className={`px-3 py-1 rounded-full text-xs border transition-all duration-200 flex items-center space-x-1 ${
                 isActive
                   ? 'bg-zinc-800 text-zinc-100'
                   : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700'
               }`}
               style={{
                 borderColor: isActive ? color : undefined,
                 borderWidth: isActive ? '1px' : '1px',
               }}
             >
               <span 
                  className="w-2 h-2 rounded-full mr-2" 
                  style={{ backgroundColor: isActive ? color : '#52525b' }}
               ></span>
               <span>{ex}</span>
             </button>
           );
         })}
      </div>
      
      {/* Chart */}
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#71717a" 
              tick={{ fill: '#71717a', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#71717a" 
              tick={{ fill: '#71717a', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
              itemStyle={{ color: '#e4e4e7', fontSize: '12px' }}
              labelStyle={{ color: '#a1a1aa', marginBottom: '5px' }}
              cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
            
            {visibleExercises.map((ex) => (
              <Line
                key={ex}
                connectNulls
                type="monotone"
                dataKey={ex}
                name={ex}
                stroke={colorMap[ex]}
                strokeWidth={3}
                dot={{ fill: '#09090b', stroke: colorMap[ex], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: colorMap[ex], stroke: '#fff', strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HistoryChart;