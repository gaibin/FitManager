/**
 * 体态评估页面 — 上传3张照片，调用Flask后端进行AI体态分析，展示评分和矫正方案
 */

import React, { useState, useCallback, useRef } from 'react';
import { Language, PostureAssessment, PostureReport, PostureIssue, CorrectionPlan } from '../types';
import { analyzePosture } from '../services/postureService';
import { compressImage, validateImage } from '../services/imageUtils';
import { TRANSLATIONS } from '../constants';

interface PostureAssessProps {
  lang: Language;
  memberId: string;
  memberName: string;
  heightCm: number;
  gender: 'male' | 'female';
  onSaveAssessment: (assessment: PostureAssessment) => Promise<void>;
}

// 严重度颜色
const severityColors: Record<string, string> = {
  '正常': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  '中度': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  '严重': 'text-red-400 bg-red-500/10 border-red-500/20',
  '低置信度': 'text-zinc-500 bg-zinc-700/30 border-zinc-600/20',
};

const PHOTO_TYPES = [
  { key: 'front' as const, labelEn: 'Front Photo', labelZh: '正面照' },
  { key: 'side' as const, labelEn: 'Side Photo', labelZh: '侧面照' },
  { key: 'back' as const, labelEn: 'Back Photo (Optional)', labelZh: '背面照（可选）' },
];

const PostureAssess: React.FC<PostureAssessProps> = ({
  lang, memberId, memberName, heightCm, gender,
  onSaveAssessment,
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
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = useCallback(async (key: string, file: File) => {
    const validationError = validateImage(file);
    if (validationError) { setError(validationError); return; }
    try {
      const compressed = await compressImage(file);
      setImages(prev => ({ ...prev, [key]: compressed }));
      setError('');
    } catch {
      setError('图片处理失败，请重试');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(key, file);
  }, [handleFileChange]);

  const handleClick = (key: string) => {
    fileInputRefs.current[key]?.click();
  };

  const handleAnalyze = async () => {
    if (!images.front || !images.side) {
      setError(lang === 'zh' ? '请至少上传正面照和侧面照' : 'Please upload at least front and side photos');
      return;
    }
    setAnalyzing(true);
    setError('');
    setReport(null);
    setCorrectionPlan(null);

    try {
      setAnalyzeStage(lang === 'zh' ? '正在检测关键点...' : 'Detecting keypoints...');
      const res = await analyzePosture({
        front_image: images.front,
        side_image: images.side,
        back_image: images.back || undefined,
        height_cm: height,
        gender: memberGender,
      });

      if (!res.success) {
        setError(res.error || (lang === 'zh' ? '分析失败，请重试' : 'Analysis failed'));
        return;
      }

      const data = res.data!;
      const issues: PostureIssue[] = (data.issues || []).map((issue: any) => ({
        name: issue.name,
        nameEn: issue.name_en || issue.name,
        value: issue.value,
        unit: issue.unit,
        severity: issue.severity as PostureIssue['severity'],
        description: issue.description || '',
        descriptionEn: issue.description_en || issue.description || '',
        exercises: issue.exercises || [],
        confidence: issue.confidence || 1.0,
      }));

      setReport({
        score: data.score,
        confidence: data.confidence,
        issues,
      });

      const plan = data.correction_plan || { week1_2: [], week3_4: [] };
      setCorrectionPlan({
        week1_2: (plan.week1_2 || []).map((e: any) => ({
          name: e.name,
          description: e.description || '',
          sets: e.sets || '3x12',
        })),
        week3_4: (plan.week3_4 || []).map((e: any) => ({
          name: e.name,
          description: e.description || '',
          sets: e.sets || '3x10',
        })),
      });

      const finalPlan: CorrectionPlan = {
        week1_2: (plan.week1_2 || []).map((e: any) => ({
          name: e.name,
          description: e.description || '',
          sets: e.sets || '3x12',
        })),
        week3_4: (plan.week3_4 || []).map((e: any) => ({
          name: e.name,
          description: e.description || '',
          sets: e.sets || '3x10',
        })),
      };

      // 保存评估结果
      const assessment: PostureAssessment = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        frontImage: images.front,
        sideImage: images.side,
        backImage: images.back || undefined,
        report: {
          score: data.score,
          confidence: data.confidence,
          issues,
        },
        correctionPlan: finalPlan,
      };

      await onSaveAssessment(assessment);

    } catch (err: any) {
      setError(err.message || (lang === 'zh' ? '分析服务不可用' : 'Analysis service unavailable'));
    } finally {
      setAnalyzing(false);
      setAnalyzeStage('');
    }
  };

  // 环形评分图
  const renderScoreRing = () => {
    if (!report) return null;
    const score = report.score;
    const color = score >= 70 ? '#a3e635' : score >= 40 ? '#f59e0b' : '#f43f5e';
    const circumference = 2 * Math.PI * 58;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="58" fill="none" stroke="currentColor" strokeWidth="10" className="text-zinc-800" />
            <circle
              cx="70" cy="70" r="58" fill="none" stroke={color} strokeWidth="10"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{score}</span>
            <span className="text-xs text-zinc-500">/ 100</span>
          </div>
        </div>
        <span className="text-xs text-zinc-500 mt-2">
          {lang === 'zh' ? '置信度' : 'Confidence'}: {(report.confidence * 100).toFixed(0)}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 照片上传区域 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PHOTO_TYPES.map(({ key, labelEn, labelZh }) => (
          <div
            key={key}
            onDrop={(e) => handleDrop(e, key)}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !images[key] && handleClick(key)}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden group min-h-[200px] flex items-center justify-center ${
              images[key]
                ? 'border-lime-500/30 bg-zinc-900/50'
                : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/30'
            }`}
          >
            {images[key] ? (
              <>
                <img src={images[key]} alt={labelEn} className="w-full h-full object-cover absolute inset-0" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClick(key); }}
                    className="px-4 py-2 bg-lime-500 text-black text-xs font-bold rounded-lg"
                  >
                    {lang === 'zh' ? '更换照片' : 'Change Photo'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <svg className="w-10 h-10 mx-auto text-zinc-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-zinc-500">{lang === 'zh' ? labelZh : labelEn}</span>
              </div>
            )}
            <input
              ref={(el) => { fileInputRefs.current[key] = el; }}
              type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChange(key, file);
              }}
            />
          </div>
        ))}
      </div>

      {/* 身高和性别输入 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <label className="text-xs text-zinc-500 uppercase font-semibold mb-1.5 block">
            {lang === 'zh' ? '身高 (cm)' : 'Height (cm)'}
          </label>
          <input
            type="number" value={height} min={100} max={250}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-white text-sm focus:border-lime-500 outline-none"
          />
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <label className="text-xs text-zinc-500 uppercase font-semibold mb-1.5 block">
            {lang === 'zh' ? '性别' : 'Gender'}
          </label>
          <div className="flex space-x-2">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setMemberGender(g)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  memberGender === g
                    ? 'bg-lime-500 text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {g === 'male' ? (lang === 'zh' ? '男' : 'Male') : (lang === 'zh' ? '女' : 'Female')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 开始分析按钮 */}
      <button
        onClick={handleAnalyze}
        disabled={analyzing || !images.front || !images.side}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-lime-500 hover:bg-lime-400 text-black"
      >
        {analyzing ? (
          <span className="flex items-center justify-center space-x-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{analyzeStage || (lang === 'zh' ? '分析中...' : 'Analyzing...')}</span>
          </span>
        ) : (
          <span>{lang === 'zh' ? '开始分析' : 'Start Analysis'}</span>
        )}
      </button>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 分析结果 */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：评分 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-zinc-100 mb-4">
              {lang === 'zh' ? '综合体态评分' : 'Posture Score'}
            </h3>
            {renderScoreRing()}
          </div>

          {/* 右侧：问题列表 */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-zinc-100 mb-4">
              {lang === 'zh' ? '检测结果' : 'Detection Results'}
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {report.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 ${severityColors[issue.severity] || severityColors['中度']}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm">
                      {lang === 'zh' ? issue.name : issue.nameEn}
                    </span>
                    <span className="text-xs opacity-70">
                      {issue.value.toFixed(1)} {issue.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs opacity-60">
                      {lang === 'zh' ? issue.description : issue.descriptionEn}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      issue.severity === '严重' ? 'bg-red-500/20 text-red-300' :
                      issue.severity === '中度' ? 'bg-amber-500/20 text-amber-300' :
                      issue.severity === '低置信度' ? 'bg-zinc-700/40 text-zinc-400' :
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 矫正方案 */}
      {correctionPlan && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-zinc-100 mb-4">
            {lang === 'zh' ? '4周矫正训练方案' : '4-Week Correction Plan'}
          </h3>

          {/* 周期 Tab */}
          <div className="flex space-x-1 bg-zinc-950 rounded-lg p-1 mb-4">
            {([
              { key: 'week1_2', labelEn: 'Week 1-2 (Activation)', labelZh: '第1-2周（放松激活）' },
              { key: 'week3_4', labelEn: 'Week 3-4 (Integration)', labelZh: '第3-4周（强化整合）' },
            ] as const).map(({ key, labelEn, labelZh }) => (
              <button
                key={key}
                onClick={() => setActiveWeek(key)}
                className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
                  activeWeek === key
                    ? 'bg-lime-500 text-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lang === 'zh' ? labelZh : labelEn}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {correctionPlan[activeWeek].length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">
                {lang === 'zh' ? '暂无该阶段矫正动作' : 'No exercises for this phase'}
              </p>
            ) : (
              correctionPlan[activeWeek].map((exercise, idx) => (
                <div key={idx} className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-lime-500/10 border border-lime-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-lime-400 text-xs font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold text-zinc-100">{exercise.name}</span>
                      <span className="text-xs text-lime-400 font-mono bg-lime-500/10 px-2 py-0.5 rounded ml-2 shrink-0">
                        {exercise.sets}
                      </span>
                    </div>
                    {exercise.description && (
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{exercise.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostureAssess;
