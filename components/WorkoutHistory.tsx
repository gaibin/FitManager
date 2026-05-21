import React, { useMemo } from 'react';
import { Workout, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface WorkoutHistoryProps {
  workouts: Workout[];
  lang: Language;
  filterMonth: string;
  onUpdateWorkout?: (workout: Workout) => void;
  onDeleteWorkout?: (workoutId: string) => void;
  onEditSession?: (date: string, workouts: Workout[]) => void;
}

const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({ workouts, lang, filterMonth, onUpdateWorkout, onDeleteWorkout, onEditSession }) => {
  const filtered = useMemo(() => workouts.filter(w => w.date.startsWith(filterMonth)), [workouts, filterMonth]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, Workout[]> = {};
    filtered.forEach(w => { if (!map[w.date]) map[w.date] = []; map[w.date].push(w); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 h-full overflow-y-auto" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 className="text-sm font-bold text-gray-800 mb-4">{TRANSLATIONS.history[lang]}</h3>
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          {TRANSLATIONS.noExercisesInSession[lang]}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 h-full overflow-y-auto" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 pb-2">
        <h3 className="text-sm font-bold text-gray-800">{TRANSLATIONS.history[lang]}</h3>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{filterMonth}</span>
      </div>
      <div className="space-y-4">
        {sessionsByDate.map(([date, ws]) => {
          const totalVol = ws.reduce((s, w) => s + w.weight * w.sets * w.reps, 0);
          return (
            <div key={date} className="group">
              <div className="flex items-center justify-between mb-1.5 px-1 cursor-pointer"
                onClick={() => onEditSession?.(date, ws)}>
                <span className="text-[11px] font-bold text-[#007AFF]">{date}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">{(totalVol / 1000).toFixed(1)}k</span>
                  {onEditSession && (
                    <svg className="w-3 h-3 text-gray-300 group-hover:text-[#007AFF] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  )}
                </div>
              </div>
              {ws.map(w => (
                <div key={w.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group/item">
                  <span className="text-xs font-semibold text-gray-800 flex-1 truncate">{w.exercise}</span>
                  <span className="text-[11px] text-gray-400">{w.weight}kg</span>
                  <span className="text-[11px] text-gray-400">{w.sets}x{w.reps}</span>
                  {onDeleteWorkout && (
                    <button onClick={(e) => { e.stopPropagation(); onDeleteWorkout(w.id); }}
                      className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-[#FF3B30] transition-all p-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkoutHistory;
