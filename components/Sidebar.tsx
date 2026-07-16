import React, { useState } from 'react';
import { Member, Language, User } from '../types';
import { TRANSLATIONS } from '../constants';

interface SidebarProps {
  members: Member[];
  selectedMemberId: string | null;
  onSelectMember: (id: string | null) => void;
  onAddMember?: (name: string) => Promise<void>;
  onDeleteMember?: (id: string) => void;
  memberLoadError?: string;
  memberLoading?: boolean;
  onRetryMembers?: () => void;
  lang: Language;
  user?: User | null;
  onLogout?: () => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const NAV_ITEMS = [
  { path: '/', icon: 'M3 10h4v11H3V10zm7-7h4v18h-4V3zm7 4h4v14h-4V7z', labelEn: 'Dashboard', labelZh: '仪表盘' },
  { path: '/posture', icon: 'M12 7a4 4 0 100-8 4 4 0 000 8zm-7 14c0-3.86 3.14-7 7-7s7 3.14 7 7', labelEn: 'Posture', labelZh: '体态评估' },
  { path: '/report', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5V8H9l4-4.5z', labelEn: 'Report', labelZh: '报告导出' },
  { path: '/settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7.4.76a1.6 1.6 0 01-.33 1.82l-.06.06a2 2 0 01-2.83 0l-.06-.06a1.6 1.6 0 00-1.82-.33 1.6 1.6 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.6 1.6 0 00-1-1.51 1.6 1.6 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.6 1.6 0 004.68 15a1.6 1.6 0 00-1.51-1H3a2 2 0 010-4h.09A1.6 1.6 0 004.6 9a1.6 1.6 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.6 1.6 0 009 4.68a1.6 1.6 0 001-1.51V3a2 2 0 014 0v.09a1.6 1.6 0 001 1.51 1.6 1.6 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.6 1.6 0 0019.4 9a1.6 1.6 0 001.51 1H21a2 2 0 010 4h-.09a1.6 1.6 0 00-1.51 1z', labelEn: 'Settings', labelZh: '设置' },
];

const Sidebar: React.FC<SidebarProps> = ({
  members, selectedMemberId, onSelectMember, onAddMember, onDeleteMember,
  memberLoadError, memberLoading, onRetryMembers,
  lang, user, onLogout, currentPath = '/', onNavigate,
  mobileOpen = false, onMobileClose,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = search.trim()
    ? members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : members;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (members.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(TRANSLATIONS.memberExists[lang]);
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (!onAddMember) return;
    setIsSubmitting(true);
    setError('');
    try {
      await onAddMember(trimmed);
      setNewName('');
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '新增会员失败，请稍后重试' : 'Failed to add member. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(TRANSLATIONS.confirmDelete[lang])) onDeleteMember?.(id);
  };

  return (
    <aside
      aria-label={lang === 'zh' ? '主导航与会员列表' : 'Main navigation and members'}
      className={`${mobileOpen ? 'flex' : 'hidden'} lg:flex fixed inset-y-0 left-0 z-50 h-[100dvh] w-[min(88vw,20rem)] flex-col overflow-hidden border-r border-black/5 shadow-2xl lg:relative lg:z-20 lg:h-full lg:w-72 lg:shadow-none`}
      style={{ background: 'rgba(250,250,252,0.96)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' }}>
      <div className="px-7 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-gray-800">NeonFit</h1>
            <p className="text-[10px] font-medium tracking-wider text-gray-400">STUDIO MANAGER</p>
          </div>
          <button type="button" onClick={onMobileClose}
            aria-label={lang === 'zh' ? '关闭菜单' : 'Close menu'}
            className="ml-auto grid h-9 w-9 place-items-center rounded-xl bg-black/[0.04] text-gray-500 lg:hidden">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <nav className="px-4 space-y-0.5 mb-4">
        {NAV_ITEMS.map(item => (
          <button key={item.path} onClick={() => { onNavigate?.(item.path); onMobileClose?.(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              currentPath === item.path ? 'text-white shadow-sm scale-press' : 'text-gray-500 hover:text-gray-800 hover:bg-black/[0.03]'
            }`}
            style={currentPath === item.path ? { background: 'linear-gradient(135deg, #007AFF, #5856D6)' } : {}}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d={item.icon}/></svg>
            <span>{lang === 'zh' ? item.labelZh : item.labelEn}</span>
          </button>
        ))}
      </nav>

      <div className="px-7 py-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 select-none">Members</span>
        {onAddMember && (
          <button onClick={() => setIsAdding(!isAdding)} className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-black/[0.04] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isAdding ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"}/></svg>
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAddSubmit} className="px-4 pt-2 pb-1">
          <input autoFocus type="text" name="new-member-display-name" autoComplete="off" value={newName} onChange={e => setNewName(e.target.value)} placeholder={TRANSLATIONS.newMemberName[lang]}
            className="w-full bg-black/[0.03] border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/10 transition-all text-gray-800 mb-1.5" />
          {error && <p className="text-[#FF3B30] text-[11px] mb-1.5 font-medium">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full bg-[#007AFF] hover:bg-[#0066d6] disabled:opacity-60 text-white text-xs font-semibold py-2 rounded-xl transition-colors scale-press">
            {isSubmitting ? (lang === 'zh' ? '正在添加…' : 'Adding…') : TRANSLATIONS.addMember[lang]}
          </button>
        </form>
      )}

      {memberLoadError && (
        <div className="mx-4 mt-2 rounded-xl border border-[#FF3B30]/15 bg-[#FF3B30]/5 px-3 py-2">
          <p className="text-[11px] leading-relaxed text-[#C9342C]">{lang === 'zh' ? '云端会员数据暂不可用' : 'Cloud member data is unavailable'}</p>
          <button type="button" onClick={onRetryMembers} className="mt-1 text-[11px] font-semibold text-[#007AFF]">
            {lang === 'zh' ? '重新连接' : 'Retry'}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5">
        {memberLoading && <p className="px-3 py-2 text-[11px] text-gray-400">{lang === 'zh' ? '正在加载会员…' : 'Loading members…'}</p>}
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2"/><path strokeLinecap="round" d="M21 21l-4.35-4.35" strokeWidth="2"/></svg>
          <input type="search" name="member-list-filter" autoComplete="off" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'zh' ? '\u641c\u7d22\u4f1a\u5458...' : 'Search members...'}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-800 outline-none focus:border-[#007AFF]/30 transition-all" />
        </div>
        {filtered.map(m => (
          <div key={m.id} onClick={() => { onSelectMember(m.id); onNavigate?.('/'); onMobileClose?.(); }}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group ${
              selectedMemberId === m.id ? 'bg-[#007AFF]/8' : 'hover:bg-black/[0.03]'
            }`}>
            <div className="relative shrink-0">
              <img src={m.avatar} alt={m.name}
                className={`w-9 h-9 rounded-xl object-cover transition-all ${selectedMemberId === m.id ? 'ring-2 ring-[#007AFF]/30' : ''}`} />
              {selectedMemberId === m.id && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#34C759] border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-800">{m.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{m.heightCm}cm &middot; {m.gender === 'male' ? (lang === 'zh' ? '\u7537' : 'Male') : (lang === 'zh' ? '\u5973' : 'Female')}</p>
            </div>
            {selectedMemberId === m.id && <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />}
            {onDeleteMember && (
              <button onClick={e => handleDelete(e, m.id)}
                className="absolute right-2 p-1.5 rounded-lg text-gray-400 hover:text-[#FF3B30] hover:bg-[#FF3B30]/5 opacity-0 group-hover:opacity-100 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {user && (
        <div className="p-4 border-t border-black/[0.04]">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #5856D6, #007AFF)' }}>
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.username}</p>
              <p className="text-[10px] text-gray-400">{user.role === 'admin' ? (lang === 'zh' ? '\u7ba1\u7406\u5458' : 'Admin') : (lang === 'zh' ? '\u4f1a\u5458' : 'Member')}</p>
            </div>
            {onLogout && (
              <button onClick={onLogout} className="text-gray-400 hover:text-[#FF3B30] transition-colors p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
