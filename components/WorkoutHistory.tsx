import React, { useState, useMemo, useEffect } from 'react';
import { Workout, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface WorkoutHistoryProps {
  workouts: Workout[];
  lang: Language;
  filterMonth: string; // YYYY-MM
  onUpdateWorkout?: (workout: Workout) => void;
  onDeleteWorkout?: (id: string) => void;
  onEditSession?: (date: string, workouts: Workout[]) => void;
}

const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({
  workouts,
  lang,
  filterMonth,
  onUpdateWorkout,
  onDeleteWorkout,
  onEditSession
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Workout>>({});

  // Reset selected date if it becomes empty in the source data
  useEffect(() => {
    if (selectedDate) {
      const hasWorkoutsOnDate = workouts.some(w => w.date === selectedDate);
      // Optional: auto-close if empty. For now, we'll just show "Session emptied" message in render.
    }
  }, [workouts, selectedDate]);

  // --- Calendar Logic ---
  const calendarDays = useMemo(() => {
    const [year, month] = filterMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun

    // Adjust for Monday start if needed, but let's stick to Sun-Sat for standard
    const days = [];
    // Empty slots for start
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    // Real days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${filterMonth}-${String(i).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  }, [filterMonth]);

  // Group workouts by Date
  const sessions = useMemo(() => {
    const groups: Record<string, Workout[]> = {};
    workouts.forEach(w => {
      if (!groups[w.date]) groups[w.date] = [];
      groups[w.date].push(w);
    });
    return groups;
  }, [workouts]);

  const selectedSession = selectedDate ? sessions[selectedDate] || [] : [];

  // --- CRUD Handlers ---

  const handleEditClick = (e: React.MouseEvent, workout: Workout) => {
    e.stopPropagation();
    setEditingId(workout.id);
    setEditForm({ ...workout });
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingId && editForm && onUpdateWorkout) {
      onUpdateWorkout(editForm as Workout);
      setEditingId(null);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Critical: Prevent event bubbling
    if (onDeleteWorkout && window.confirm(TRANSLATIONS.confirmDelete[lang])) {
      onDeleteWorkout(id);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 h-full flex flex-col">
      <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center">
        <span className="w-1 h-6 bg-lime-500 rounded-full mr-3"></span>
        {TRANSLATIONS.calendar[lang]}
      </h3>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="text-xs text-zinc-500 font-bold py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((dateStr, idx) => {
            if (!dateStr) return <div key={idx} className="aspect-square"></div>;

            const dayNum = parseInt(dateStr.split('-')[2]);
            const hasWorkout = sessions[dateStr] && sessions[dateStr].length > 0;

            return (
              <button
                key={dateStr}
                onClick={() => hasWorkout && setSelectedDate(dateStr)}
                disabled={!hasWorkout}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${hasWorkout
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-lime-500 cursor-pointer'
                  : 'bg-zinc-950/50 text-zinc-700 cursor-default border border-transparent'
                  }`}
              >
                <span className={`text-sm ${hasWorkout ? 'font-bold' : ''}`}>{dayNum}</span>
                {hasWorkout && (
                  <div className="flex space-x-0.5 mt-1">
                    {sessions[dateStr].slice(0, 3).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-lime-500"></div>
                    ))}
                    {sessions[dateStr].length > 3 && (
                      <div className="w-1 h-1 rounded-full bg-lime-500/50"></div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 w-full max-w-xl rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <div className="flex items-center space-x-4">
                <div>
                  <h4 className="text-lg font-bold text-white">{TRANSLATIONS.sessionDetails[lang]}</h4>
                  <p className="text-lime-400 text-sm font-mono">{selectedDate}</p>
                </div>
                {onEditSession && (
                  <button
                    onClick={() => {
                      onEditSession(selectedDate!, selectedSession);
                      setSelectedDate(null);
                    }}
                    className="flex items-center space-x-1 px-3 py-1 bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/30 rounded-lg text-xs font-bold transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    <span>{lang === 'zh' ? '编辑此日记录' : 'Edit Session'}</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Content - List of Exercises */}
            <div className="p-5 overflow-y-auto space-y-3">
              {selectedSession.length === 0 ? (
                <p className="text-zinc-500 text-center italic">Session emptied.</p>
              ) : (
                selectedSession.map((w, idx) => (
                  <div key={w.id} className={`p-4 rounded-xl border transition-all ${editingId === w.id ? 'bg-zinc-800 border-lime-500' : 'bg-zinc-950/50 border-zinc-800'}`}>

                    {editingId === w.id ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">{w.exercise}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] uppercase text-zinc-500">{TRANSLATIONS.weight[lang]}</label>
                            <input
                              type="number"
                              value={editForm.weight}
                              onChange={e => setEditForm({ ...editForm, weight: parseFloat(e.target.value) })}
                              className="w-full bg-zinc-900 border border-zinc-600 rounded p-1 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase text-zinc-500">{TRANSLATIONS.sets[lang]}</label>
                            <input
                              type="number"
                              value={editForm.sets}
                              onChange={e => setEditForm({ ...editForm, sets: parseFloat(e.target.value) })}
                              className="w-full bg-zinc-900 border border-zinc-600 rounded p-1 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase text-zinc-500">{TRANSLATIONS.reps[lang]}</label>
                            <input
                              type="number"
                              value={editForm.reps}
                              onChange={e => setEditForm({ ...editForm, reps: parseFloat(e.target.value) })}
                              className="w-full bg-zinc-900 border border-zinc-600 rounded p-1 text-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <button onClick={handleCancelEdit} className="text-xs text-zinc-400 hover:text-white px-3 py-1">{TRANSLATIONS.cancel[lang]}</button>
                          <button onClick={handleSaveEdit} className="text-xs bg-lime-500 text-black font-bold px-3 py-1 rounded">{TRANSLATIONS.save[lang]}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <h5 className="font-bold text-zinc-200">{w.exercise}</h5>
                            <div className="text-xs text-lime-400 font-mono mt-0.5">
                              {w.weight}kg <span className="text-zinc-600">×</span> {w.sets} <span className="text-zinc-600">×</span> {w.reps}
                            </div>
                          </div>
                        </div>

                        {onUpdateWorkout && onDeleteWorkout && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => handleEditClick(e, w)}
                              className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-blue-400"
                              title={TRANSLATIONS.edit[lang]}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, w.id)}
                              className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-400"
                              title={TRANSLATIONS.delete[lang]}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
              <button
                onClick={() => setSelectedDate(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {TRANSLATIONS.close[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutHistory;