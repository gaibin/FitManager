import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MetricCard from './components/MetricCard';
import WorkoutForm from './components/WorkoutForm';
import HistoryChart from './components/HistoryChart';
import WorkoutHistory from './components/WorkoutHistory';
import AIAdvisor from './components/AIAdvisor';
import ImageUpload from './components/ImageUpload';
import LoginPage from './components/LoginPage';
import { db } from './services/cloudDatabase';
import { seedSampleData } from './services/seedSampleData';
import { exportMemberHistory } from './services/excelService';
import { getCurrentUser, logout, isAuthenticated, isAdmin } from './services/authService';
import { Member, Language, Workout, User } from './types';
import { TRANSLATIONS } from './constants';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [studioName, setStudioName] = useState('NEONFIT STUDIO');
  const [editingName, setEditingName] = useState(false);

  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [editingSession, setEditingSession] = useState<{ date: string; workouts: Workout[] } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 检查登录状态
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchData = async () => {
      try {
        let data: Member[];
        if (isAdmin()) {
          // 管理员：获取所有会员
          data = await db.getMembers();
        } else {
          // 会员：只获取自己的数据
          if (user?.memberId) {
            const allMembers = await db.getMembers();
            const myMember = allMembers.find(m => m.id === user.memberId);
            data = myMember ? [myMember] : [];
          } else {
            data = [];
          }
        }
        setMembers(data);
        if (data.length > 0) setSelectedMemberId(data[0].id);
      } catch (err) {
        console.error('Failed to load members from cloud DB', err);
      }
    };
    fetchData();
  }, [isLoggedIn, user]);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  // Metrics
  const monthlyCount = selectedMember?.workouts.filter(w => w.date.startsWith(filterMonth)).length || 0;
  const maxWeight = selectedMember?.workouts.reduce((max, w) => w.weight > max ? w.weight : max, 0) || 0;
  const totalVolume = selectedMember?.workouts.reduce((sum, w) => sum + (w.weight * w.sets * w.reps), 0) || 0;

  // --- Handlers ---

  const handleAddMember = async (name: string) => {
    const newMember = await db.addMember(name);
    setMembers([...members, newMember]);
    setSelectedMemberId(newMember.id);
  };

  const handleDeleteMember = async (id: string) => {
    await db.deleteMember(id);
    const remaining = members.filter(m => m.id !== id);
    setMembers(remaining);
    if (selectedMemberId === id) {
      setSelectedMemberId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSaveSession = async (workoutsData: (Omit<Workout, 'id'> & { id?: string })[], mode: 'add' | 'edit') => {
    if (!selectedMemberId) return;
    try {
      if (mode === 'edit' && editingSession) {
        // Find existing workout IDs on that date
        const member = members.find(m => m.id === selectedMemberId);
        const originalWorkoutsOnDate = member?.workouts.filter(w => w.date === editingSession.date) || [];

        // Strategy: Delete all existing workouts for this date and insert the new ordered list
        // This is safer for reordering than trying to update individual records
        for (const ow of originalWorkoutsOnDate) {
          await db.deleteWorkout(selectedMemberId, ow.id);
        }

        // Now add the new ones (omitting the IDs to create new records in the correct order)
        const workoutsToInsert = workoutsData.map(({ date, exercise, weight, sets, reps }) => ({
          date, exercise, weight, sets, reps
        }));

        const newWorkouts = await db.addWorkouts(selectedMemberId, workoutsToInsert);

        setMembers(prev => prev.map(m => {
          if (m.id === selectedMemberId) {
            // Remove old ones and add new ones
            const filtered = m.workouts.filter(w => w.date !== editingSession.date);
            const updatedWorkouts = [...filtered, ...newWorkouts].sort((a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            return { ...m, workouts: updatedWorkouts };
          }
          return m;
        }));

        setEditingSession(null);
      } else {
        // Normal add
        const newWorkouts = await db.addWorkouts(selectedMemberId, workoutsData as Omit<Workout, 'id'>[]);
        setMembers(prev => prev.map(m => {
          if (m.id === selectedMemberId) {
            const updatedWorkouts = [...m.workouts, ...newWorkouts].sort((a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            return { ...m, workouts: updatedWorkouts };
          }
          return m;
        }));
      }
    } catch (error) {
      console.error("Failed to save workouts", error);
    }
  };

  const handleUpdateWorkout = async (workout: Workout) => {
    if (!selectedMemberId) return;
    await db.updateWorkout(selectedMemberId, workout);
    setMembers(prev => prev.map(m => {
      if (m.id === selectedMemberId) {
        return {
          ...m,
          workouts: m.workouts.map(w => w.id === workout.id ? workout : w)
        };
      }
      return m;
    }));
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!selectedMemberId) return;
    await db.deleteWorkout(selectedMemberId, workoutId);
    setMembers(prev => prev.map(m => {
      if (m.id === selectedMemberId) {
        return {
          ...m,
          workouts: m.workouts.filter(w => w.id !== workoutId)
        };
      }
      return m;
    }));
  };

  const handleUploadPhoto = async (base64: string) => {
    if (!selectedMemberId) return;
    await db.updateMemberPhoto(selectedMemberId, base64);
    setMembers(prev => prev.map(m => m.id === selectedMemberId ? { ...m, photoUrl: base64 } : m));
  };

  const handleExport = () => {
    if (selectedMember) {
      exportMemberHistory(selectedMember);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const res = await seedSampleData();
      const data = await db.getMembers();
      setMembers(data);
      if (data.length > 0) setSelectedMemberId(data[0].id);
      console.log('Seed result:', res);
    } catch (err) {
      console.error('Seed demo data failed', err);
      alert('导入示例数据失败，请检查 Supabase 配置或网络。');
    } finally {
      setSeeding(false);
    }
  };

  const handleLoginSuccess = () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setIsLoggedIn(false);
    setMembers([]);
    setSelectedMemberId(null);
  };

  // 如果未登录，显示登录页面
  if (!isLoggedIn) {
    return <LoginPage lang={lang} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <HashRouter>
      <div className="flex flex-col md:flex-row h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">

        <Sidebar
          members={members}
          selectedMemberId={selectedMemberId}
          onSelectMember={setSelectedMemberId}
          onAddMember={isAdmin() ? handleAddMember : undefined}
          onDeleteMember={isAdmin() ? handleDeleteMember : undefined}
          lang={lang}
          user={user}
          onLogout={handleLogout}
        />

        <div className="flex-1 flex flex-col h-full overflow-hidden relative">

          <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center px-6 md:px-8 z-10 shrink-0">
            <div className="flex items-center space-x-4">
              {editingName ? (
                <input
                  autoFocus
                  className="bg-zinc-900 border border-zinc-700 text-lime-400 text-xl font-bold px-2 py-1 rounded focus:outline-none"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                />
              ) : (
                <h1
                  onClick={() => setEditingName(true)}
                  className="text-xl md:text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-500 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {studioName}
                </h1>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-zinc-500">
                {user?.role === 'admin' ? (lang === 'zh' ? '管理员' : 'Admin') : (lang === 'zh' ? '会员' : 'Member')}: {user?.username}
              </span>
              <button
                onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-lime-500 transition-colors uppercase"
              >
                {lang === 'en' ? 'EN / 中文' : '中文 / EN'}
              </button>
              <button
                onClick={handleLogout}
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-red-500 transition-colors"
              >
                {lang === 'zh' ? '退出' : 'Logout'}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
            {selectedMember ? (
              <>
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center -mb-2 gap-4">
                  {/* Actions Row */}
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
                      onChange={(e) => setFilterMonth(e.target.value)}
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
                    <HistoryChart workouts={selectedMember.workouts} lang={lang} />
                    {isAdmin() && (
                      <WorkoutForm
                        lang={lang}
                        onSaveSession={handleSaveSession}
                        initialDate={editingSession?.date}
                        initialWorkouts={editingSession?.workouts}
                        onCancelEdit={() => setEditingSession(null)}
                      />
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="h-96">
                      <WorkoutHistory
                        workouts={selectedMember.workouts}
                        lang={lang}
                        filterMonth={filterMonth}
                        onUpdateWorkout={isAdmin() ? handleUpdateWorkout : undefined}
                        onDeleteWorkout={isAdmin() ? handleDeleteWorkout : undefined}
                        onEditSession={isAdmin() ? (date, workouts) => setEditingSession({ date, workouts }) : undefined}
                      />
                    </div>
                    <AIAdvisor member={selectedMember} lang={lang} />
                    {isAdmin() && (
                      <ImageUpload
                        lang={lang}
                        onUpload={handleUploadPhoto}
                        currentImage={selectedMember.photoUrl}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <div className="space-y-3 text-center">
                  <div>{TRANSLATIONS.selectMember[lang]}</div>
                  <button
                    onClick={handleSeedDemo}
                    disabled={seeding}
                    className="bg-lime-500 hover:bg-lime-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-bold px-4 py-2 rounded-lg transition-all"
                  >
                    {seeding ? '导入中...' : '一键导入示例数据到云端'}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;