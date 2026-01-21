import React, { useState } from 'react';
import { Language, Workout } from '../types';
import { TRANSLATIONS } from '../constants';

interface WorkoutFormProps {
  lang: Language;
  onSaveSession: (workouts: Omit<Workout, 'id'>[]) => void;
}

interface DraftExercise {
  tempId: string;
  exercise: string;
  weight: number;
  sets: number;
  reps: number;
}

const WorkoutForm: React.FC<WorkoutFormProps> = ({ lang, onSaveSession }) => {
  // Session State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionQueue, setSessionQueue] = useState<DraftExercise[]>([]);

  // Input State
  const [exercise, setExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');

  const handleAddToSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise || !weight || !sets || !reps) return;

    const newDraft: DraftExercise = {
      tempId: Math.random().toString(36).substr(2, 9),
      exercise,
      weight: parseFloat(weight),
      sets: parseInt(sets),
      reps: parseInt(reps),
    };

    setSessionQueue([...sessionQueue, newDraft]);

    // Clear inputs but keep exercise name just in case they do multiple sets of same exercise? 
    // Usually cleaner to clear all or keep exercise. Let's clear for now.
    setExercise('');
    setWeight('');
    setSets('');
    setReps('');
  };

  const handleRemove = (tempId: string) => {
    setSessionQueue(sessionQueue.filter(item => item.tempId !== tempId));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newQueue = [...sessionQueue];
    if (direction === 'up' && index > 0) {
      [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]];
    } else if (direction === 'down' && index < newQueue.length - 1) {
      [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    }
    setSessionQueue(newQueue);
  };

  const handleSaveFullSession = () => {
    if (sessionQueue.length === 0) return;

    const workoutsToSave = sessionQueue.map(({ exercise, weight, sets, reps }) => ({
      date,
      exercise,
      weight,
      sets,
      reps,
    }));

    onSaveSession(workoutsToSave);
    setSessionQueue([]);
    // Date stays same or resets? Usually keeps same date for next entry unless user changes it.
  };

  const inputClass = "w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg p-3 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all placeholder-zinc-600";

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col h-full">
      <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center">
        <span className="w-1 h-6 bg-lime-500 rounded-full mr-3"></span>
        {TRANSLATIONS.logWorkout[lang]}
      </h3>
      
      {/* Date Picker */}
      <div className="mb-6">
        <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wide">{TRANSLATIONS.sessionDate[lang]}</label>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          className={`${inputClass} max-w-[200px]`} 
        />
      </div>

      {/* Session Preview List */}
      <div className="flex-1 mb-6 bg-zinc-950/50 rounded-xl border border-zinc-800 p-4 overflow-y-auto min-h-[150px] max-h-[300px]">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-3 sticky top-0 bg-zinc-950/0 backdrop-blur-sm py-1">
          {TRANSLATIONS.sessionPreview[lang]}
        </h4>
        
        {sessionQueue.length === 0 ? (
          <div className="text-zinc-600 text-sm text-center py-8 italic">
            {TRANSLATIONS.noExercisesInSession[lang]}
          </div>
        ) : (
          <div className="space-y-2">
            {sessionQueue.map((item, index) => (
              <div key={item.tempId} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-lg group hover:border-zinc-700 transition-colors">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <span className="text-zinc-600 text-xs font-mono w-4">{index + 1}.</span>
                  <div>
                    <div className="text-sm font-bold text-zinc-200">{item.exercise}</div>
                    <div className="text-xs text-lime-400 font-mono">
                      {item.weight}kg <span className="text-zinc-600">x</span> {item.sets} <span className="text-zinc-600">x</span> {item.reps}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => moveItem(index, 'up')} 
                    disabled={index === 0}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button 
                    onClick={() => moveItem(index, 'down')} 
                    disabled={index === sessionQueue.length - 1}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button 
                    onClick={() => handleRemove(item.tempId)}
                    className="p-1 hover:bg-red-500/20 rounded text-zinc-500 hover:text-red-400 ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleAddToSession} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
             <label className="block text-[10px] text-zinc-500 mb-1 uppercase">{TRANSLATIONS.exercise[lang]}</label>
             <input
               type="text"
               value={exercise}
               onChange={(e) => setExercise(e.target.value)}
               className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-100 focus:border-lime-500 focus:outline-none"
               placeholder="e.g. Squat"
             />
          </div>
          <div>
             <label className="block text-[10px] text-zinc-500 mb-1 uppercase">{TRANSLATIONS.weight[lang]}</label>
             <input
               type="number"
               value={weight}
               onChange={(e) => setWeight(e.target.value)}
               className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-100 focus:border-lime-500 focus:outline-none"
               placeholder="0"
             />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
           <div>
             <label className="block text-[10px] text-zinc-500 mb-1 uppercase">{TRANSLATIONS.sets[lang]}</label>
             <input type="number" value={sets} onChange={(e) => setSets(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-100 focus:border-lime-500 focus:outline-none" placeholder="0"/>
           </div>
           <div>
             <label className="block text-[10px] text-zinc-500 mb-1 uppercase">{TRANSLATIONS.reps[lang]}</label>
             <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-100 focus:border-lime-500 focus:outline-none" placeholder="0"/>
           </div>
        </div>
        <button
          type="submit"
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold py-2 px-4 rounded transition-colors border border-zinc-700"
        >
          {TRANSLATIONS.addLog[lang]}
        </button>
      </form>

      {/* Save Button */}
      <button
        onClick={handleSaveFullSession}
        disabled={sessionQueue.length === 0}
        className="w-full bg-lime-500 hover:bg-lime-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-lime-500/10"
      >
        {TRANSLATIONS.saveSession[lang]} ({sessionQueue.length})
      </button>
    </div>
  );
};

export default WorkoutForm;