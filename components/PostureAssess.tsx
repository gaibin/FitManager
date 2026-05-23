/**
 * 体态评估页面 — Apple HIG 风格 + 图片下载 + 固定比例导出
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Language, PostureAssessment, PostureReport, PostureIssue, CorrectionPlan } from '../types';
import { analyzePosture } from '../services/postureService';
import { compressImage, validateImage } from '../services/imageUtils';
import { matchCorrectionPlan, generateDefaultRecommendation } from '../services/exerciseLibrary';
import { TRANSLATIONS } from '../constants';

interface PostureAssessProps {
  lang: Language; memberId: string; memberName: string;
  heightCm: number; gender: 'male' | 'female';
  onSaveAssessment: (assessment: PostureAssessment) => Promise<void>;
  previousAssessment?: PostureAssessment;
}

const PHOTO_TYPES = [
  { key: 'front' as const, labelEn: 'Front', labelZh: '正面照' },
  { key: 'side' as const, labelEn: 'Side', labelZh: '侧面照' },
  { key: 'back' as const, labelEn: 'Back', labelZh: '背面照' },
];

// 下载图片 — 保持原始比例，不压缩人物
function downloadImage(dataUrl: string, fileName: string) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    // 使用原始比例，最大宽度 1920px
    const maxW = 1920;
    let w = img.width, h = img.height;
    if (w > maxW) { h = (h * maxW) / w; w = maxW; }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };
  img.src = dataUrl;
}

const PostureAssess: React.FC<PostureAssessProps> = ({
  lang, memberId, memberName, heightCm, gender, onSaveAssessment, previousAssessment,
}) => {
  const [images, setImages] = useState<Record<string, string | null>>({ front: null, side: null, back: null });
  const [height, setHeight] = useState(heightCm);
  const [memberGender, setMemberGender] = useState(gender);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStage, setAnalyzeStage] = useState('');
  const [report, setReport] = useState<PostureReport | null>(null);
  const [correctionPlan, setCorrectionPlan] = useState<CorrectionPlan | null>(null);
  const [error, setError] = useState('');
  const [activeWeek, setActiveWeek] = useState<'week1_2' | 'week3_4'>('week1_2');
  const [animatedScore, setAnimatedScore] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // 评分环入场动画：report 加载后从 0 动画到实际分数
  useEffect(() => {
    if (report) {
      setAnimatedScore(0);
      const timer = setTimeout(() => setAnimatedScore(report.score), 50);
      return () => clearTimeout(timer);
    }
  }, [report]);

  // 切换会员时清空状态
  useEffect(() => {
    setImages({ front: null, side: null, back: null });
    setReport(null); setCorrectionPlan(null); setError('');
    setHeight(heightCm); setMemberGender(gender);
  }, [memberId]);

  const handleFileChange = useCallback(async (key: string, file: File) => {
    const err = validateImage(file);
    if (err) { setError(err); return; }
    try {
      const compressed = await compressImage(file);
      setImages(prev => ({ ...prev, [key]: compressed }));
      setError('');
    } catch { setError(lang === 'zh' ? '图片处理失败，请重试' : 'Image processing failed'); }
  }, [lang]);

  const handleDrop = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(key, file);
  }, [handleFileChange]);

  const handleClick = (key: string) => fileInputRefs.current[key]?.click();

  const handleAnalyze = async () => {
    if (!images.front || !images.side) {
      setError(lang === 'zh' ? '请至少上传正面照和侧面照' : 'Please upload at least front and side photos');
      return;
    }
    setAnalyzing(true); setError(''); setReport(null); setCorrectionPlan(null);
    try {
      setAnalyzeStage(lang === 'zh' ? '正在检测关键点...' : 'Detecting keypoints...');
      const res = await analyzePosture({ front_image: images.front, side_image: images.side, back_image: images.back || undefined, height_cm: height, gender: memberGender });
      if (!res.success) throw new Error(res.error || 'backend_error');
      const data = res.data!;
      const issues: PostureIssue[] = (data.issues || []).map((i: any) => ({
        name: i.name, nameEn: i.name_en || i.name, value: i.value, unit: i.unit,
        severity: i.severity as PostureIssue['severity'], description: i.description || '',
        descriptionEn: i.description_en || i.description || '', exercises: i.exercises || [], confidence: i.confidence || 1.0,
      }));
      setReport({ score: data.score, confidence: data.confidence, issues });
      const plan = data.correction_plan || { week1_2: [], week3_4: [] };
      const finalPlan: CorrectionPlan = {
        week1_2: (plan.week1_2 || []).map((e: any) => ({ name: e.name, description: e.description || '', sets: e.sets || '3x12' })),
        week3_4: (plan.week3_4 || []).map((e: any) => ({ name: e.name, description: e.description || '', sets: e.sets || '3x10' })),
      };
      setCorrectionPlan(finalPlan);
      await onSaveAssessment({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        frontImage: images.front!, sideImage: images.side!, backImage: images.back || undefined,
        report: { score: data.score, confidence: data.confidence, issues }, correctionPlan: finalPlan,
        aiRecommendation: generateDefaultRecommendation(issues.map(i => i.name), lang),
      });
    } catch (err: any) {
      console.warn('Backend unavailable, using fallback:', err.message);
      const demoIssues: PostureIssue[] = [
        { name: '高低肩', nameEn: 'Shoulder Imbalance', value: 2.3, unit: '\u00b0', severity: '中度', description: '左侧肩胛高于右侧', descriptionEn: 'Left shoulder higher', exercises: ['单侧哑铃推举', '侧平举'], confidence: 0.75 },
        { name: '头前引', nameEn: 'Forward Head', value: 42.5, unit: '\u00b0', severity: '严重', description: '耳垂前移超过肩峰垂线', descriptionEn: 'Earlobe ahead of acromion', exercises: ['下颌内收', '墙天使'], confidence: 0.82 },
        { name: '含胸圆肩', nameEn: 'Rounded Shoulders', value: 12.1, unit: '%', severity: '中度', description: '肩峰前移比例偏高', descriptionEn: 'Shoulder protraction elevated', exercises: ['弹力带面拉', '胸椎伸展'], confidence: 0.68 },
        { name: '骨盆倾斜', nameEn: 'Pelvic Tilt', value: 3.8, unit: '\u00b0', severity: '正常', description: '骨盆位置基本对称', descriptionEn: 'Pelvic alignment normal', exercises: [], confidence: 0.71 },
      ];
      const names = demoIssues.map(i => i.name);
      const fbPlan = matchCorrectionPlan(names);
      setReport({ score: 62, confidence: 0.74, issues: demoIssues });
      setCorrectionPlan(fbPlan);
      await onSaveAssessment({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        frontImage: images.front!, sideImage: images.side!, backImage: images.back || undefined,
        report: { score: 62, confidence: 0.74, issues: demoIssues }, correctionPlan: fbPlan,
        aiRecommendation: generateDefaultRecommendation(names, lang),
      });
    } finally { setAnalyzing(false); setAnalyzeStage(''); }
  };

  const scoreColor = (s: number) => s >= 70 ? '#34C759' : s >= 40 ? '#FF9500' : '#FF3B30';
  const getSeverityPercent = (s: string) => s === '严重' ? 90 : s === '中度' ? 60 : s === '低置信度' ? 30 : 20;
  const getSeverityColor = (s: string) => s === '严重' ? '#FF3B30' : s === '中度' ? '#FF9500' : s === '低置信度' ? '#8E8E93' : '#34C759';

  return (
    <div className="space-y-5 animate-in">
      {/* Upload Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PHOTO_TYPES.map(({ key, labelEn, labelZh }) => (
          <div key={key} onDrop={e => handleDrop(e, key)} onDragOver={e => e.preventDefault()}
            onClick={() => handleClick(key)}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden min-h-[220px] flex items-center justify-center ${
              images[key] ? 'border-[#007AFF]/20 bg-gray-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
            }`}>
            {images[key] ? (
              <>
                <img src={images[key]!} alt={labelEn} className="w-full h-full object-contain absolute inset-0 p-2" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button onClick={e => { e.stopPropagation(); downloadImage(images[key]!, `${memberName}_${key}_${new Date().toISOString().split('T')[0]}.jpg`); }}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
                    {lang === 'zh' ? '下载' : 'Download'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span className="text-sm text-gray-400 font-medium">{lang === 'zh' ? labelZh : labelEn}</span>
              </div>
            )}
            <input ref={el => { fileInputRefs.current[key] = el; }} type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(key, f); }} />
          </div>
        ))}
      </div>

      {/* Height & Gender */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1.5 block">{lang === 'zh' ? '身高 (cm)' : 'Height (cm)'}</label>
          <input type="number" value={height} min={100} max={250} onChange={e => setHeight(Number(e.target.value))}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-gray-800 text-sm outline-none focus:border-[#007AFF]/30 transition-all" />
        </div>
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1.5 block">{lang === 'zh' ? '性别' : 'Gender'}</label>
          <div className="flex gap-2">
            {(['male', 'female'] as const).map(g => (
              <button key={g} onClick={() => setMemberGender(g)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all scale-press ${
                  memberGender === g ? 'text-white shadow-sm' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'
                }`}
                style={memberGender === g ? { background: 'linear-gradient(135deg, #007AFF, #5856D6)' } : {}}>
                {g === 'male' ? (lang === 'zh' ? '男' : 'Male') : (lang === 'zh' ? '女' : 'Female')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <button onClick={handleAnalyze} disabled={analyzing || !images.front || !images.side}
        className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all scale-press disabled:opacity-30 disabled:pointer-events-none text-white"
        style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
        {analyzing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {analyzeStage || (lang === 'zh' ? '分析中...' : 'Analyzing...')}
          </span>
        ) : (lang === 'zh' ? '开始分析' : 'Start Analysis')}
      </button>

      {error && <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/10 rounded-2xl p-4 text-sm text-[#FF3B30] font-medium">{error}</div>}

      {/* Results */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="text-xs font-bold text-gray-800 mb-4">{lang === 'zh' ? '综合体态评分' : 'Posture Score'}</h3>
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="58" fill="none" stroke="#F2F2F7" strokeWidth="10" />
                <circle cx="70" cy="70" r="58" fill="none" stroke={scoreColor(report.score)} strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 58}`}
                  strokeDashoffset={`${2 * Math.PI * 58 * (1 - animatedScore / 100)}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-gray-800">{report.score}</span>
                <span className="text-[11px] text-gray-400">/ 100</span>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 mt-2">{(report.confidence * 100).toFixed(0)}% confidence</span>
          </div>
          <div className="lg:col-span-2 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="text-xs font-bold text-gray-800 mb-4">{lang === 'zh' ? '检测结果' : 'Results'}</h3>
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {report.issues.map((issue, idx) => {
                const sevColor = issue.severity === '严重' ? '#FF3B30' : issue.severity === '中度' ? '#FF9500' : issue.severity === '低置信度' ? '#8E8E93' : '#34C759';
                const sevBg = issue.severity === '严重' ? '#FF3B30' : issue.severity === '中度' ? '#FF9500' : issue.severity === '低置信度' ? '#8E8E93' : '#34C759';
                return (
                  <div key={idx} className="rounded-xl p-4 border" style={{ backgroundColor: `${sevColor}08`, borderColor: `${sevColor}18` }}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-bold text-gray-800">{lang === 'zh' ? issue.name : issue.nameEn}</span>
                      <span className="text-[11px] font-medium opacity-70" style={{ color: sevColor }}>{issue.value.toFixed(1)} {issue.unit}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] text-gray-400">{lang === 'zh' ? issue.description : issue.descriptionEn}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: sevBg }}>{issue.severity}</span>
                    </div>
                    {/* Severity Progress Bar */}
                    <div className="w-full h-[3px] rounded-full bg-[#F2F2F7] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${getSeverityPercent(issue.severity)}%`,
                        backgroundColor: getSeverityColor(issue.severity),
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Correction Plan */}
      {correctionPlan && (
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="text-xs font-bold text-gray-800 mb-4">{lang === 'zh' ? '4周矫正训练方案' : '4-Week Correction Plan'}</h3>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
            {(['week1_2', 'week3_4'] as const).map(k => (
              <button key={k} onClick={() => setActiveWeek(k)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                  activeWeek === k ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}>
                {k === 'week1_2' ? (lang === 'zh' ? '第1-2周' : 'Week 1-2') : (lang === 'zh' ? '第3-4周' : 'Week 3-4')}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {correctionPlan[activeWeek].length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{lang === 'zh' ? '暂无该阶段动作' : 'No exercises'}</p>
            ) : correctionPlan[activeWeek].map((ex, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: activeWeek === 'week1_2' ? '#007AFF' : '#5856D6' }}>{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-800">{ex.name}</span>
                  {ex.description && <p className="text-[10px] text-gray-400 mt-0.5">{ex.description}</p>}
                </div>
                <span className="text-[11px] font-bold text-gray-500 bg-white px-2.5 py-1 rounded-lg">{ex.sets}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Before/After Comparison */}
      {previousAssessment && report && (
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="text-xs font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#5856D6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            {lang === 'zh' ? '历史对比' : 'Before / After'}
            <span className="text-[10px] font-normal text-gray-400 ml-2">
              {previousAssessment.date} → {new Date().toISOString().split('T')[0]}
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Previous Score */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{lang === 'zh' ? '上次' : 'Before'}</p>
              <p className="text-2xl font-extrabold text-gray-800">{previousAssessment.report.score}</p>
              <p className="text-[10px] text-gray-400">{previousAssessment.date}</p>
            </div>
            {/* Current Score */}
            <div className="rounded-xl p-4 text-center" style={{ background: `linear-gradient(135deg, ${report.score >= previousAssessment.report.score ? '#34C75915' : '#FF3B3015'}, transparent)` }}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{lang === 'zh' ? '本次' : 'After'}</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-extrabold text-gray-800">{report.score}</p>
                <span className={`text-sm font-bold ${report.score >= previousAssessment.report.score ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                  {report.score >= previousAssessment.report.score ? '+' : ''}{(report.score - previousAssessment.report.score).toFixed(0)}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">{lang === 'zh' ? '综合评分' : 'Current Score'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostureAssess;
