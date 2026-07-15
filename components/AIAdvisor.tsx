import React, { useCallback, useEffect, useState } from 'react';
import type { Language, Member } from '../types';
import { getMemberCoachBrief, type MemberCoachBrief } from '../services/aiCoachService';

interface AIAdvisorProps { member: Member; lang: Language; }

const AIAdvisor: React.FC<AIAdvisorProps> = ({ member, lang }) => {
  const [query, setQuery] = useState('');
  const [brief, setBrief] = useState<MemberCoachBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const zh = lang === 'zh';

  const generate = useCallback(async (question?: string) => {
    setLoading(true);
    setError('');
    try {
      setBrief(await getMemberCoachBrief(member, lang, question));
    } catch (err: any) {
      setError(err?.message || (zh ? 'AI 教练简报生成失败' : 'Unable to generate coach brief'));
    } finally {
      setLoading(false);
    }
  }, [member, lang, zh]);

  useEffect(() => { void generate(); }, [member.id, generate]);

  const ask = () => {
    if (!query.trim()) return;
    void generate(query);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE]" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#5856D6]/10 text-sm text-[#5856D6]">✦</span>
            <h3 className="text-sm font-extrabold text-gray-900">{zh ? 'AI 教练简报' : 'AI Coach Brief'}</h3>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-gray-400">
            {zh ? '读取训练记录与算法测量，不读取照片' : 'Uses training records and algorithmic measurements, not photos'}
          </p>
        </div>
        <button onClick={() => void generate()} disabled={loading} className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-[10px] font-bold text-gray-500 disabled:opacity-40">
          {zh ? '刷新' : 'Refresh'}
        </button>
      </div>

      <div className="relative z-10 mt-4 space-y-3">
        {loading && !brief && <div className="animate-pulse rounded-xl bg-gray-50 p-5 text-center text-xs text-gray-400">{zh ? '正在生成今日简报…' : 'Preparing today’s brief…'}</div>}
        {error && <div className="rounded-xl bg-[#FF3B30]/5 p-3 text-xs text-[#C93400]">{error}</div>}
        {brief && (
          <>
            <div className="rounded-xl bg-gradient-to-br from-[#F4F2FF] to-[#F8FAFF] p-4">
              <p className="text-xs font-extrabold text-[#403A77]">{brief.headline}</p>
              <p className="mt-2 text-[11px] leading-5 text-gray-600">{brief.summary}</p>
            </div>
            {brief.todayFocus.length > 0 && (
              <div>
                <p className="text-[9px] font-black tracking-widest text-gray-400">{zh ? '今日重点' : 'TODAY'}</p>
                <div className="mt-2 space-y-1.5">
                  {brief.todayFocus.map((item, index) => <p key={index} className="flex gap-2 text-[11px] leading-5 text-gray-700"><span className="font-black text-[#007AFF]">{index + 1}</span>{item}</p>)}
                </div>
              </div>
            )}
            {(brief.loadNote || brief.postureNote) && (
              <div className="grid gap-2">
                {brief.loadNote && <div className="rounded-lg bg-gray-50 p-3 text-[10px] leading-5 text-gray-600"><b className="text-gray-800">{zh ? '负荷：' : 'Load: '}</b>{brief.loadNote}</div>}
                {brief.postureNote && <div className="rounded-lg bg-[#34C759]/5 p-3 text-[10px] leading-5 text-gray-600"><b className="text-[#248A3D]">{zh ? '体态：' : 'Posture: '}</b>{brief.postureNote}</div>}
              </div>
            )}
            {brief.answer && <div className="rounded-xl border border-[#5856D6]/10 p-3 text-[11px] leading-5 text-gray-700"><b className="text-[#5856D6]">{zh ? '回答：' : 'Answer: '}</b>{brief.answer}</div>}
          </>
        )}

        <textarea value={query} onChange={event => setQuery(event.target.value)}
          placeholder={zh ? '询问该会员的训练安排…' : 'Ask about this member…'}
          className="h-16 w-full resize-none rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-800 outline-none focus:border-[#5856D6]/30" />
        <button onClick={ask} disabled={loading || !query.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-[#007AFF] to-[#5856D6] py-2.5 text-xs font-bold text-white disabled:opacity-40">
          {loading ? (zh ? '生成中…' : 'Generating…') : (zh ? '基于会员数据回答' : 'Answer from member data')}
        </button>
      </div>
    </div>
  );
};

export default AIAdvisor;
