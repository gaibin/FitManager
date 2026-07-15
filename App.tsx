/**
 * 应用根组件 — 路由 + 状态管理 + 页面分发
 * 状态逻辑已拆分为自定义 hooks: useAuth / useMembers / useWorkouts
 */

import React, { useState, lazy, Suspense, useEffect } from 'react';
import { HashRouter, useNavigate, useLocation } from 'react-router-dom';
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
import { useUndo } from './components/UndoProvider';
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
  studioBrand: { logo?: string; coachName?: string; accentColor?: string };
  setStudioBrand: React.Dispatch<React.SetStateAction<{ logo?: string; coachName?: string; accentColor?: string }>>;
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
  memberLoadError: string;
  memberLoading: boolean;
  reloadMembers: () => Promise<void>;
}

const AppContent: React.FC<AppContentProps> = ({
  lang, setLang, studioName, setStudioName, studioBrand, setStudioBrand,
  editingName, setEditingName,
  members, selectedMemberId, setSelectedMemberId,
  user, isAdmin, handleLogout, handleAddMember, handleDeleteMember,
  handleSaveSession, handleUpdateWorkout, handleDeleteWorkout,
  handleUploadPhoto, handleSaveAssessment, filterMonth, setFilterMonth,
  editingSession, setEditingSession,
  memberLoadError, memberLoading, reloadMembers,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden font-sans" style={{ backgroundColor: '#f5f5f7' }}>
      <Sidebar
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
        onAddMember={isAdmin ? handleAddMember : undefined}
        onDeleteMember={isAdmin ? handleDeleteMember : undefined}
        memberLoadError={memberLoadError}
        memberLoading={memberLoading}
        onRetryMembers={() => { void reloadMembers(); }}
        lang={lang}
        user={user}
        onLogout={handleLogout}
        currentPath={location.pathname}
        onNavigate={(path) => navigate(path)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="glass h-16 border-b border-black/[0.04] flex justify-between items-center px-6 md:px-8 z-10 shrink-0">
          <div className="flex items-center space-x-4">
            {studioBrand.logo && <img src={studioBrand.logo} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />}
            {editingName ? (
              <input autoFocus
                className="bg-gray-100 border border-gray-200 text-[#007AFF] text-lg font-bold px-3 py-1 rounded-xl outline-none focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                value={studioName} onChange={(e) => setStudioName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)} />
            ) : (
              <h1 onClick={() => setEditingName(true)}
                className="text-lg font-extrabold tracking-tight text-gray-800 cursor-pointer hover:opacity-70 transition-opacity select-none">
                {studioName}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-400">
              {user?.role === 'admin' ? (lang === 'zh' ? '管理员' : 'Admin') : (lang === 'zh' ? '会员' : 'Member')}: {user?.username}
            </span>
            <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-all">
              {lang === 'en' ? '中文' : 'EN'}
            </button>
            <button onClick={handleLogout}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-full text-gray-400 hover:text-[#FF3B30] hover:bg-[#FF3B30]/5 transition-all">
              {lang === 'zh' ? '退出' : 'Logout'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
          {/* 全部页面保持挂载，避免切换时丢失状态 */}
          <div style={{ display: location.pathname === '/' ? 'block' : 'none' }} className="animate-in">
            {selectedMember ? (
              <Dashboard
                lang={lang} member={selectedMember} filterMonth={filterMonth}
                onFilterMonthChange={setFilterMonth} onSaveSession={handleSaveSession}
                onUpdateWorkout={isAdmin ? handleUpdateWorkout : async () => {}}
                onDeleteWorkout={isAdmin ? handleDeleteWorkout : async () => {}}
                onUploadPhoto={isAdmin ? handleUploadPhoto : async () => {}}
                editingSession={editingSession}
                onEditSession={isAdmin ? (date, workouts) => setEditingSession({ date, workouts }) : () => {}}
                onCancelEdit={() => setEditingSession(null)}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-base font-semibold text-gray-400">{TRANSLATIONS.selectMember[lang]}</div>
              </div>
            )}
          </div>
          <div style={{ display: location.pathname === '/posture' ? 'block' : 'none' }} className="animate-in">
            {selectedMember ? (
              <PostureAssess
                lang={lang} memberId={selectedMember.id} memberName={selectedMember.name}
                heightCm={selectedMember.heightCm} gender={selectedMember.gender}
                onSaveAssessment={handleSaveAssessment}
                previousAssessment={selectedMember.assessments?.[1]}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-base font-semibold text-gray-400">{TRANSLATIONS.selectMember[lang]}</div>
              </div>
            )}
          </div>
          <div style={{ display: location.pathname === '/report' ? 'block' : 'none' }} className="animate-in">
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-[#007AFF]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <span className="text-sm text-gray-400">{lang === 'zh' ? '加载中...' : 'Loading...'}</span>
                </div>
              </div>
            }>
              {selectedMember ? (
                <MemberReport lang={lang} member={selectedMember} studioName={studioName} studioBrand={studioBrand} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-base font-semibold text-gray-400">{TRANSLATIONS.selectMember[lang]}</div>
                </div>
              )}
            </Suspense>
          </div>
          <div style={{ display: location.pathname === '/settings' ? 'block' : 'none' }} className="animate-in">
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-[#007AFF]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <span className="text-sm text-gray-400">{lang === 'zh' ? '加载中...' : 'Loading...'}</span>
                </div>
              </div>
            }>
              <Settings lang={lang} studioName={studioName} onStudioUpdate={(name, coach, logo) => { setStudioName(name); setStudioBrand(prev => ({ ...prev, coachName: coach, logo })); }} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [studioName, setStudioName] = useState('NEONFIT STUDIO');
  const [studioBrand, setStudioBrand] = useState<{ logo?: string; coachName?: string; accentColor?: string }>({});
  const [editingName, setEditingName] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  // 加载已保存的品牌设置
  useEffect(() => {
    (async () => {
      try {
        const c = await db.getStudioConfig();
        if (c) {
          if (c.name) setStudioName(c.name);
          setStudioBrand({ logo: c.logo, coachName: c.coachName, accentColor: c.accentColor });
        }
      } catch {}
    })();
  }, []);

  const undo = useUndo();

  // 自定义 hooks 替代原来散落在 App 中的状态
  const auth = useAuth();
  const members = useMembers({
    db, isAdmin: auth.isAdmin, userId: auth.user?.memberId,
    onMemberDeleted: (m) => undo.pushUndo({
      key: `del-member-${m.id}`,
      message: `${m.name} ${lang === 'zh' ? '已删除' : 'deleted'}`,
      undo: async () => { await db.addMember(m.name, { joinDate: m.joinDate, avatar: m.avatar, gender: m.gender, heightCm: m.heightCm }); members.setMembers(prev => [...prev, m]); },
    }),
  });
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
        studioBrand={studioBrand} setStudioBrand={setStudioBrand}
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
        memberLoadError={members.loadError}
        memberLoading={members.isLoading}
        reloadMembers={members.reload}
      />
    </HashRouter>
  );
};

export default App;
