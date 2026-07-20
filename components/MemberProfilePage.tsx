import React, { useState } from 'react';
import type { Language, Member, NewMemberProfile } from '../types';
import MemberProfileEditor from './MemberProfileEditor';
import { getCurrentBodyWeight } from '../services/bodyWeightAnalytics';

interface MemberProfilePageProps {
  member: Member;
  lang: Language;
  onUpdate: (profile: NewMemberProfile) => Promise<void>;
}

const MemberProfilePage: React.FC<MemberProfilePageProps> = ({ member, lang, onUpdate }) => {
  const zh = lang === 'zh';
  const [editing, setEditing] = useState(false);
  const currentWeight = getCurrentBodyWeight(member);
  const rows = [
    { label: zh ? '姓名' : 'Name', value: member.name },
    { label: zh ? '性别' : 'Gender', value: member.gender === 'male' ? (zh ? '男' : 'Male') : (zh ? '女' : 'Female') },
    { label: zh ? '身高' : 'Height', value: `${member.heightCm} cm` },
    { label: zh ? '基础体重' : 'Profile weight', value: member.weightKg == null ? (zh ? '未录入' : 'Not recorded') : `${member.weightKg.toFixed(1)} kg` },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5856D6]">Member Profile</p>
        <h2 className="mt-1 text-2xl font-black text-gray-900">{zh ? '个人基础资料' : 'Personal profile'}</h2>
        <p className="mt-1 text-sm text-gray-400">{zh ? '这些数据用于训练记录、体态评估、AI 建议与会员报告。' : 'Used for training, posture assessment, AI guidance and reports.'}</p>
      </div>

      <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-black/[0.03]">
        <div className="flex flex-wrap items-center gap-4 border-b border-black/[0.05] p-5 sm:flex-nowrap sm:p-7">
          <img src={member.avatar} alt={member.name} className="h-16 w-16 rounded-2xl object-cover ring-4 ring-gray-50" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xl font-black text-gray-900">{member.name}</h3>
            <p className="mt-1 text-xs font-semibold text-gray-400">{zh ? `加入日期 ${member.joinDate}` : `Joined ${member.joinDate}`}</p>
          </div>
          <button type="button" onClick={() => setEditing(true)}
            className="w-full rounded-xl bg-[#007AFF] px-4 py-3 text-xs font-black text-white shadow-lg shadow-[#007AFF]/20 transition hover:bg-[#0066D6] sm:w-auto sm:py-2.5">
            {zh ? '修改资料' : 'Edit profile'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
          {rows.map(row => (
            <div key={row.label} className="bg-white p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">{row.label}</p>
              <p className="mt-2 text-base font-black text-gray-900">{row.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-[#34C759]/8 p-5 ring-1 ring-[#34C759]/10">
        <p className="text-xs font-black text-[#248A3D]">{zh ? '最近记录体重' : 'Latest recorded weight'}</p>
        <p className="mt-1 text-2xl font-black text-gray-900">{currentWeight == null ? '—' : `${currentWeight.toFixed(1)} kg`}</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">{zh ? '每日训练中录入的体重会形成趋势；基础体重用于建立初始档案。' : 'Weights entered with daily training form the trend; profile weight establishes the baseline.'}</p>
      </section>

      {editing && <MemberProfileEditor member={member} lang={lang} onClose={() => setEditing(false)} onSave={onUpdate} />}
    </div>
  );
};

export default MemberProfilePage;
