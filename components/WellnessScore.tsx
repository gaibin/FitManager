/**
 * 个人健康指数组件 — 加权综合评分
 */

import React from 'react';
import type { WellnessScore } from '../types';
import { Language } from '../types';

interface WellnessScoreProps { score: WellnessScore; lang: Language; }

function arcPath(r: number, percent: number) {
  const a = (percent / 100) * 2 * Math.PI - Math.PI / 2;
  const x = 50 + r * Math.cos(a);
  const y = 50 + r * Math.sin(a);
  return `M 50 ${50 - r} A ${r} ${r} 0 ${percent > 50 ? 1 : 0} 1 ${x} ${y}`;
}

const WellnessScore: React.FC<WellnessScoreProps> = ({ score, lang }) => {
  const color = score.total >= 75 ? '#34C759' : score.total >= 50 ? '#FF9500' : '#FF3B30';

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h3 className="text-sm font-bold text-gray-800 mb-4">{lang === 'zh' ? '健康指数' : 'Wellness Score'}</h3>

      <div className="flex items-center gap-5 mb-5">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#F2F2F7" strokeWidth="8" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 40 * score.total / 100} ${2 * Math.PI * 40}`}
              style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.25,0.1,0.25,1)' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-extrabold text-gray-800">{score.total}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {[
            { label: lang === 'zh' ? '体态' : 'Posture', v: score.posture, c: '#007AFF' },
            { label: lang === 'zh' ? '出勤' : 'Consistency', v: score.consistency, c: '#5856D6' },
            { label: lang === 'zh' ? '进步' : 'Progress', v: score.progress, c: '#34C759' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-500 w-10 shrink-0">{item.label}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.v}%`, backgroundColor: item.c }} />
              </div>
              <span className="text-[10px] font-bold text-gray-600 w-7 text-right">{item.v}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 text-center">
        {lang === 'zh' ? '综合评分 = 体态×40% + 出勤×30% + 进步×30%' : 'Total = Posture×40% + Consistency×30% + Progress×30%'}
      </p>
    </div>
  );
};

export default WellnessScore;
