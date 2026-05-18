import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PostureAssess from './components/PostureAssess';
import MemberReport from './components/MemberReport';
import Settings from './components/Settings';
import LoginPage from './components/LoginPage';
import { db as cloudDb } from './services/cloudDatabase';
import { db as mockDb } from './services/mockDatabase';
import { db as localDb } from './services/localDatabase';
import { getCurrentUser, logout, isAuthenticated, isAdmin } from './services/authService';
import { Member, Language, Workout, User, PostureAssessment } from './types';
import { TRANSLATIONS } from './constants';

// 根据环境选择数据库
const dbMode = import.meta.env.VITE_DB_MODE || 'mock';
const db = dbMode === 'cloud' ? cloudDb : dbMode === 'local' ? localDb : mockDb;

// 临时：开发模式跳过登录
const DEV_SKIP_AUTH = true;

interface AppContentProps {
  lang: Language;
  setLang: React.Dispatch<React.SetStateAction<Language>>;
  studioName: string;
  setStudioName: React.Dispatch<React.SetStateAction<string>>;
  editingName: boolean;
  setEditingName: React.Dispatch<React.SetStateAction<boolean>>;
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  selectedMemberId: string | null;
  setSelectedMemberId: React.Dispatch<React.SetStateAction<string | null>>;
  user: User | null;
  handleLogout: () => void;
  handleAddMember: (name: string) => Promise<void>;
  handleDeleteMember: (id: string) => Promise<void>;
  handleSaveSession: (workoutsData: (Omit<Workout, 'id'> & { id?: string })[], mode: 'add' | 'edit') => Promise<void>;
  handleUpdateWorkout: (workout: Workout) => Promise<void>;
  handleDeleteWorkout: (workoutId: string) => Promise<void>;
  handleUploadPhoto: (base64: string) => Promise<void>;
  handleSaveAssessment: (assessment: PostureAssessment) => Promise<void>;
  filterMonth: string;
  setFilterMonth: React.Dispatch<React.SetStateAction<string>>;
  editingSession: { date: string; workouts: Workout[] } | null;
  setEditingSession: React.Dispatch<React.SetStateAction<{ date: string; workouts: Workout[] } | null>>;
}

const AppContent: React.FC<AppContentProps> = ({
  lang, setLang, studioName, setStudioName, editingName, setEditingName,
  members, setMembers, selectedMemberId, setSelectedMemberId,
  user, handleLogout, handleAddMember, handleDeleteMember,
  handleSaveSession, handleUpdateWorkout, handleDeleteWorkout,
  handleUploadPhoto, handleSaveAssessment, filterMonth, setFilterMonth,
  editingSession, setEditingSession,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const isAdminUser = DEV_SKIP_AUTH || isAdmin();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <Sidebar
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
        onAddMember={isAdminUser ? handleAddMember : undefined}
        onDeleteMember={isAdminUser ? handleDeleteMember : undefined}
        lang={lang}
        user={user}
        onLogout={handleLogout}
        currentPath={location.pathname}
        onNavigate={(path) => navigate(path)}
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
          <Routes>
            <Route path="/" element={
              selectedMember ? (
                <Dashboard
                  lang={lang}
                  member={selectedMember}
                  filterMonth={filterMonth}
                  onFilterMonthChange={setFilterMonth}
                  onSaveSession={handleSaveSession}
                  onUpdateWorkout={isAdminUser ? handleUpdateWorkout : async () => {}}
                  onDeleteWorkout={isAdminUser ? handleDeleteWorkout : async () => {}}
                  onUploadPhoto={isAdminUser ? handleUploadPhoto : async () => {}}
                  editingSession={editingSession}
                  onEditSession={isAdminUser ? (date, workouts) => setEditingSession({ date, workouts }) : () => {}}
                  onCancelEdit={() => setEditingSession(null)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <div className="text-center space-y-3">
                    <div className="text-xl font-bold text-zinc-400">
                      {TRANSLATIONS.selectMember[lang]}
                    </div>
                  </div>
                </div>
              )
            } />
            <Route path="/posture" element={
              selectedMember ? (
                <PostureAssess
                  lang={lang}
                  memberId={selectedMember.id}
                  memberName={selectedMember.name}
                  heightCm={selectedMember.heightCm}
                  gender={selectedMember.gender}
                  onSaveAssessment={handleSaveAssessment}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <div className="text-xl font-bold text-zinc-400">{TRANSLATIONS.selectMember[lang]}</div>
                </div>
              )
            } />
            <Route path="/report" element={
              selectedMember ? (
                <MemberReport lang={lang} member={selectedMember} studioName={studioName} />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <div className="text-xl font-bold text-zinc-400">{TRANSLATIONS.selectMember[lang]}</div>
                </div>
              )
            } />
            <Route path="/settings" element={<Settings lang={lang} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [studioName, setStudioName] = useState('NEONFIT STUDIO');
  const [editingName, setEditingName] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<{ date: string; workouts: Workout[] } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 检查登录状态 (开发模式跳过)
  useEffect(() => {
    if (DEV_SKIP_AUTH) {
      setUser({ id: 'dev', username: 'dev', role: 'admin' });
      setIsLoggedIn(true);
      return;
    }
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
        if (DEV_SKIP_AUTH || isAdmin()) {
          data = await db.getMembers();
        } else {
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
        console.error('Failed to load members', err);
      }
    };
    fetchData();
  }, [isLoggedIn, user]);

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
        const member = members.find(m => m.id === selectedMemberId);
        const originalWorkoutsOnDate = member?.workouts.filter(w => w.date === editingSession.date) || [];

        for (const ow of originalWorkoutsOnDate) {
          await db.deleteWorkout(selectedMemberId, ow.id);
        }

        const workoutsToInsert = workoutsData.map(({ date, exercise, weight, sets, reps }) => ({
          date, exercise, weight, sets, reps
        }));

        const newWorkouts = await db.addWorkouts(selectedMemberId, workoutsToInsert);

        setMembers(prev => prev.map(m => {
          if (m.id === selectedMemberId) {
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

  const handleSaveAssessment = async (assessment: PostureAssessment) => {
    if (!selectedMemberId) return;
    await db.saveAssessment(selectedMemberId, assessment);
    setMembers(prev => prev.map(m => {
      if (m.id === selectedMemberId) {
        const existingIdx = m.assessments.findIndex(a => a.date === assessment.date);
        const updated = [...m.assessments];
        if (existingIdx >= 0) {
          updated[existingIdx] = assessment;
        } else {
          updated.unshift(assessment);
        }
        return { ...m, assessments: updated };
      }
      return m;
    }));
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

  if (!isLoggedIn) {
    return <LoginPage lang={lang} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <HashRouter>
      <AppContent
        lang={lang} setLang={setLang}
        studioName={studioName} setStudioName={setStudioName}
        editingName={editingName} setEditingName={setEditingName}
        members={members} setMembers={setMembers}
        selectedMemberId={selectedMemberId} setSelectedMemberId={setSelectedMemberId}
        user={user} handleLogout={handleLogout}
        handleAddMember={handleAddMember} handleDeleteMember={handleDeleteMember}
        handleSaveSession={handleSaveSession} handleUpdateWorkout={handleUpdateWorkout}
        handleDeleteWorkout={handleDeleteWorkout} handleUploadPhoto={handleUploadPhoto} handleSaveAssessment={handleSaveAssessment}
        filterMonth={filterMonth} setFilterMonth={setFilterMonth}
        editingSession={editingSession} setEditingSession={setEditingSession}
      />
    </HashRouter>
  );
};

export default App;
