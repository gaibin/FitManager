import React, { useState } from 'react';
import { Member, Language, User } from '../types';
import { TRANSLATIONS } from '../constants';

interface SidebarProps {
  members: Member[];
  selectedMemberId: string | null;
  onSelectMember: (id: string | null) => void;
  onAddMember?: (name: string) => void;
  onDeleteMember?: (id: string) => void;
  lang: Language;
  user?: User | null;
  onLogout?: () => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const NAV_ITEMS = [
  {
    path: '/',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    labelKey: 'navDashboard',
    labelEn: 'Dashboard',
    labelZh: '仪表盘',
  },
  {
    path: '/posture',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    labelKey: 'navPosture',
    labelEn: 'Posture Assessment',
    labelZh: '体态评估',
  },
  {
    path: '/report',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    labelKey: 'navReport',
    labelEn: 'Report',
    labelZh: '报告导出',
  },
  {
    path: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    labelKey: 'navSettings',
    labelEn: 'Settings',
    labelZh: '设置',
  },
];

const Sidebar: React.FC<SidebarProps> = ({ 
  members, 
  selectedMemberId, 
  onSelectMember, 
  onAddMember,
  onDeleteMember,
  lang,
  user,
  onLogout,
  currentPath = '/',
  onNavigate,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newName.trim();
    
    if (!nameTrimmed) return;

    const exists = members.some(m => m.name.toLowerCase() === nameTrimmed.toLowerCase());
    if (exists) {
      setError(TRANSLATIONS.memberExists[lang]);
      setTimeout(() => setError(''), 3000);
      return;
    }

    onAddMember?.(nameTrimmed);
    setNewName('');
    setError('');
    setIsAdding(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(TRANSLATIONS.confirmDelete[lang])) {
      onDeleteMember?.(id);
    }
  };

  const getNavLabel = (item: typeof NAV_ITEMS[0]) => {
    return lang === 'zh' ? item.labelZh : item.labelEn;
  };

  return (
    <div className="w-full md:w-64 bg-zinc-950 border-r border-zinc-800 h-full flex flex-col fixed md:relative z-20 overflow-y-auto">
      {/* 导航菜单 */}
      <div className="p-4 border-b border-zinc-800 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => onNavigate?.(item.path)}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
              currentPath === item.path
                ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <span className={currentPath === item.path ? 'text-lime-400' : 'text-zinc-500'}>{item.icon}</span>
            <span>{getNavLabel(item)}</span>
          </button>
        ))}
      </div>

      {/* 会员列表标题 */}
      <div className="p-6 pb-2 flex justify-between items-center">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          {TRANSLATIONS.members[lang]}
        </h2>
        {onAddMember && (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="text-zinc-500 hover:text-lime-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isAdding ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
            </svg>
          </button>
        )}
      </div>

      {isAdding && onAddMember && (
        <form onSubmit={handleAddSubmit} className="px-4 pb-3">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={TRANSLATIONS.newMemberName[lang]}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-lime-500 outline-none mb-2"
          />
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <button type="submit" className="w-full bg-lime-500 text-black text-xs font-bold py-1.5 rounded">
            {TRANSLATIONS.addMember[lang]}
          </button>
        </form>
      )}

      <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {members.map((member) => (
          <div
            key={member.id}
            onClick={() => { onSelectMember(member.id); onNavigate?.('/'); }}
            className={`relative w-full flex items-center space-x-3 p-2.5 rounded-xl transition-all duration-200 group cursor-pointer ${
              selectedMemberId === member.id
                ? 'bg-lime-500/10 border border-lime-500/50 text-white'
                : 'hover:bg-zinc-900 text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="relative">
              <img
                src={member.avatar}
                alt={member.name}
                className={`w-10 h-10 rounded-full object-cover border-2 ${
                    selectedMemberId === member.id ? 'border-lime-400' : 'border-zinc-700'
                }`}
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-lime-500 rounded-full border-2 border-zinc-950"></div>
            </div>
            <span className="font-medium truncate flex-1 text-sm">{member.name}</span>
            
            {onDeleteMember && (
              <button
                onClick={(e) => handleDelete(e, member.id)}
                className="absolute right-2 p-1 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Member"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* User Info & Logout */}
      {user && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="text-xs text-zinc-500 mb-2">
            {lang === 'zh' ? '当前用户' : 'Current User'}
          </div>
          <div className="text-sm font-medium text-zinc-200 mb-2">
            {user.username} ({user.role === 'admin' ? (lang === 'zh' ? '管理员' : 'Admin') : (lang === 'zh' ? '会员' : 'Member')})
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full text-xs text-red-400 hover:text-red-300 py-2 px-3 rounded-lg border border-red-500/30 hover:border-red-500/50 transition-colors"
            >
              {lang === 'zh' ? '退出登录' : 'Logout'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
