/**
 * 报告导出页面 — 预览 PDF 报告内容 + 导出下载
 */

import React, { useState, useRef, useCallback } from 'react';
import { Member, Language } from '../types';
import { generatePDF } from '../services/pdfGenerator';
import CoverPage from './Report/CoverPage';
import PosturePage from './Report/PosturePage';
import PlanPage from './Report/PlanPage';
import HistoryPage from './Report/HistoryPage';

interface MemberReportProps {
  lang: Language;
  member: Member;
  studioName: string;
}

const MemberReport: React.FC<MemberReportProps> = ({ lang, member, studioName }) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');

  const coverRef = useRef<HTMLDivElement>(null);
  const postureRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    setGenerating(true);
    setError('');
    setProgress({ current: 0, total: 4 });

    try {
      const pages = [coverRef.current, postureRef.current, planRef.current, historyRef.current]
        .filter(Boolean) as HTMLElement[];

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `${member.name.replace(/\s+/g, '_')}_Report_${dateStr}.pdf`;

      await generatePDF(pages, fileName, (current, total) => {
        setProgress({ current, total });
      });
    } catch (err: any) {
      setError(err.message || (lang === 'zh' ? 'PDF 生成失败' : 'PDF generation failed'));
    } finally {
      setGenerating(false);
    }
  }, [member, lang, studioName]);

  const hasAssessment = member.assessments && member.assessments.length > 0;
  const pageCount = hasAssessment ? 4 : 2;

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">
            {lang === 'zh' ? `报告预览 — ${member.name}` : `Report Preview — ${member.name}`}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {lang === 'zh'
              ? `${pageCount} 页报告 | 训练统计 + ${hasAssessment ? '体态评估 + 矫正方案' : '训练记录'}`
              : `${pageCount}-page report | Training stats + ${hasAssessment ? 'posture assessment + correction plan' : 'workout history'}`}
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={generating}
          className="flex items-center space-x-2 px-6 py-3 bg-lime-500 hover:bg-lime-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold rounded-xl transition-all text-sm"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>
                {progress.current}/{progress.total}
              </span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{lang === 'zh' ? '导出 PDF' : 'Export PDF'}</span>
            </>
          )}
        </button>
      </div>

      {/* 进度条 */}
      {generating && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">
              {lang === 'zh' ? '正在生成 PDF...' : 'Generating PDF...'}
            </span>
            <span className="text-xs text-lime-400 font-mono">
              {progress.current}/{progress.total}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-lime-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 预览区 (缩略图网格) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/30 rounded-xl overflow-hidden border border-zinc-800">
          <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-medium">
            {lang === 'zh' ? '第 1 页 — 封面' : 'Page 1 — Cover'}
          </div>
          <div className="overflow-auto" style={{ maxHeight: 500 }}>
            <div className="scale-[0.35] origin-top-left" style={{ width: 794 }}>
              <CoverPage member={member} lang={lang} studioName={studioName} />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/30 rounded-xl overflow-hidden border border-zinc-800">
          <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-medium">
            {lang === 'zh'
              ? (hasAssessment ? '第 2 页 — 体态评估' : '第 2 页 — 训练记录')
              : (hasAssessment ? 'Page 2 — Posture' : 'Page 2 — History')}
          </div>
          <div className="overflow-auto" style={{ maxHeight: 500 }}>
            <div className="scale-[0.35] origin-top-left" style={{ width: 794 }}>
              {hasAssessment ? (
                <PosturePage member={member} lang={lang} studioName={studioName} />
              ) : (
                <HistoryPage member={member} lang={lang} studioName={studioName} />
              )}
            </div>
          </div>
        </div>

        {hasAssessment && (
          <>
            <div className="bg-zinc-900/30 rounded-xl overflow-hidden border border-zinc-800">
              <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-medium">
                {lang === 'zh' ? '第 3 页 — 矫正方案' : 'Page 3 — Plan'}
              </div>
              <div className="overflow-auto" style={{ maxHeight: 500 }}>
                <div className="scale-[0.35] origin-top-left" style={{ width: 794 }}>
                  <PlanPage member={member} lang={lang} studioName={studioName} />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/30 rounded-xl overflow-hidden border border-zinc-800">
              <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 font-medium">
                {lang === 'zh' ? '第 4 页 — 训练记录' : 'Page 4 — History'}
              </div>
              <div className="overflow-auto" style={{ maxHeight: 500 }}>
                <div className="scale-[0.35] origin-top-left" style={{ width: 794 }}>
                  <HistoryPage member={member} lang={lang} studioName={studioName} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 隐藏的完整尺寸渲染容器 (用于 PDF 生成) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={coverRef}>
          <CoverPage member={member} lang={lang} studioName={studioName} />
        </div>
        {hasAssessment && (
          <>
            <div ref={postureRef}>
              <PosturePage member={member} lang={lang} studioName={studioName} />
            </div>
            <div ref={planRef}>
              <PlanPage member={member} lang={lang} studioName={studioName} />
            </div>
          </>
        )}
        <div ref={historyRef}>
          <HistoryPage member={member} lang={lang} studioName={studioName} />
        </div>
      </div>
    </div>
  );
};

export default MemberReport;
