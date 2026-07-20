import React, { useState } from 'react';
import type { Language, Member, NewMemberProfile } from '../types';

interface MemberProfileEditorProps {
  member: Member;
  lang: Language;
  onClose: () => void;
  onSave: (profile: NewMemberProfile) => Promise<void>;
}

const MemberProfileEditor: React.FC<MemberProfileEditorProps> = ({ member, lang, onClose, onSave }) => {
  const zh = lang === 'zh';
  const [name, setName] = useState(member.name);
  const [gender, setGender] = useState<'male' | 'female'>(member.gender);
  const [height, setHeight] = useState(String(member.heightCm || ''));
  const [weight, setWeight] = useState(member.weightKg == null ? '' : String(member.weightKg));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const heightCm = Number(height);
    const weightKg = Number(weight);
    if (!trimmedName) return setError(zh ? '请输入姓名' : 'Enter a name');
    if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 230) {
      return setError(zh ? '身高请输入 100–230 cm' : 'Height must be between 100 and 230 cm');
    }
    if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 300) {
      return setError(zh ? '体重请输入 25–300 kg' : 'Weight must be between 25 and 300 kg');
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: trimmedName, gender, heightCm, weightKg });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : (zh ? '保存失败，请稍后重试' : 'Save failed. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'mt-1.5 w-full rounded-xl border border-black/10 bg-gray-50 px-3.5 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#007AFF]/40 focus:bg-white focus:ring-4 focus:ring-[#007AFF]/8';

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-gray-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={zh ? '编辑基础资料' : 'Edit profile'}>
      <form onSubmit={submit} className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5856D6]">Member Profile</p>
            <h3 className="mt-1 text-xl font-black text-gray-900">{zh ? '编辑基础资料' : 'Edit profile'}</h3>
            <p className="mt-1 text-xs text-gray-400">{zh ? '保存后同步用于训练记录、体态评估与报告。' : 'Used across training, posture and reports.'}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-lg text-gray-500 hover:bg-gray-200" aria-label={zh ? '关闭' : 'Close'}>×</button>
        </div>

        <div className="space-y-4">
          <label className="block text-xs font-bold text-gray-600">
            {zh ? '姓名' : 'Name'}
            <input value={name} onChange={event => setName(event.target.value)} className={fieldClass} autoFocus />
          </label>
          <div>
            <p className="text-xs font-bold text-gray-600">{zh ? '性别' : 'Gender'}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
              {(['male', 'female'] as const).map(value => (
                <button key={value} type="button" onClick={() => setGender(value)}
                  className={`rounded-lg py-2.5 text-xs font-bold transition ${gender === value ? 'bg-white text-[#007AFF] shadow-sm' : 'text-gray-400'}`}>
                  {value === 'male' ? (zh ? '男' : 'Male') : (zh ? '女' : 'Female')}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-gray-600">
              {zh ? '身高（cm）' : 'Height (cm)'}
              <input type="number" inputMode="decimal" min="100" max="230" step="0.1" value={height} onChange={event => setHeight(event.target.value)} className={fieldClass} />
            </label>
            <label className="block text-xs font-bold text-gray-600">
              {zh ? '基础体重（kg）' : 'Profile weight (kg)'}
              <input type="number" inputMode="decimal" min="25" max="300" step="0.1" value={weight} onChange={event => setWeight(event.target.value)} className={fieldClass} />
            </label>
          </div>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-[#FF3B30]/7 px-3 py-2.5 text-xs font-semibold text-[#D83028]">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-600 hover:bg-gray-200">{zh ? '取消' : 'Cancel'}</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[#007AFF] py-3 text-sm font-bold text-white shadow-lg shadow-[#007AFF]/20 transition hover:bg-[#0066D6] disabled:opacity-50">
            {saving ? (zh ? '保存中…' : 'Saving…') : (zh ? '保存资料' : 'Save profile')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MemberProfileEditor;
