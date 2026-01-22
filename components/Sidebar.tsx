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
}

const Sidebar: React.FC<SidebarProps> = ({ 
  members, 
  selectedMemberId, 
  onSelectMember, 
  onAddMember,
  onDeleteMember,
  lang,
  user,
  onLogout
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newName.trim();
    
    if (!nameTrimmed) return;

    // Check for duplicates
    const exists = members.some(m => m.name.toLowerCase() === nameTrimmed.toLowerCase());
    if (exists) {
      setError(TRANSLATIONS.memberExists[lang]);
      setTimeout(() => setError(''), 3000);
      return;
    }

    onAddMember(nameTrimmed);
    setNewName('');
    setError('');
    setIsAdding(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(TRANSLATIONS.confirmDelete[lang])) {
      onDeleteMember(id);
    }
  };

  return (
    <div className="w-full md:w-64 bg-zinc-950 border-r border-zinc-800 h-full flex flex-col fixed md:relative z-20 overflow-y-auto">
      <div className="p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-950 z-10">
        <h2 className="text-xl font-bold text-lime-400 tracking-wider uppercase">
          {TRANSLATIONS.members[lang]}
        </h2>
        {onAddMember && (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isAdding ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
            </svg>
          </button>
        )}
      </div>

      {isAdding && onAddMember && (
        <form onSubmit={handleAddSubmit} className="p-4 bg-zinc-900 border-b border-zinc-800 animate-in slide-in-from-top-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={TRANSLATIONS.newMemberName[lang]}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-lime-500 outline-none mb-2"
          />
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <button type="submit" className="w-full bg-lime-500 text-black text-xs font-bold py-1.5 rounded">
            {TRANSLATIONS.addMember[lang]}
          </button>
        </form>
      )}

      <div className="flex-1 p-4 space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            onClick={() => onSelectMember(member.id)}
            className={`relative w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group cursor-pointer ${
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
            <span className="font-medium truncate flex-1">{member.name}</span>
            
            {/* Delete Button (visible on hover, only for admin) */}
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