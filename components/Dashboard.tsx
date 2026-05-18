/**
 * 仪表盘页面 — 会员训练管理主界面
 */

import React from 'react';
import MetricCard from './MetricCard';
import WorkoutForm from './WorkoutForm';
import HistoryChart from './HistoryChart';
import WorkoutHistory from './WorkoutHistory';
import AIAdvisor from './AIAdvisor';
import ImageUpload from './ImageUpload';
import { exportMemberHistory } from '../services/excelService';
import { Member, Language, Workout } from '../types';
import { TRANSLATIONS } from '../constants';

interface DashboardProps {
  lang: Language;
  member: Member;
  filterMonth: string;
  onFilterMonthChange: (month: string) => void;
  onSaveSession: (workouts: (Omit<Workout, 'id'> & { id?: string })[], mode: 'add' | 'edit') => void;
  onUpdateWorkout: (workout: Workout) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onUploadPhoto: (base64: string) => void;
  editingSession: { date: string; workouts: Workout[] } | null;
  onEditSession: (date: string, workouts: Workout[]) => void;
  onCancelEdit: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  lang,
  member,
  filterMonth,
  onFilterMonthChange,
  onSaveSession,
  onUpdateWorkout,
  onDeleteWorkout,
  onUploadPhoto,
  editingSession,
  onEditSession,
  onCancelEdit,
}) => {
  const monthlyCount = member.workouts.filter(w => w.date.startsWith(filterMonth)).length || 0;
  const maxWeight = member.workouts.reduce((max, w) => w.weight > max ? w.weight : max, 0) || 0;
  const totalVolume = member.workouts.reduce((sum, w) => sum + (w.weight * w.sets * w.reps), 0) || 0;

  const handleExport = () => {
    exportMemberHistory(member);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center -mb-2 gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors"
          >
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{TRANSLATIONS.exportData[lang]}</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
          <span className="text-xs text-zinc-500 uppercase font-semibold">{TRANSLATIONS.filterMonth[lang]}</span>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => onFilterMonthChange(e.target.value)}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label={TRANSLATIONS.monthlyWorkouts[lang]}
          value={monthlyCount}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <MetricCard
          label={TRANSLATIONS.maxWeight[lang]}
          value={`${maxWeight} kg`}
          subValue="PR"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <MetricCard
          label={TRANSLATIONS.totalVolume[lang]}
          value={(totalVolume / 1000).toFixed(1) + 'k'}
          subValue="kg"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <HistoryChart workouts={member.workouts} lang={lang} />
          <WorkoutForm
            lang={lang}
            onSaveSession={onSaveSession}
            initialDate={editingSession?.date}
            initialWorkouts={editingSession?.workouts}
            onCancelEdit={onCancelEdit}
          />
        </div>

        <div className="space-y-6">
          <div className="h-96">
            <WorkoutHistory
              workouts={member.workouts}
              lang={lang}
              filterMonth={filterMonth}
              onUpdateWorkout={onUpdateWorkout}
              onDeleteWorkout={onDeleteWorkout}
              onEditSession={onEditSession}
            />
          </div>
          <AIAdvisor member={member} lang={lang} />
          <ImageUpload
            lang={lang}
            onUpload={onUploadPhoto}
            currentImage={member.photoUrl}
          />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
