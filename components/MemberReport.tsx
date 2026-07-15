/**
 * 会员科学报告预览与 PDF 导出。
 */

import React, { useState, useRef, useCallback } from 'react';
import { Member, Language } from '../types';
import { generatePDF } from '../services/pdfGenerator';
import CoverPage from './Report/CoverPage';
import PosturePage from './Report/PosturePage';
import FindingsPage from './Report/FindingsPage';
import PlanPage from './Report/PlanPage';
import HistoryPage from './Report/HistoryPage';

interface MemberReportProps { lang: Language; member: Member; studioName: string; studioBrand?: { logo?: string; coachName?: string; accentColor?: string }; }

interface PreviewCardProps { label: string; children: React.ReactNode; }
const PreviewCard: React.FC<PreviewCardProps> = ({ label, children }) => (
  <div className="card-hover bg-white rounded-2xl overflow-hidden border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">{label}</div>
    <div className="overflow-hidden bg-[#eef2f6]" style={{ height: 472 }}>
      <div style={{ width: 794, transform: 'scale(0.42)', transformOrigin: 'top left' }}>{children}</div>
    </div>
  </div>
);

const MemberReport: React.FC<MemberReportProps> = ({ lang, member, studioName, studioBrand }) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');

  const branding = studioBrand || {};

  const coverRef = useRef<HTMLDivElement>(null);
  const postureRef = useRef<HTMLDivElement>(null);
  const findingsRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    const total = member.assessments?.length ? 5 : 2;
    setGenerating(true); setError(''); setProgress({ current: 0, total });
    try {
      const pages = [coverRef.current, postureRef.current, findingsRef.current, planRef.current, historyRef.current].filter(Boolean) as HTMLElement[];
      const dateStr = new Date().toISOString().split('T')[0];
      await generatePDF(pages, `${member.name.replace(/\s+/g, '_')}_Report_${dateStr}.pdf`, (c, t) => setProgress({ current: c, total: t }));
    } catch (err: any) { setError(err.message || (lang === 'zh' ? 'PDF 生成失败' : 'PDF generation failed')); }
    finally { setGenerating(false); }
  }, [member, lang]);

  const hasAssessment = member.assessments && member.assessments.length > 0;
  const pageCount = hasAssessment ? 5 : 2;
  const cpProps = { member, lang, studioName, studioLogo: branding.logo, coachName: branding.coachName, accentColor: branding.accentColor };

  return (
    <div className="space-y-5 animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">{lang === 'zh' ? `报告预览 — ${member.name}` : `Report Preview — ${member.name}`}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{lang === 'zh' ? `${pageCount} 页专业报告｜证据图、量化结果、四周训练处方与复评记录` : `${pageCount}-page professional report | Evidence, findings, prescription, and reassessment`}</p>
        </div>
        <button onClick={handleExport} disabled={generating}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all scale-press disabled:opacity-40 disabled:pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
          {generating ? (<><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span>{progress.current}/{progress.total}</span></>) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><span>{lang === 'zh' ? '导出 PDF' : 'Export PDF'}</span></>)}
        </button>
      </div>

      {generating && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-gray-400">{lang === 'zh' ? '正在生成 PDF...' : 'Generating PDF...'}</span><span className="text-xs font-bold text-[#007AFF] font-mono">{progress.current}/{progress.total}</span></div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%`, background: 'linear-gradient(90deg, #007AFF, #5856D6)' }} /></div>
        </div>
      )}

      {error && (<div className="bg-[#FF3B30]/5 border border-[#FF3B30]/10 rounded-2xl p-4 text-sm text-[#FF3B30] font-medium">{error}</div>)}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PreviewCard label={lang === 'zh' ? '第 1 页 · 封面' : 'Page 1 · Cover'}><CoverPage {...cpProps} /></PreviewCard>
        <PreviewCard label={hasAssessment ? (lang === 'zh' ? '第 2 页 · 摄影测量证据' : 'Page 2 · Photogrammetric evidence') : (lang === 'zh' ? '第 2 页 · 训练记录' : 'Page 2 · History')}>{hasAssessment ? <PosturePage member={member} lang={lang} studioName={studioName} /> : <HistoryPage member={member} lang={lang} studioName={studioName} pageNumber={2} />}</PreviewCard>
        {hasAssessment && (<>
          <PreviewCard label={lang === 'zh' ? '第 3 页 · 量化结果' : 'Page 3 · Findings'}><FindingsPage member={member} lang={lang} studioName={studioName} /></PreviewCard>
          <PreviewCard label={lang === 'zh' ? '第 4 页 · 四周训练处方' : 'Page 4 · Prescription'}><PlanPage member={member} lang={lang} studioName={studioName} /></PreviewCard>
          <PreviewCard label={lang === 'zh' ? '第 5 页 · 训练与复评' : 'Page 5 · Training audit'}><HistoryPage member={member} lang={lang} studioName={studioName} /></PreviewCard>
        </>)}
      </div>

      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={coverRef}><CoverPage {...cpProps} /></div>
        {hasAssessment && (<>
          <div ref={postureRef}><PosturePage member={member} lang={lang} studioName={studioName} /></div>
          <div ref={findingsRef}><FindingsPage member={member} lang={lang} studioName={studioName} /></div>
          <div ref={planRef}><PlanPage member={member} lang={lang} studioName={studioName} /></div>
        </>)}
        <div ref={historyRef}><HistoryPage member={member} lang={lang} studioName={studioName} pageNumber={hasAssessment ? 5 : 2} /></div>
      </div>
    </div>
  );
};

export default MemberReport;
