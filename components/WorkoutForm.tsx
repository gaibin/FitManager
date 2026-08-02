import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Language, Workout } from '../types';
import { TRANSLATIONS } from '../constants';
import TrainingTemplates from './TrainingTemplates';
import { suggestExercises, normalizeExercise } from '../services/exerciseStandardizer';
import { parseTrainingLog } from '../services/aiTrainingImport';

type WorkoutDraft = Omit<Workout, 'id'> & { id?: string };

interface WorkoutFormProps {
  lang: Language;
  onSaveSession: (workouts: WorkoutDraft[], mode: 'add' | 'edit') => void;
  initialDate?: string;
  initialWorkouts?: Workout[];
  initialBodyWeightKg?: number;
  onCancelEdit?: () => void;
}

const durationLabel = (seconds?: number) => {
  if (!seconds) return '';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
};

const WorkoutForm: React.FC<WorkoutFormProps> = ({
  lang, onSaveSession, initialDate, initialWorkouts, initialBodyWeightKg, onCancelEdit,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [session, setSession] = useState<WorkoutDraft[]>(initialWorkouts || []);
  const [date, setDate] = useState(initialDate || today);
  const [bodyWeightKg, setBodyWeightKg] = useState(
    initialWorkouts?.find(item => item.bodyWeightKg != null)?.bodyWeightKg?.toString()
      || initialBodyWeightKg?.toString()
      || '',
  );
  const [exName, setExName] = useState('');
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [rpe, setRpe] = useState('');
  const [completed, setCompleted] = useState(true);
  const [note, setNote] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; category: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validation, setValidation] = useState('');
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(initialDate && initialWorkouts);

  useEffect(() => {
    if (initialDate && initialWorkouts) {
      setDate(initialDate);
      setSession(initialWorkouts);
      setBodyWeightKg(
        initialWorkouts.find(item => item.bodyWeightKg != null)?.bodyWeightKg?.toString()
          || initialBodyWeightKg?.toString()
          || '',
      );
    }
    if (!initialDate) setBodyWeightKg(initialBodyWeightKg?.toString() || '');
  }, [initialBodyWeightKg, initialDate, initialWorkouts]);

  useEffect(() => {
    if (exName.length < 1) {
      setShowSuggestions(false);
      return;
    }
    const next = suggestExercises(exName);
    setSuggestions(next);
    setShowSuggestions(next.length > 0);
  }, [exName]);

  const resetDraft = () => {
    setExName('');
    setWeight('');
    setSets('');
    setReps('');
    setDurationSeconds('');
    setRpe('');
    setCompleted(true);
    setNote('');
    setValidation('');
    setShowSuggestions(false);
  };

  const handleAdd = useCallback(() => {
    if (!exName.trim()) {
      setValidation(lang === 'zh' ? '请填写动作名称' : 'Exercise name required');
      return;
    }
    const nextWeight = Number(weight) || 0;
    const nextSets = Number(sets) || 3;
    const nextReps = Number(reps) || 10;
    const nextDuration = durationSeconds ? Number(durationSeconds) : undefined;
    const nextRpe = rpe ? Number(rpe) : undefined;
    if (nextWeight < 0 || nextSets <= 0 || nextReps <= 0 || (nextDuration != null && nextDuration < 0)) {
      setValidation(lang === 'zh' ? '重量、组数、次数或时长格式不正确' : 'Invalid load, sets, reps, or duration');
      return;
    }
    if (nextRpe != null && (nextRpe < 1 || nextRpe > 10)) {
      setValidation(lang === 'zh' ? 'RPE 请输入 1–10' : 'RPE must be between 1 and 10');
      return;
    }

    setSession(previous => [...previous, {
      id: Math.random().toString(36).slice(2, 8),
      date,
      exercise: normalizeExercise(exName.trim()),
      weight: nextWeight,
      sets: nextSets,
      reps: nextReps,
      durationSeconds: nextDuration,
      rpe: nextRpe,
      completed,
      note: note.trim() || undefined,
    }]);
    resetDraft();
  }, [completed, date, durationSeconds, exName, lang, note, reps, rpe, sets, weight]);

  const handleSave = () => {
    if (session.length === 0) {
      setValidation(lang === 'zh' ? '请至少添加一个训练动作' : 'Add at least one exercise');
      return;
    }
    const parsedBodyWeight = bodyWeightKg ? Number(bodyWeightKg) : undefined;
    if (parsedBodyWeight != null && (!Number.isFinite(parsedBodyWeight) || parsedBodyWeight < 25 || parsedBodyWeight > 300)) {
      setValidation(lang === 'zh' ? '当天体重请输入 25–300 kg' : 'Enter body weight between 25 and 300 kg');
      return;
    }
    onSaveSession(
      session.map(item => ({ ...item, date, bodyWeightKg: parsedBodyWeight })),
      isEditing ? 'edit' : 'add',
    );
    if (!isEditing) setSession([]);
  };

  const handleAIImport = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const parsed = await parseTrainingLog(aiText, date);
      if (parsed.length === 0) {
        setAiResult(lang === 'zh' ? '未能识别训练记录，请检查格式' : 'Could not parse training log');
      } else {
        setSession(previous => [...previous, ...parsed.map(item => ({
          ...item,
          id: Math.random().toString(36).slice(2, 8),
          date: item.date || date,
          exercise: normalizeExercise(item.exercise),
          completed: item.completed ?? true,
        }))]);
        setAiResult(lang === 'zh' ? `成功识别 ${parsed.length} 条训练记录` : `Parsed ${parsed.length} records`);
        setAiText('');
      }
    } catch (error: any) {
      setAiResult(error.message || (lang === 'zh' ? '导入失败' : 'Import failed'));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-4 sm:p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-[#34C759] to-[#30D158]" />
            {TRANSLATIONS.logWorkout[lang]}
          </h3>
          <p className="text-xs text-gray-400 mt-1 ml-3">
            {lang === 'zh' ? '负重与体态训练可统一记录，补充项均为选填。' : 'Track loaded and posture training together. Extra fields are optional.'}
          </p>
        </div>
        {isEditing && onCancelEdit && (
          <button onClick={onCancelEdit} className="text-xs text-[#FF3B30] font-medium hover:opacity-80">
            {TRANSLATIONS.cancel[lang]}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 mb-4 sm:grid-cols-2">
        <label className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-xs font-semibold text-gray-500 shrink-0">{TRANSLATIONS.sessionDate[lang]}</span>
          <input type="date" value={date} onChange={event => setDate(event.target.value)}
            className="min-w-0 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-[#007AFF]/30 focus:ring-2 focus:ring-[#007AFF]/10 flex-1 transition-all" />
        </label>
        <label className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-xs font-semibold text-gray-500 shrink-0">{lang === 'zh' ? '当天体重' : 'Body weight'}</span>
          <div className="relative flex-1">
            <input type="number" min="25" max="300" step="0.1" value={bodyWeightKg} onChange={event => setBodyWeightKg(event.target.value)}
              placeholder={lang === 'zh' ? '可选' : 'Optional'}
              className="w-full bg-[#34C759]/5 border border-[#34C759]/15 rounded-xl px-3 py-2 pr-9 text-xs text-gray-800 outline-none focus:border-[#34C759]/40 focus:ring-2 focus:ring-[#34C759]/10 transition-all" />
            <span className="absolute right-3 top-2 text-[10px] text-gray-400">kg</span>
          </div>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-12 gap-2 mb-2">
        <div className="col-span-2 md:col-span-4 relative">
          <input ref={inputRef} type="text" value={exName} onChange={event => setExName(event.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={TRANSLATIONS.exercise[lang]}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-[#007AFF]/30 transition-all" />
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 max-h-52 overflow-y-auto">
              {suggestions.map(suggestion => (
                <button key={suggestion.name} onMouseDown={event => {
                  event.preventDefault();
                  setExName(suggestion.name);
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between">
                  <span className="font-medium text-gray-800">{suggestion.name}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{suggestion.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <input type="number" min="0" step="0.5" value={weight} onChange={event => setWeight(event.target.value)}
          placeholder={lang === 'zh' ? '重量 kg' : 'Load kg'} className="col-span-1 md:col-span-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#007AFF]/30" />
        <input type="number" min="1" value={sets} onChange={event => setSets(event.target.value)}
          placeholder={TRANSLATIONS.sets[lang]} className="col-span-1 md:col-span-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#007AFF]/30" />
        <input type="number" min="1" value={reps} onChange={event => setReps(event.target.value)}
          placeholder={TRANSLATIONS.reps[lang]} className="col-span-1 md:col-span-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#007AFF]/30" />
        <button onClick={handleAdd} className="col-span-1 md:col-span-2 rounded-xl text-sm font-semibold text-white transition-all scale-press bg-gradient-to-br from-[#007AFF] to-[#5856D6]">
          {TRANSLATIONS.addLog[lang]}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-12 gap-2 p-3 mb-4 rounded-xl bg-[#007AFF]/[0.035] border border-[#007AFF]/10">
        <input type="number" min="0" value={durationSeconds} onChange={event => setDurationSeconds(event.target.value)}
          placeholder={lang === 'zh' ? '保持/训练秒数' : 'Duration sec'} className="col-span-1 md:col-span-2 bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#007AFF]/30" />
        <input type="number" min="1" max="10" value={rpe} onChange={event => setRpe(event.target.value)}
          placeholder="RPE 1–10" className="col-span-1 md:col-span-2 bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#007AFF]/30" />
        <label className="col-span-2 md:col-span-2 flex items-center gap-2 px-2 text-xs font-semibold text-gray-600 cursor-pointer">
          <input type="checkbox" checked={completed} onChange={event => setCompleted(event.target.checked)} className="accent-[#34C759]" />
          {lang === 'zh' ? '已完成' : 'Completed'}
        </label>
        <input type="text" value={note} onChange={event => setNote(event.target.value)}
          placeholder={lang === 'zh' ? '教练备注（选填）' : 'Coach note (optional)'} className="col-span-2 md:col-span-6 bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#007AFF]/30" />
      </div>

      {validation && <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/10 rounded-xl p-3 text-xs font-medium text-[#FF3B30] mb-3">{validation}</div>}

      {!isEditing && (
        <div className="mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em]">{lang === 'zh' ? 'AI 智能导入' : 'AI Smart Import'}</span>
            <span className="text-[9px] text-gray-400">DeepSeek</span>
          </div>
          <textarea value={aiText} onChange={event => setAiText(event.target.value)}
            placeholder={lang === 'zh' ? '粘贴训练记录，例如：深蹲 60kg 4×8，RPE 7；平板支撑 3 组，每组 30 秒。' : 'Paste training notes, e.g. Squat 60kg 4x8 RPE 7; plank 3x30 sec.'}
            className="w-full bg-white border border-gray-100 rounded-xl p-3 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-[#007AFF]/30 h-20 resize-none mb-2" />
          <div className="flex items-center justify-between">
            <button onClick={handleAIImport} disabled={aiLoading || !aiText.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white scale-press disabled:opacity-40 bg-gradient-to-br from-[#5856D6] to-[#007AFF]">
              {aiLoading ? (lang === 'zh' ? '解析中…' : 'Parsing...') : (lang === 'zh' ? '导入训练' : 'Import')}
            </button>
            {aiResult && <span className="text-[10px] font-medium text-[#34C759]">{aiResult}</span>}
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="mb-4">
          <TrainingTemplates lang={lang} onAssign={workouts => {
            setSession(previous => [...previous, ...workouts.map(workout => ({
              ...workout,
              id: Math.random().toString(36).slice(2, 8),
              completed: true,
            }))]);
          }} />
        </div>
      )}

      {session.length > 0 && (
        <div className="mb-4 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em]">{TRANSLATIONS.sessionPreview[lang]}</p>
          {session.map((item, index) => (
            <div key={item.id || index} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 text-xs group">
              <span className="font-semibold text-gray-800 flex-1 min-w-[120px] truncate">{item.exercise}</span>
              {item.weight > 0 && <span className="text-gray-500">{item.weight}kg</span>}
              <span className="text-gray-500">{item.sets}×{item.reps}</span>
              {item.durationSeconds ? <span className="px-2 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF]">{durationLabel(item.durationSeconds)}</span> : null}
              {item.rpe ? <span className="px-2 py-0.5 rounded-full bg-[#FF9500]/10 text-[#C96D00]">RPE {item.rpe}</span> : null}
              <span className={`px-2 py-0.5 rounded-full ${item.completed !== false ? 'bg-[#34C759]/10 text-[#248A3D]' : 'bg-gray-200 text-gray-500'}`}>
                {item.completed !== false ? (lang === 'zh' ? '已完成' : 'Done') : (lang === 'zh' ? '未完成' : 'Skipped')}
              </span>
              {item.note && <span title={item.note} className="max-w-[160px] truncate text-gray-400">{item.note}</span>}
              <button onClick={() => setSession(previous => previous.filter((_, itemIndex) => itemIndex !== index))}
                className="p-1 text-gray-400 opacity-100 transition-colors hover:text-[#FF3B30] sm:opacity-0 sm:group-hover:opacity-100" aria-label={lang === 'zh' ? '删除动作' : 'Remove exercise'}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleSave} disabled={session.length === 0}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all scale-press disabled:opacity-30 disabled:pointer-events-none bg-gradient-to-br from-[#007AFF] to-[#5856D6]">
        {isEditing ? (lang === 'zh' ? '更新训练记录' : 'Update Session') : TRANSLATIONS.saveSession[lang]}
      </button>
    </div>
  );
};

export default WorkoutForm;
