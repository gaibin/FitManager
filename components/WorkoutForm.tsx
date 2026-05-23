import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Language, Workout } from '../types';
import { TRANSLATIONS } from '../constants';
import TrainingTemplates from './TrainingTemplates';
import { suggestExercises, normalizeExercise } from '../services/exerciseStandardizer';
import { parseTrainingLog } from '../services/aiTrainingImport';

interface WorkoutFormProps {
  lang: Language;
  onSaveSession: (workouts: (Omit<Workout, 'id'> & { id?: string })[], mode: 'add' | 'edit') => void;
  initialDate?: string; initialWorkouts?: Workout[]; onCancelEdit?: () => void;
}

const WorkoutForm: React.FC<WorkoutFormProps> = ({ lang, onSaveSession, initialDate, initialWorkouts, onCancelEdit }) => {
  const [session, setSession] = useState<(Omit<Workout, 'id'> & { id?: string })[]>(initialWorkouts || []);
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [exName, setExName] = useState('');
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; category: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validation, setValidation] = useState('');
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const isEditing = !!initialDate && !!initialWorkouts;
  const inputRef = useRef<HTMLInputElement>(null);

  // Exercise autocomplete
  useEffect(() => {
    if (exName.length >= 1) {
      const s = suggestExercises(exName);
      setSuggestions(s);
      setShowSuggestions(s.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [exName]);

  const selectSuggestion = (name: string) => {
    setExName(name);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleAdd = useCallback(() => {
    if (!exName.trim()) { setValidation(lang === 'zh' ? '请填写动作名称' : 'Exercise name required'); return; }
    const w = Number(weight);
    if (w < 0) { setValidation(lang === 'zh' ? '重量不能为负数' : 'Weight cannot be negative'); return; }
    const s = Number(sets) || 3;
    const r = Number(reps) || 10;
    if (s <= 0 || r <= 0) { setValidation(lang === 'zh' ? '组数和次数必须大于0' : 'Sets and reps must be positive'); return; }

    const normalized = normalizeExercise(exName.trim());
    setSession(prev => [...prev, { id: Math.random().toString(36).substr(2, 6), date, exercise: normalized, weight: w, sets: s, reps: r }]);
    setExName(''); setWeight(''); setSets(''); setReps(''); setValidation(''); setShowSuggestions(false);
  }, [exName, weight, sets, reps, date, lang]);

  const handleRemove = (idx: number) => setSession(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (session.length === 0) { setValidation(lang === 'zh' ? '请至少添加一个训练动作' : 'Add at least one exercise'); return; }
    onSaveSession(session.map(s => ({ ...s, date })), isEditing ? 'edit' : 'add');
    if (!isEditing) setSession([]);
  };

  const handleAIImport = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true); setAiResult('');
    try {
      const parsed = await parseTrainingLog(aiText, date);
      if (parsed.length === 0) { setAiResult(lang === 'zh' ? '未能识别训练记录，请检查格式' : 'Could not parse training log'); }
      else {
        const newWorkouts = parsed.map(w => ({ id: Math.random().toString(36).substr(2, 6), date: date, exercise: normalizeExercise(w.exercise), weight: w.weight, sets: w.sets, reps: w.reps }));
        setSession(prev => [...prev, ...newWorkouts]);
        setAiResult(lang === 'zh' ? `成功识别 ${parsed.length} 条训练记录` : `Parsed ${parsed.length} records`);
        setAiText('');
      }
    } catch (e: any) { setAiResult(e.message || (lang === 'zh' ? '导入失败' : 'Import failed')); }
    finally { setAiLoading(false); }
  };

  const showAI = !isEditing;

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #34C759, #30D158)' }} />
          {TRANSLATIONS.logWorkout[lang]}
        </h3>
        {isEditing && onCancelEdit && (
          <button onClick={onCancelEdit} className="text-[11px] text-[#FF3B30] font-medium hover:opacity-80">{TRANSLATIONS.cancel[lang]}</button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-[10px] font-semibold text-gray-400 uppercase shrink-0">{TRANSLATIONS.sessionDate[lang]}</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-[#007AFF]/30 focus:ring-2 focus:ring-[#007AFF]/10 flex-1 transition-all" />
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        <div className="col-span-2 relative">
          <input ref={inputRef} type="text" value={exName} onChange={e => setExName(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={TRANSLATIONS.exercise[lang]}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-[#007AFF]/30 transition-all" />
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 max-h-52 overflow-y-auto">
              {suggestions.map(s => (
                <button key={s.name} onMouseDown={e => { e.preventDefault(); selectSuggestion(s.name); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between">
                  <span className="font-medium text-gray-800">{s.name}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{s.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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

      {validation && (
        <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/10 rounded-xl p-3 text-xs font-medium text-[#FF3B30] mb-3">{validation}</div>
      )}

      {/* AI Import */}
      {showAI && (
        <div className="mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
              {lang === 'zh' ? 'AI 智能导入' : 'AI Smart Import'}
            </span>
            <span className="text-[9px] text-gray-400">DeepSeek</span>
          </div>
          <textarea value={aiText} onChange={e => setAiText(e.target.value)}
            placeholder={lang === 'zh' ? '粘贴训练记录...\n例: 今天卧推60kg4组8次，深蹲80kg5组5次，引体向上3组10次' : 'Paste training notes...\nE.g.: Bench 60kg 4x8, Squat 80kg 5x5, Pull up 3x10'}
            className="w-full bg-white border border-gray-100 rounded-xl p-3 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-[#007AFF]/30 transition-all h-20 resize-none mb-2" />
          <div className="flex items-center justify-between">
            <button onClick={handleAIImport} disabled={aiLoading || !aiText.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white scale-press disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #5856D6, #007AFF)' }}>
              {aiLoading ? (lang === 'zh' ? '解析中...' : 'Parsing...') : (lang === 'zh' ? '导入训练' : 'Import')}
            </button>
            {aiResult && <span className="text-[10px] font-medium text-[#34C759]">{aiResult}</span>}
          </div>
        </div>
      )}

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
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 text-xs group">
              <span className="font-semibold text-gray-800 flex-1 truncate">{s.exercise}</span>
              <span className="text-gray-500">{s.weight}kg</span>
              <span className="text-gray-500">{s.sets}x{s.reps}</span>
              <button onClick={() => handleRemove(i)} className="text-gray-400 hover:text-[#FF3B30] transition-colors opacity-0 group-hover:opacity-100 p-0.5">
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
