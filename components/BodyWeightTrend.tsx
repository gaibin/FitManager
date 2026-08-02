import React, { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Language, Member } from '../types';
import { buildBodyWeightTrend } from '../services/bodyWeightAnalytics';

const BodyWeightTrend: React.FC<{ member: Member; lang: Language }> = ({ member, lang }) => {
  const data = useMemo(
    () => buildBodyWeightTrend(member.workouts, member.weightKg, member.joinDate),
    [member.joinDate, member.weightKg, member.workouts],
  );
  if (!data.length) return null;
  const latest = data.at(-1)!;
  const first = data[0];
  const change = latest.weightKg - first.weightKg;

  return (
    <section className="rounded-2xl bg-white p-4 sm:p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">BODY WEIGHT</p>
          <h3 className="mt-1 text-sm font-bold text-gray-800">{lang === 'zh' ? '体重趋势' : 'Body-weight trend'}</h3>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-gray-900">{latest.weightKg.toFixed(1)} <small className="text-xs text-gray-400">kg</small></p>
          {data.length > 1 && <p className={`text-[10px] font-semibold ${change > 0 ? 'text-[#FF9500]' : change < 0 ? 'text-[#34C759]' : 'text-gray-400'}`}>{change > 0 ? '+' : ''}{change.toFixed(1)} kg</p>}
        </div>
      </div>
      <div className="h-44 sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#EEF1F5" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={value => String(value).slice(5)} />
            <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={42} />
            <Tooltip formatter={(value: number | string) => [`${Number(value).toFixed(1)} kg`, lang === 'zh' ? '体重' : 'Weight']} labelFormatter={label => String(label)} />
            <Line type="monotone" dataKey="weightKg" stroke="#34C759" strokeWidth={2.5} dot={{ r: 3, fill: '#FFFFFF', strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-gray-400">{lang === 'zh' ? '训练日体重独立于动作负重；同一天只保留一个体重趋势点。' : 'Body weight is separate from exercise load; one trend point is kept per date.'}</p>
    </section>
  );
};

export default BodyWeightTrend;
