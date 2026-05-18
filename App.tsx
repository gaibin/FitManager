/**
 * 应用根组件 — 路由 + 状态管理 + 页面分发
 * 状态逻辑已拆分为自定义 hooks: useAuth / useMembers / useWorkouts
 */

import React, { useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PostureAssess from './components/PostureAssess';
import LoginPage from './components/LoginPage';
import { db as cloudDb } from './services/cloudDatabase';
import { db as mockDb } from './services/mockDatabase';
import { db as localDb } from './services/localDatabase';
import { useAuth } from './hooks/useAuth';
import { useMembers } from './hooks/useMembers';
import { useWorkouts } from './hooks/useWorkouts';
import { Language, Workout } from './types';
import { TRANSLATIONS } from './constants';

// 按需加载：Report 组件 + PDF 生成库（jsPDF/html2canvas）只在导出时加载
const MemberReport = lazy(() => import('./components/MemberReport'));
// 按需加载：设置页（含 AI 配置）
const Settings = lazy(() => import('./components/Settings'));

// 根据环境选择数据库
const dbMode = import.meta.env.VITE_DB_MODE || 'mock';
const db = dbMode === 'cloud' ? cloudDb : dbMode === 'local' ? localDb : mockDb;

interface AppContentProps {
  lang: Language;
  setLang: React.Dispatch<React.SetStateAction<Language>>;
  studioName: string;
  setStudioName: React.Dispatch<React.SetStateAction<string>>;
  editingName: boolean;
  setEditingName: React.Dispatch<React.SetStateAction<boolean>>;
  members: any[];
  setMembers: React.Dispatch<React.SetStateAction<any[]>>;
  selectedMemberId: string | null;
  setSelectedMemberId: React.Dispatch<React.SetStateAction<string | null>>;
  user: any;
  isAdmin: boolean;
  handleLogout: () => void;
  handleAddMember: (name: string) => Promise<void>;
  handleDeleteMember: (id: string) => Promise<void>;
  handleSaveSession: (workouts: (Omit<Workout, 'id'> & { id?: string })[], mode: 'add' | 'edit') => Promise<void>;
  handleUpdateWorkout: (workout: Workout) => Promise<void>;
  handleDeleteWorkout: (workoutId: string) => Promise<void>;
  handleUploadPhoto: (base64: string) => Promise<void>;
  handleSaveAssessment: (assessment: any) => Promise<void>;
  filterMonth: string;
  setFilterMonth: React.Dispatch<React.SetStateAction<string>>;
  editingSession: { date: string; workouts: Workout[] } | null;
  setEditingSession: React.Dispatch<React.SetStateAction<{ date: string; workouts: Workout[] } | null>>;
}

const AppContent: React.FC<AppContentProps> = ({
  lang, setLang, studioName, setStudioName, editingName, setEditingName,
  members, selectedMemberId, setSelectedMemberId,
  user, isAdmin, handleLogout, handleAddMember, handleDeleteMember,
  handleSaveSession, handleUpdateWorkout, handleDeleteWorkout,
  handleUploadPhoto, handleSaveAssessment, filterMonth, setFilterMonth,
  editingSession, setEditingSession,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <Sidebar
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
        onAddMember={isAdmin ? handleAddMember : undefined}
        onDeleteMember={isAdmin ? handleDeleteMember : undefined}
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
                  onUpdateWorkout={isAdmin ? handleUpdateWorkout : async () => {}}
                  onDeleteWorkout={isAdmin ? handleDeleteWorkout : async () => {}}
                  onUploadPhoto={isAdmin ? handleUploadPhoto : async () => {}}
                  editingSession={editingSession}
                  onEditSession={isAdmin ? (date, workouts) => setEditingSession({ date, workouts }) : () => {}}
                  onCancelEdit={() => setEditingSession(null)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <div className="text-center space-y-3">
                    <div className="text-xl font-bold text-zinc-400">{TRANSLATIONS.selectMember[lang]}</div>
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
              <Suspense fallback={
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <div className="flex items-center space-x-3">
                    <svg className="animate-spin h-5 w-5 text-lime-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>{lang === 'zh' ? '加载报告中...' : 'Loading report...'}</span>
                  </div>
                </div>
              }>
                {selectedMember ? (
                  <MemberReport lang={lang} member={selectedMember} studioName={studioName} />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-500">
                    <div className="text-xl font-bold text-zinc-400">{TRANSLATIONS.selectMember[lang]}</div>
                  </div>
                )}
              </Suspense>
            } />
            <Route path="/settings" element={
              <Suspense fallback={
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <div className="flex items-center space-x-3">
                    <svg className="animate-spin h-5 w-5 text-lime-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>{lang === 'zh' ? '加载中...' : 'Loading...'}</span>
                  </div>
                </div>
              }>
                <Settings lang={lang} />
              </Suspense>
            } />
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

  // 自定义 hooks 替代原来散落在 App 中的状态
  const auth = useAuth();
  const members = useMembers({ db, isAdmin: auth.isAdmin, userId: auth.user?.memberId });
  const workouts = useWorkouts({
    db,
    selectedMemberId: members.selectedMemberId,
    setMembers: members.setMembers,
  });

  if (!auth.isLoggedIn) {
    return <LoginPage lang={lang} onLoginSuccess={auth.handleLoginSuccess} />;
  }

  return (
    <HashRouter>
      <AppContent
        lang={lang} setLang={setLang}
        studioName={studioName} setStudioName={setStudioName}
        editingName={editingName} setEditingName={setEditingName}
        members={members.members}
        setMembers={members.setMembers}
        selectedMemberId={members.selectedMemberId}
        setSelectedMemberId={members.setSelectedMemberId}
        user={auth.user}
        isAdmin={auth.isAdmin}
        handleLogout={auth.handleLogout}
        handleAddMember={members.handleAddMember}
        handleDeleteMember={members.handleDeleteMember}
        handleSaveSession={workouts.handleSaveSession}
        handleUpdateWorkout={workouts.handleUpdateWorkout}
        handleDeleteWorkout={workouts.handleDeleteWorkout}
        handleUploadPhoto={workouts.handleUploadPhoto}
        handleSaveAssessment={workouts.handleSaveAssessment}
        filterMonth={filterMonth} setFilterMonth={setFilterMonth}
        editingSession={workouts.editingSession}
        setEditingSession={workouts.setEditingSession}
      />
    </HashRouter>
  );
};

export default App;
