/**
 * 会员数据管理 hook — 负责会员列表的加载、增删、选中
 */

import { useState, useEffect, useCallback } from 'react';
import type { Member, NewMemberProfile } from '../types';

interface UseMembersOptions {
  db: {
    getMembers: () => Promise<Member[]>;
    addMember: (name: string, options?: Omit<NewMemberProfile, 'name'>) => Promise<Member>;
    deleteMember: (id: string) => Promise<void>;
  };
  isAdmin: boolean;
  userId?: string;
  onMemberDeleted?: (member: Member) => void;
}

export function useMembers({ db, isAdmin, userId, onMemberDeleted }: UseMembersOptions) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      let data: Member[];
      if (isAdmin) { data = await db.getMembers(); }
      else if (userId) { const all = await db.getMembers(); const m = all.find(x => x.id === userId); data = m ? [m] : []; }
      else { data = []; }
      setMembers(data);
      setSelectedMemberId(current => data.some(member => member.id === current) ? current : data[0]?.id || null);
    } catch (err) {
      console.error('Failed to load members', err);
      setLoadError(err instanceof Error ? err.message : '会员数据加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [db, isAdmin, userId]);

  useEffect(() => { void reload(); }, [reload]);

  const handleAddMember = useCallback(async (profile: NewMemberProfile) => {
    const { name, ...details } = profile;
    const newMember = await db.addMember(name, details);
    setMembers(prev => [...prev, newMember]);
    setSelectedMemberId(newMember.id);
  }, [db]);

  const handleDeleteMember = useCallback(async (id: string) => {
    const member = members.find(m => m.id === id);
    await db.deleteMember(id);
    setMembers(prev => {
      const remaining = prev.filter(m => m.id !== id);
      setSelectedMemberId(sel => {
        if (sel === id) return remaining.length > 0 ? remaining[0].id : null;
        return sel;
      });
      return remaining;
    });
    if (member && onMemberDeleted) onMemberDeleted(member);
  }, [db, members, onMemberDeleted]);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  return {
    members,
    setMembers,
    selectedMemberId,
    setSelectedMemberId,
    selectedMember,
    loadError,
    isLoading,
    reload,
    handleAddMember,
    handleDeleteMember,
  };
}
