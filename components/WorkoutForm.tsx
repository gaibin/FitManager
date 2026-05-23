import React, { useState } from 'react';
import { Language, Workout } from '../types';
import { TRANSLATIONS } from '../constants';
import TrainingTemplates from './TrainingTemplates';

interface WorkoutFormProps {
  lang: Language;
  onSaveSession: (workouts: (Omit<Workout, 'id'> & { id?: string })[], mode: 'add' | 'edit') => void;
  initialDate?: string;
  initialWorkouts?: Workout[];
  onCancelEdit?: () => void;
}

const WorkoutForm: React.FC<WorkoutFormProps> = ({ lang, onSaveSession, initialDate, initialWorkouts, onCancelEdit }) => {
  const [session, setSession] = useState<(Omit<Workout, 'id'> & { id?: string })[]>(
    initialWorkouts || []
  );
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [exName, setExName] = useState('');
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const isEditing = !!initialDate && !!initialWorkouts;

  const handleAdd = () => {
    if (!exName || !weight) return;
    setSession(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 6),
      date, exercise: exName,
      weight: Number(weight), sets: Number(sets) || 3, reps: Number(reps) || 10
    }]);
    setExName(''); setWeight(''); setSets(''); setReps('');
  };

  const handleRemove = (idx: number) => {
    setSession(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (session.length === 0) return;
    const data = session.map(s => ({ ...s, date }));
    onSaveSession(data, isEditing ? 'edit' : 'add');
    if (!isEditing) setSession([]);
  };

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #34C759, #30D158)' }} />
          {TRANSLATIONS.logWorkout[lang]}
        </h3>
        {isEditing && onCancelEdit && (
          <button onClick={onCancelEdit} className="text-[11px] text-[#FF3B30] font-medium hover:opacity-80 transition-opacity">{TRANSLATIONS.cancel[lang]}</button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-[10px] font-semibold text-gray-400 uppercase shrink-0">{TRANSLATIONS.sessionDate[lang]}</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-[#007AFF]/30 focus:ring-2 focus:ring-[#007AFF]/10 flex-1 transition-all" />
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        <input type="text" value={exName} onChange={e => setExName(e.target.value)} placeholder={TRANSLATIONS.exercise[lang]}
          className="col-span-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-[#007AFF]/30 transition-all" />
        <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder={TRANSLATIONS.weight[lang]}
          className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-[#007AFF]/30 transition-all" />
        <input type="number" value={sets} onChange={e => setSets(e.target.value)} placeholder={TRANSLATIONS.sets[lang]}
          className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-[#007AFF]/30 transition-all" />
        <input type="number" value={reps} onChange={e => setReps(e.target.value)} placeholder={TRANSLATIONS.reps[lang]}
          className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-[#007AFF]/30 transition-all" />
        <button onClick={handleAdd}
          className="rounded-xl text-sm font-semibold text-white transition-all scale-press" style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
          {TRANSLATIONS.addLog[lang]}
        </button>
      </div>

      {/* Training Templates */}
      {!isEditing && (
        <div className="mb-4">
          <TrainingTemplates lang={lang} onAssign={(workouts) => {
            setSession(prev => [...prev, ...workouts.map(w => ({ ...w, id: Math.random().toString(36).substr(2, 6) }))]);
          }} />
        </div>
      )}

      {session.length > 0 && (
        <div className="mb-4 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em]">{TRANSLATIONS.sessionPreview[lang]}</p>
          {session.map((s, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 text-xs">
              <span className="font-semibold text-gray-800 flex-1">{s.exercise}</span>
              <span className="text-gray-500">{s.weight}kg</span>
              <span className="text-gray-500">{s.sets}x{s.reps}</span>
              <button onClick={() => handleRemove(i)} className="text-gray-400 hover:text-[#FF3B30] transition-colors p-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleSave} disabled={session.length === 0}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all scale-press disabled:opacity-30 disabled:pointer-events-none"
        style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
        {isEditing ? (lang === 'zh' ? '更新训练' : 'Update Session') : TRANSLATIONS.saveSession[lang]}
      </button>
    </div>
  );
};

export default WorkoutForm;
