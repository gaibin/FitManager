/**
 * 仪表盘页面 — Apple HIG 风格，丰富训练信息
 */

import React from 'react';
import MetricCard from './MetricCard';
import WorkoutForm from './WorkoutForm';
import HistoryChart from './HistoryChart';
import WorkoutHistory from './WorkoutHistory';
import AIAdvisor from './AIAdvisor';
import ImageUpload from './ImageUpload';
import WellnessScore from './WellnessScore';
import AssessmentTrends from './AssessmentTrends';
import PostureRadar from './PostureRadar';
import MemberGoals from './MemberGoals';
import CorrelationAnalysis from './CorrelationAnalysis';
import { exportMemberHistory } from '../services/excelService';
import { Member, Language, Workout, WellnessScore as WellnessScoreType } from '../types';
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
  lang, member, filterMonth, onFilterMonthChange, onSaveSession, onUpdateWorkout,
  onDeleteWorkout, onUploadPhoto, editingSession, onEditSession, onCancelEdit,
}) => {
  // Core metrics
  const monthlyCount = member.workouts.filter(w => w.date.startsWith(filterMonth)).length || 0;
  const maxWeight = member.workouts.reduce((max, w) => w.weight > max ? w.weight : max, 0) || 0;
  const totalVolume = member.workouts.reduce((sum, w) => sum + (w.weight * w.sets * w.reps), 0) || 0;

  // Additional rich metrics
  const prevMonth = new Date(new Date(filterMonth).setMonth(new Date(filterMonth).getMonth() - 1)).toISOString().slice(0, 7);
  const prevMonthCount = member.workouts.filter(w => w.date.startsWith(prevMonth)).length || 0;
  const monthDiff = monthlyCount - prevMonthCount;
  const monthTrend = monthlyCount >= prevMonthCount;

  // Most trained exercise
  const exerciseFreq: Record<string, number> = {};
  member.workouts.forEach(w => { exerciseFreq[w.exercise] = (exerciseFreq[w.exercise] || 0) + 1; });
  const topExercise = Object.entries(exerciseFreq).sort((a, b) => b[1] - a[1])[0];
  const uniqueExercises = Object.keys(exerciseFreq).length;

  // This week's sessions
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const weekCount = member.workouts.filter(w => new Date(w.date) >= weekStart).length;

  // Best single-session volume
  const sessionsByDate: Record<string, number> = {};
  member.workouts.forEach(w => { sessionsByDate[w.date] = (sessionsByDate[w.date] || 0) + w.weight * w.sets * w.reps; });
  const bestSession = Math.max(...Object.values(sessionsByDate), 0);

  // Posture score
  const postureScore = member.assessments?.[0]?.report?.score ?? null;

  // Wellness score calculation
  const attendanceRate = Math.min(100, Math.round((monthlyCount / 12) * 100)); // 12 sessions/month = 100%
  const assessmentCount = member.assessments?.length ?? 0;
  const postureRaw = postureScore ?? 0;
  const progressScore = Math.min(100, Math.round(
    (member.workouts.length > 0 ? maxWeight / (member.workouts.length > 5 ? 100 : 50) : 0) * 100
  ));
  const wellnessScore: WellnessScoreType = {
    posture: postureRaw,
    consistency: attendanceRate,
    progress: Math.min(100, progressScore),
    total: Math.round(postureRaw * 0.4 + attendanceRate * 0.3 + Math.min(100, progressScore) * 0.3),
  };

  // Latest assessment issues for radar
  const latestIssues = member.assessments?.[0]?.report?.issues ?? [];

  const handleExport = () => { exportMemberHistory(member); };

  return (
    <div className="space-y-6 animate-in">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">Overview</p>
          <h2 className="text-xl font-extrabold text-gray-800 mt-0.5">{member.name}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {TRANSLATIONS.exportData[lang]}
          </button>
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2"/></svg>
            <input type="month" value={filterMonth} onChange={e => onFilterMonthChange(e.target.value)}
              className="bg-transparent text-gray-700 text-xs font-medium outline-none w-[120px]" />
          </div>
        </div>
      </div>

      {/* Metric Cards — 2 rows */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label={TRANSLATIONS.monthlyWorkouts[lang]} value={monthlyCount}
          trend={monthDiff !== 0 ? `${monthDiff > 0 ? '+' : ''}${monthDiff}` : undefined} trendUp={monthTrend}
          color="#007AFF"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="1.5"/></svg>} />
        <MetricCard label={TRANSLATIONS.maxWeight[lang]} value={`${maxWeight} kg`} subValue="PR"
          color="#FF2D55"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} />
        <MetricCard label={TRANSLATIONS.totalVolume[lang]} value={(totalVolume / 1000).toFixed(1) + 'k'} subValue="kg"
          color="#5856D6"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>} />
        <MetricCard label={lang === 'zh' ? '本周训练' : 'This Week'} value={weekCount}
          subValue={lang === 'zh' ? '次' : 'sessions'}
          color="#34C759"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="1.5"/><path strokeLinecap="round" strokeWidth="1.5" d="M12 7v5l3 3"/></svg>} />
      </div>

      {/* Extra info row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl px-5 py-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">{lang === 'zh' ? '最常训练' : 'Top Exercise'}</p>
          <p className="text-sm font-bold text-gray-800 mt-1 truncate">{topExercise?.[0] || '-'}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{topExercise?.[1] || 0} {lang === 'zh' ? '次' : 'times'}</p>
        </div>
        <div className="bg-white rounded-2xl px-5 py-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">{lang === 'zh' ? '动作种类' : 'Exercises'}</p>
          <p className="text-sm font-bold text-gray-800 mt-1">{uniqueExercises}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{lang === 'zh' ? '种不同动作' : 'unique types'}</p>
        </div>
        <div className="bg-white rounded-2xl px-5 py-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">{lang === 'zh' ? '单日峰值' : 'Best Day'}</p>
          <p className="text-sm font-bold text-gray-800 mt-1">{(bestSession / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-gray-400 mt-0.5">kg {lang === 'zh' ? '容量' : 'volume'}</p>
        </div>
        <div className="bg-white rounded-2xl px-5 py-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">{lang === 'zh' ? '体态评分' : 'Posture'}</p>
          <p className="text-sm font-bold text-gray-800 mt-1">{postureScore !== null ? postureScore : '-'}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">/ 100</p>
        </div>
      </div>

      {/* Wellness + Trends + Radar Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WellnessScore score={wellnessScore} lang={lang} />
        <div className="lg:col-span-2">
          {member.assessments && member.assessments.length > 0 ? (
            <AssessmentTrends assessments={member.assessments} lang={lang} />
          ) : (
            <div className="bg-white rounded-2xl p-6 flex items-center justify-center h-full" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="text-center">
                <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <p className="text-xs text-gray-400">{lang === 'zh' ? '完成首次体态评估后开启趋势追踪' : 'Assessment trends appear after first assessment'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Begin radar */}
      {latestIssues.length > 0 && (
        <PostureRadar issues={latestIssues} lang={lang} />
      )}
      {(member.assessments?.length ?? 0) >= 2 && (
        <CorrelationAnalysis member={member} lang={lang} />
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <HistoryChart workouts={member.workouts} lang={lang} />
          <WorkoutForm lang={lang} onSaveSession={onSaveSession}
            initialDate={editingSession?.date} initialWorkouts={editingSession?.workouts}
            onCancelEdit={onCancelEdit} />
        </div>
        <div className="space-y-5">
          <div className="h-[420px]">
            <WorkoutHistory workouts={member.workouts} lang={lang} filterMonth={filterMonth}
              onUpdateWorkout={onUpdateWorkout} onDeleteWorkout={onDeleteWorkout}
              onEditSession={onEditSession} />
          </div>
          <AIAdvisor member={member} lang={lang} />
          <MemberGoals lang={lang} member={member} />
          <ImageUpload lang={lang} onUpload={onUploadPhoto} currentImage={member.photoUrl} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
