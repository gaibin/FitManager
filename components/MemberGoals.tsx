/**
 * 会员课程目标追踪 — 设定目标 + 进度条 + 到期提醒
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Language, MemberGoal, Member } from '../types';
import { db } from '../services/localDatabase';

interface MemberGoalsProps {
  lang: Language;
  member: Member;
}

function progressPercent(goal: MemberGoal): number {
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}

function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
}

const GOAL_TYPES: { key: MemberGoal['type']; labelEn: string; labelZh: string; unit: string }[] = [
  { key: 'posture', labelEn: 'Posture Score', labelZh: '体态评分', unit: 'pts' },
  { key: 'strength', labelEn: 'Strength', labelZh: '力量', unit: 'kg' },
  { key: 'weight', labelEn: 'Weight', labelZh: '体重', unit: 'kg' },
  { key: 'attendance', labelEn: 'Attendance', labelZh: '出勤', unit: 'sessions' },
];

const MemberGoals: React.FC<MemberGoalsProps> = ({ lang, member }) => {
  const [goals, setGoals] = useState<MemberGoal[]>([]);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<MemberGoal['type']>('posture');
  const [newTarget, setNewTarget] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const loadGoals = useCallback(async () => {
    setGoals(await db.getMemberGoals(member.id));
  }, [member.id]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const handleAdd = async () => {
    if (!newTarget || !newEndDate) return;
    const goal: MemberGoal = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      memberId: member.id,
      type: newType,
      target: Number(newTarget),
      current: newType === 'posture' ? (member.assessments?.[0]?.report?.score ?? 0) : 0,
      unit: GOAL_TYPES.find(g => g.key === newType)?.unit || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: newEndDate,
      createdAt: new Date().toISOString(),
    };
    await db.saveGoal(goal);
    setGoals(prev => [...prev, goal]);
    setAdding(false);
    setNewTarget('');
    setNewEndDate('');
  };

  const handleDelete = async (id: string) => {
    await db.deleteGoal(id);
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const resolveColor = (pct: number, dLeft: number) => {
    if (dLeft === 0) return '#34C759';
    if (pct >= 100) return '#34C759';
    if (dLeft < 7) return '#FF3B30';
    if (pct >= 50) return '#FF9500';
    return '#007AFF';
  };

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">{lang === 'zh' ? '课程目标' : 'Course Goals'}</h3>
        <button onClick={() => setAdding(!adding)} className="text-[11px] font-semibold text-[#007AFF] hover:opacity-80 transition-opacity">
          {adding ? (lang === 'zh' ? '取消' : 'Cancel') : '+ Add'}
        </button>
      </div>

      {adding && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="flex gap-2">
            {GOAL_TYPES.map(g => (
              <button key={g.key} onClick={() => setNewType(g.key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${newType === g.key ? 'bg-[#007AFF] text-white' : 'bg-white text-gray-500 border border-gray-100'}`}>
                {lang === 'zh' ? g.labelZh : g.labelEn}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)} placeholder={lang === 'zh' ? '目标值' : 'Target'}
              className="flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#007AFF]/30 transition-all" />
            <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
              className="flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#007AFF]/30 transition-all" />
            <button onClick={handleAdd} className="px-4 py-2 rounded-xl text-xs font-bold text-white scale-press" style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
              {lang === 'zh' ? '设定' : 'Set'}
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 && !adding ? (
        <p className="text-xs text-gray-400 text-center py-4">{lang === 'zh' ? '暂无课程目标，点击上方按钮设定' : 'No goals yet'}</p>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const pct = progressPercent(goal);
            const dLeft = daysLeft(goal.endDate);
            const color = resolveColor(pct, dLeft);
            const typeInfo = GOAL_TYPES.find(g => g.key === goal.type)!;
            return (
              <div key={goal.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: color }}>
                      {lang === 'zh' ? typeInfo.labelZh : typeInfo.labelEn}
                    </span>
                    <span className="text-xs font-semibold text-gray-800">
                      {goal.current}/{goal.target} {goal.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dLeft <= 7 && <span className="text-[9px] font-bold text-[#FF3B30] bg-[#FF3B30]/5 px-1.5 py-0.5 rounded">{dLeft === 0 ? (lang === 'zh' ? '到期' : 'Due') : `${dLeft}d`}</span>}
                    <button onClick={() => handleDelete(goal.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#FF3B30] transition-all">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <p className="text-[9px] text-gray-400 mt-1">{goal.startDate} → {goal.endDate} · {pct}%</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemberGoals;
