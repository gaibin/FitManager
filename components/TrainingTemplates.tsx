/**
 * 训练模板库 — 教练预设模板，一键分配训练计划
 */

import React, { useEffect, useState } from 'react';
import { Language, TrainingTemplate, Workout } from '../types';
import { db } from '../services/localDatabase';

interface TrainingTemplatesProps {
  lang: Language;
  onAssign: (workouts: Omit<Workout, 'id'>[]) => void;
}

const CAT_LABELS: Record<string, { en: string; zh: string; color: string }> = {
  'fat-loss': { en: 'Fat Loss', zh: '减脂', color: '#FF2D55' },
  'muscle-gain': { en: 'Muscle Gain', zh: '增肌', color: '#5856D6' },
  'posture-fix': { en: 'Posture Fix', zh: '体态矫正', color: '#34C759' },
  'general': { en: 'General', zh: '综合', color: '#007AFF' },
};

const TrainingTemplates: React.FC<TrainingTemplatesProps> = ({ lang, onAssign }) => {
  const [templates, setTemplates] = useState<TrainingTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      await db.initDefaultTemplates();
      const t = await db.getTemplates();
      setTemplates(t);
      setLoaded(true);
    })();
  }, []);

  if (!loaded) return <div className="text-[11px] text-gray-400 py-2">{lang === 'zh' ? '加载模板...' : 'Loading templates...'}</div>;
  if (templates.length === 0) return null;

  const handleAssign = (t: TrainingTemplate) => {
    const today = new Date().toISOString().split('T')[0];
    const workouts = t.workouts.map(w => ({
      date: today, exercise: w.exercise, weight: w.weight, sets: w.sets, reps: w.reps,
    }));
    onAssign(workouts);
  };

  const langLabel = (t: TrainingTemplate) => lang === 'zh' ? t.name : t.nameEn;
  const langDesc = (t: TrainingTemplate) => lang === 'zh' ? t.description : t.descriptionEn;

  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-2">
        {lang === 'zh' ? '训练模板' : 'Templates'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {templates.map(t => {
          const cat = CAT_LABELS[t.category] || CAT_LABELS['general'];
          return (
            <button key={t.id} onClick={() => handleAssign(t)}
              className="text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-3 transition-all border border-gray-100 hover:border-gray-200 group">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: cat.color }}>{lang === 'zh' ? cat.zh : cat.en}</span>
                <span className="text-xs font-semibold text-gray-800 group-hover:text-[#007AFF] transition-colors">{langLabel(t)}</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">{langDesc(t)}</p>
              <p className="text-[10px] text-gray-300 mt-1">{t.workouts.length} exercises</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TrainingTemplates;
