import React, { useState } from 'react';
import { Member, Language } from '../types';
import { getTrainingAdvice } from '../services/geminiService';

interface AIAdvisorProps { member: Member; lang: Language; }

const AIAdvisor: React.FC<AIAdvisorProps> = ({ member, lang }) => {
  const [query, setQuery] = useState('');
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    setLoading(true); setAdvice(''); const result = await getTrainingAdvice(member, query, lang); setAdvice(result); setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl p-5 relative overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #007AFF, transparent 70%)' }} />
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2 relative z-10">
        <span className="text-base">&#9889;</span> AI Coach
      </h3>
      <div className="space-y-3 relative z-10">
        <textarea value={query} onChange={e => setQuery(e.target.value)}
          placeholder={lang === 'zh' ? '针对该会员提问...' : 'Ask about this member...'}
          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-[#007AFF]/30 focus:ring-2 focus:ring-[#007AFF]/10 transition-all h-20 resize-none" />
        <button onClick={handleAsk} disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all scale-press disabled:opacity-60"
          style={{ background: loading ? '#8E8E93' : 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Thinking...</span>
          ) : (lang === 'zh' ? '获取建议' : 'Get Advice')}
        </button>
        {advice && (
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{advice}</div>
        )}
      </div>
    </div>
  );
};

export default AIAdvisor;
