import React, { useState } from 'react';
import { Member, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { getTrainingAdvice } from '../services/geminiService';

interface AIAdvisorProps {
  member: Member;
  lang: Language;
}

const AIAdvisor: React.FC<AIAdvisorProps> = ({ member, lang }) => {
  const [query, setQuery] = useState('');
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    setLoading(true);
    setAdvice('');
    const result = await getTrainingAdvice(member, query, lang);
    setAdvice(result);
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 p-6 relative overflow-hidden group">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

      <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center relative z-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-lime-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {TRANSLATIONS.aiAdvisor[lang]}
      </h3>

      <div className="space-y-4 relative z-10">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={TRANSLATIONS.aiPromptPlaceholder[lang]}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-lime-500 transition-colors h-24 resize-none"
        />
        
        <button
          onClick={handleAsk}
          disabled={loading}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-lime-400 font-semibold py-2 px-4 rounded-lg border border-lime-500/30 hover:border-lime-500 transition-all duration-200 flex justify-center items-center"
        >
          {loading ? (
             <span className="flex items-center">
               <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-lime-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Thinking...
             </span>
          ) : (
            TRANSLATIONS.askAi[lang]
          )}
        </button>

        {advice && (
          <div className="mt-4 p-4 bg-zinc-950/50 rounded-lg border border-zinc-800 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{advice}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAdvisor;