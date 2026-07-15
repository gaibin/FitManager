/** Posture Assessment V2: guided capture, marker review and 2.5-D evidence. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CorrectionPlan,
  Language,
  PostureAssessment,
  PostureIssue,
  PostureQuestionnaire,
  PostureView,
} from '../types';
import {
  analyzePostureV2,
  recomputePostureV2,
  type PostureV2Data,
} from '../services/postureService';
import { compressImage, validateImage } from '../services/imageUtils';
import Posture3DViewer from './Posture3DViewer';
import PosturePhotoOverlay from './PosturePhotoOverlay';
import PostureCameraCapture from './PostureCameraCapture';

interface PostureAssessProps {
  lang: Language;
  memberId: string;
  memberName: string;
  heightCm: number;
  gender: 'male' | 'female';
  onSaveAssessment: (assessment: PostureAssessment) => Promise<void>;
  previousAssessment?: PostureAssessment;
}

const PHOTO_TYPES: { key: PostureView; labelEn: string; labelZh: string }[] = [
  { key: 'front', labelEn: 'Front', labelZh: '正面' },
  { key: 'side', labelEn: 'Side', labelZh: '侧面' },
  { key: 'back', labelEn: 'Back', labelZh: '背面' },
];

const EMPTY_QUESTIONNAIRE: PostureQuestionnaire = {
  painArea: '', painLevel: 0, recentSurgery: false, acuteInjury: false,
  neurologicalSymptoms: false, dizziness: false, goal: 'posture-tracking',
  experience: 'beginner', equipment: '', weeklyFrequency: 2,
};

const POSTURE_V2_ENABLED = import.meta.env.VITE_POSTURE_V2_ENABLED !== 'false';

function issueFromMeasurement(item: PostureV2Data['measurements'][number]): PostureIssue {
  return {
    name: item.name, nameEn: item.nameEn, value: item.value, unit: item.unit,
    severity: item.status === 'measured' ? '观察' : '低置信度',
    description: item.description, descriptionEn: item.descriptionEn,
    exercises: [], confidence: item.confidence, uncertainty: item.uncertainty,
    measurementId: item.id,
  };
}

function correctionPlanFromData(data: PostureV2Data): CorrectionPlan {
  const exercises = data.recommendation.exercises.map(item => ({
    name: item.name, nameEn: item.nameEn,
    description: item.description, descriptionEn: item.descriptionEn,
    sets: item.dose, stopCondition: item.stopCondition,
    cues: item.cues, cuesEn: item.cuesEn,
    tempo: item.tempo, tempoEn: item.tempoEn,
    rest: item.rest, restEn: item.restEn,
    equipment: item.equipment, equipmentEn: item.equipmentEn,
    regression: item.regression, regressionEn: item.regressionEn,
    progression: item.progression, progressionEn: item.progressionEn,
    phase: item.phase,
  }));
  return {
    week1_2: exercises.filter(item => item.phase === 'week1_2'),
    week3_4: exercises.filter(item => item.phase === 'week3_4'),
  };
}

interface TrainingPrescriptionPanelProps {
  data: PostureV2Data;
  lang: Language;
  analyzing: boolean;
  coachApproved: boolean;
  saved: boolean;
  onRefresh: () => void;
  onApprove: (approved: boolean) => void;
  onSave: () => void;
}

const TrainingPrescriptionPanel: React.FC<TrainingPrescriptionPanelProps> = ({
  data, lang, analyzing, coachApproved, saved, onRefresh, onApprove, onSave,
}) => {
  const recommendation = data.recommendation;
  const zh = lang === 'zh';
  const phaseInfo = {
    week1_2: { title: zh ? '第 1–2 周 · 建立控制' : 'Weeks 1–2 · Build control', color: '#007AFF' },
    week3_4: { title: zh ? '第 3–4 周 · 负荷整合' : 'Weeks 3–4 · Integrate load', color: '#5856D6' },
  } as const;

  return (
    <section id="training-prescription" className="rounded-2xl border border-[#007AFF]/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#007AFF] px-2 py-1 text-[9px] font-black tracking-widest text-white">PROGRAM</span>
            <h3 className="text-base font-extrabold text-gray-900">{zh ? '四周个性化训练处方' : 'Four-week personalised training plan'}</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{zh ? recommendation.summary : recommendation.summaryEn}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(zh
              ? ['正/侧/背跨视图选择', '髋关节三平面控制', '髋—膝—踝整合', '四周渐进负荷']
              : ['Cross-view selection', 'Multi-planar hip control', 'Hip-knee-ankle integration', 'Four-week progression']
            ).map(item => <span key={item} className="rounded-full bg-[#34C759]/10 px-2.5 py-1 text-[9px] font-bold text-[#248A3D]">✓ {item}</span>)}
          </div>
        </div>
        <button onClick={onRefresh} disabled={analyzing}
          className="rounded-xl bg-[#007AFF] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">
          {analyzing ? (zh ? '生成中…' : 'Generating…') : (zh ? '重新生成训练处方' : 'Regenerate plan')}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          [zh ? '训练目标' : 'Goal', zh ? recommendation.goal : recommendation.goalEn],
          [zh ? '每周频率' : 'Frequency', `${recommendation.frequencyPerWeek || 2} ${zh ? '次/周' : 'sessions/week'}`],
          [zh ? '单次时长' : 'Duration', `${recommendation.sessionMinutes || 15} min`],
          [zh ? '计划动作' : 'Exercises', `${recommendation.exercises.length} ${zh ? '个' : 'exercises'}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="mt-1 text-xs font-extrabold leading-snug text-gray-800">{value || '—'}</p>
          </div>
        ))}
      </div>

      {recommendation.safetyFlags.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#FF9500]/15 bg-[#FF9500]/5 p-3 text-xs text-[#9A5A00]">
          <b>{zh ? '教练提示：' : 'Coach note: '}</b>{recommendation.safetyFlags.join(zh ? '、' : ', ')}；{zh ? '系统已自动下调建议强度。' : 'recommended intensity has been reduced.'}
        </div>
      )}

      {recommendation.priorities.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {recommendation.priorities.map((priority, index) => (
            <div key={priority.measurementId} className="rounded-xl border border-[#007AFF]/10 bg-[#007AFF]/[0.035] p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[9px] font-black tracking-widest text-[#007AFF]">PRIORITY {index + 1}{priority.view ? ` · ${priority.view.toUpperCase()}` : ''}</p><p className="mt-1 text-sm font-extrabold text-gray-800">{zh ? priority.name : priority.nameEn}</p></div>
                <span className="text-base font-black text-gray-800">{Number(priority.value).toFixed(1)}{priority.unit}</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-gray-600">{zh ? priority.goal : priority.goalEn}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-400">{zh ? priority.rationale : priority.rationaleEn}</p>
            </div>
          ))}
        </div>
      )}

      {(recommendation.schedule?.length || 0) > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-gray-800">{zh ? '每周执行节奏' : 'Weekly progression'}</h4>
            <span className="text-[10px] text-gray-400">{zh ? '根据完成质量逐周进阶' : 'Progress by movement quality'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {recommendation.schedule!.map(item => (
              <div key={item.week} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-black text-[#5856D6]">WEEK {item.week}</p>
                <p className="mt-1 text-[11px] font-bold leading-snug text-gray-700">{zh ? item.focus : item.focusEn}</p>
                <p className="mt-2 text-[9px] text-gray-400">{item.sessions} {zh ? '次' : 'sessions'} · {item.effort}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendation.exercises.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#007AFF]/30 bg-[#007AFF]/5 p-6 text-center">
          <p className="text-sm font-bold text-gray-800">{zh ? '当前结果来自旧版处方，请点击上方按钮生成完整动作计划。' : 'This result uses an older plan. Regenerate to create the full exercise programme.'}</p>
        </div>
      ) : (['week1_2', 'week3_4'] as const).map(phase => {
        const phaseExercises = recommendation.exercises.filter(item => item.phase === phase);
        if (!phaseExercises.length) return null;
        return (
          <div key={phase} className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-extrabold" style={{ color: phaseInfo[phase].color }}>{phaseInfo[phase].title}</h4>
              <span className="text-[10px] font-semibold text-gray-400">{phaseExercises.length} {zh ? '个动作 · 按顺序完成' : 'exercises · complete in order'}</span>
            </div>
            <div className="space-y-4">
              {phaseExercises.map((exercise, index) => {
                const steps = zh ? (exercise.steps || []) : (exercise.stepsEn || []);
                const mistakes = zh ? (exercise.commonMistakes || []) : (exercise.commonMistakesEn || []);
                return (
                  <article key={`${phase}-${exercise.name}`} className="overflow-hidden rounded-2xl border border-gray-100">
                    <div className="flex flex-wrap items-start justify-between gap-3 bg-gray-50 px-4 py-3">
                      <div className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: phaseInfo[phase].color }}>{index + 1}</span>
                        <div>
                          <h5 className="text-sm font-extrabold text-gray-900">{zh ? exercise.name : exercise.nameEn}</h5>
                          <p className="mt-1 text-[11px] font-semibold text-[#007AFF]">{zh ? exercise.purpose : exercise.purposeEn}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[9px] font-bold">
                        <span className="rounded-lg bg-white px-2 py-1 text-[#007AFF]">{exercise.dose}</span>
                        <span className="rounded-lg bg-white px-2 py-1 text-gray-500">{zh ? exercise.frequency : exercise.frequencyEn}</span>
                        <span className="rounded-lg bg-white px-2 py-1 text-gray-500">{zh ? exercise.intensity : exercise.intensityEn}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1.25fr_0.75fr]">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{zh ? '准备姿势' : 'Setup'}</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">{zh ? exercise.setup : exercise.setupEn}</p>
                        <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-gray-400">{zh ? '动作步骤' : 'Steps'}</p>
                        <ol className="mt-2 space-y-2">
                          {steps.map((step, stepIndex) => (
                            <li key={step} className="flex gap-2 text-xs leading-relaxed text-gray-600"><span className="font-black text-[#007AFF]">{stepIndex + 1}.</span><span>{step}</span></li>
                          ))}
                        </ol>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-gray-500 md:grid-cols-4">
                          <span><b className="text-gray-700">Tempo</b><br />{zh ? exercise.tempo : exercise.tempoEn}</span>
                          <span><b className="text-gray-700">{zh ? '休息' : 'Rest'}</b><br />{zh ? exercise.rest : exercise.restEn}</span>
                          <span><b className="text-gray-700">{zh ? '器械' : 'Equipment'}</b><br />{zh ? exercise.equipment : exercise.equipmentEn}</span>
                          <span><b className="text-gray-700">{zh ? '完成标准' : 'Completion'}</b><br />{zh ? exercise.completionStandard : exercise.completionStandardEn}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-xl bg-[#34C759]/5 p-3"><p className="text-[10px] font-black text-[#248A3D]">{zh ? '教练观察点' : 'Coach observation'}</p><p className="mt-1 text-[11px] leading-relaxed text-gray-600">{zh ? exercise.coachObservation : exercise.coachObservationEn}</p></div>
                        <div className="rounded-xl bg-[#FF9500]/5 p-3"><p className="text-[10px] font-black text-[#9A5A00]">{zh ? '常见错误' : 'Common mistakes'}</p><ul className="mt-1 space-y-1 text-[10px] leading-relaxed text-gray-600">{mistakes.map(item => <li key={item}>• {item}</li>)}</ul></div>
                        <div className="rounded-xl bg-gray-50 p-3 text-[10px] leading-relaxed text-gray-600"><p><b>{zh ? '退阶：' : 'Regress: '}</b>{zh ? exercise.regression : exercise.regressionEn}</p><p className="mt-1"><b>{zh ? '进阶：' : 'Progress: '}</b>{zh ? exercise.progression : exercise.progressionEn}</p></div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}

      <label className="mt-6 flex items-start gap-3 rounded-xl border border-[#5856D6]/10 bg-[#5856D6]/5 p-4">
        <input type="checkbox" checked={coachApproved} onChange={event => onApprove(event.target.checked)} className="mt-0.5" />
        <span className="text-xs leading-relaxed text-gray-600">{zh ? '教练已核对角度、训练优先级、动作顺序和剂量，可以保存为本期会员训练计划。' : 'Coach reviewed angles, priorities, exercise order, and dosage for this member programme.'}</span>
      </label>
      <button onClick={onSave} disabled={!coachApproved || saved} className="mt-4 w-full rounded-xl bg-[#34C759] py-3 text-sm font-bold text-white disabled:opacity-40">
        {saved ? (zh ? '已保存本次评估与处方' : 'Assessment and plan saved') : (zh ? '确认并保存评估与处方' : 'Approve and save assessment & plan')}
      </button>
    </section>
  );
};

const PostureAssess: React.FC<PostureAssessProps> = ({
  lang, memberId, memberName, heightCm, onSaveAssessment, previousAssessment,
}) => {
  const [images, setImages] = useState<Record<PostureView, string | null>>({ front: null, side: null, back: null });
  const [imageSource, setImageSource] = useState<Record<PostureView, 'guided' | 'upload' | null>>({ front: null, side: null, back: null });
  const [height, setHeight] = useState(heightCm);
  const [protocolAcknowledged, setProtocolAcknowledged] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<PostureQuestionnaire>(EMPTY_QUESTIONNAIRE);
  const [cameraView, setCameraView] = useState<PostureView | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState<PostureV2Data | null>(null);
  const [activeMeasurementId, setActiveMeasurementId] = useState<string | null>(null);
  const [evidenceView, setEvidenceView] = useState<PostureView>('front');
  const [editMode, setEditMode] = useState(false);
  const [coachApproved, setCoachApproved] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRefs = useRef<Partial<Record<PostureView, HTMLInputElement | null>>>({});
  const autoPlanRefreshAttempts = useRef(0);

  useEffect(() => {
    setImages({ front: null, side: null, back: null });
    setImageSource({ front: null, side: null, back: null });
    setHeight(heightCm);
    setProtocolAcknowledged(false);
    setQuestionnaire(EMPTY_QUESTIONNAIRE);
    setData(null); setError(''); setCoachApproved(false); setSaved(false);
    autoPlanRefreshAttempts.current = 0;
  }, [memberId, heightCm]);

  const resetResult = () => {
    setData(null); setCoachApproved(false); setSaved(false); setActiveMeasurementId(null);
    autoPlanRefreshAttempts.current = 0;
  };

  const setCapturedImage = (view: PostureView, value: string, source: 'guided' | 'upload') => {
    setImages(prev => ({ ...prev, [view]: value }));
    setImageSource(prev => ({ ...prev, [view]: source }));
    if (source === 'guided') setProtocolAcknowledged(true);
    resetResult();
  };

  const handleFileChange = useCallback(async (view: PostureView, file: File) => {
    const validationError = validateImage(file);
    if (validationError) { setError(validationError); return; }
    try {
      const compressed = await compressImage(file);
      setCapturedImage(view, compressed, 'upload');
      setError('');
    } catch {
      setError(lang === 'zh' ? '图片处理失败，请重试。' : 'Image processing failed.');
    }
  }, [lang]);

  const captureMode: 'guided' | 'upload' = useMemo(() => {
    const used = PHOTO_TYPES.filter(item => images[item.key]).map(item => imageSource[item.key]);
    return used.length > 0 && used.every(source => source === 'guided') ? 'guided' : 'upload';
  }, [images, imageSource]);

  const handleAnalyze = async () => {
    if (!POSTURE_V2_ENABLED) {
      setError(lang === 'zh' ? '体态评估 V2 尚未对当前环境开放。' : 'Posture V2 is not enabled in this environment.');
      return;
    }
    if (!images.front || !images.side) {
      setError(lang === 'zh' ? '至少需要正面和侧面照片。' : 'Front and side photos are required.');
      return;
    }
    setAnalyzing(true); setError(''); resetResult();
    try {
      setStage(lang === 'zh' ? '检测关键点与标志点…' : 'Detecting landmarks and markers…');
      const result = await analyzePostureV2({
        frontImage: images.front, sideImage: images.side,
        backImage: images.back || undefined, heightCm: height,
        captureMode, protocolAcknowledged, questionnaire, previousAssessment,
      });
      setData(result);
      setActiveMeasurementId(result.measurements[0]?.id || null);
      setEvidenceView(result.measurements[0]?.view || 'front');
    } catch (caught: any) {
      setError(caught?.message || (lang === 'zh' ? '分析失败，请检查后端。' : 'Analysis failed.'));
    } finally {
      setAnalyzing(false); setStage('');
    }
  };

  const updateQuestionnaire = <K extends keyof PostureQuestionnaire>(key: K, value: PostureQuestionnaire[K]) => {
    setQuestionnaire(prev => ({ ...prev, [key]: value }));
    resetResult();
  };

  const updatePoint = (
    collection: 'landmarks' | 'markers', name: string, point: any,
  ) => {
    if (!data) return;
    setData({
      ...data,
      views: {
        ...data.views,
        [evidenceView]: {
          ...data.views[evidenceView]!,
          [collection]: { ...data.views[evidenceView]![collection], [name]: point },
        },
      },
    });
    setCoachApproved(false); setSaved(false);
  };

  const handleRecompute = async () => {
    if (!data) return;
    setAnalyzing(true); setStage(lang === 'zh' ? '根据复核节点重新计算…' : 'Recomputing reviewed landmarks…'); setError('');
    try {
      const result = await recomputePostureV2({
        views: data.views, heightCm: height, questionnaire, previousAssessment,
      });
      setData(result); setEditMode(false); setCoachApproved(false);
    } catch (caught: any) {
      setError(caught?.message || '节点复核计算失败');
    } finally {
      setAnalyzing(false); setStage('');
    }
  };

  useEffect(() => {
    const hasDetailedPlan = Boolean(
      data?.recommendation.exercises.length
      && data.recommendation.methodVersion === 'posture-rules-2.2'
      && data.recommendation.exercises.every(item => item.purpose && item.setup && item.steps?.length >= 3),
    );
    if (!data || analyzing || hasDetailedPlan || autoPlanRefreshAttempts.current >= 3) return;
    autoPlanRefreshAttempts.current += 1;
    const retry = window.setTimeout(() => void handleRecompute(), 500);
    return () => window.clearTimeout(retry);
  }, [data, analyzing]);

  const handleSave = async () => {
    if (!data || !images.front || !images.side || !coachApproved) return;
    const issues = data.measurements.map(issueFromMeasurement);
    const recommendation = { ...data.recommendation, approved: true, status: data.recommendation.status === 'draft' ? 'approved' as const : data.recommendation.status };
    const assessment: PostureAssessment = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      date: new Date().toISOString().split('T')[0],
      schemaVersion: 2,
      protocolVersion: data.protocolVersion,
      modelVersion: data.modelVersion,
      frontImage: images.front,
      sideImage: images.side,
      backImage: images.back || undefined,
      report: {
        score: data.trendIndex,
        trendIndex: data.trendIndex,
        confidence: data.confidence,
        issues,
        measurements: data.measurements,
        disclaimer: data.disclaimer,
      },
      correctionPlan: correctionPlanFromData(data),
      aiRecommendation: lang === 'zh' ? data.recommendation.summary : data.recommendation.summaryEn,
      capture: data.capture,
      views: data.views,
      measurements: data.measurements,
      reconstruction: data.reconstruction,
      questionnaire,
      recommendation,
      audit: data.audit,
    };
    try {
      await onSaveAssessment(assessment);
      setSaved(true);
    } catch (caught: any) {
      setError(caught?.message || (lang === 'zh' ? '保存失败。' : 'Save failed.'));
    }
  };

  const activeMeasurement = data?.measurements.find(item => item.id === activeMeasurementId);
  const activeViewResult = data?.views[evidenceView];
  const comparable = Boolean(data?.capture.comparable);

  return (
    <div className="space-y-5 animate-in">
      <PostureCameraCapture
        open={cameraView !== null}
        view={cameraView || 'front'}
        lang={lang}
        onClose={() => setCameraView(null)}
        onCapture={value => cameraView && setCapturedImage(cameraView, value, 'guided')}
      />

      <section className="rounded-2xl border border-[#007AFF]/10 bg-[#007AFF]/[0.035] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-800">{lang === 'zh' ? '标准化拍摄协议 V2' : 'Standardised Capture Protocol V2'}</p>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-500">
              {lang === 'zh'
                ? '建议使用紧身服装，在 C7、双侧肩峰、ASIS/PSIS 贴高对比圆点；侧面补充耳屏、大转子、膝外侧和外踝。镜头位于身体中段，人物占画面 65%–85%。'
                : 'Use fitted clothing and high-contrast markers at C7, acromions, ASIS/PSIS, plus side-view tragus, greater trochanter, knee and ankle.'}
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#5856D6] shadow-sm">{captureMode === 'guided' ? 'GUIDED' : 'UPLOAD'}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PHOTO_TYPES.map(({ key, labelZh, labelEn }) => (
          <div key={key} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="relative flex min-h-[230px] items-center justify-center bg-gray-50">
              {images[key] ? (
                <img src={images[key]!} alt={labelEn} className="absolute inset-0 h-full w-full object-contain p-2" />
              ) : (
                <div className="text-center text-gray-400">
                  <svg className="mx-auto mb-2 h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.5-4.5a2 2 0 012.8 0L16 16m-2-2 1.5-1.5a2 2 0 012.8 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2Z" /></svg>
                  <p className="text-sm font-semibold">{lang === 'zh' ? labelZh : labelEn}</p>
                </div>
              )}
              {imageSource[key] && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[9px] font-bold text-white">{imageSource[key] === 'guided' ? '引导拍摄' : '自由上传'}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              <button onClick={() => setCameraView(key)} className="rounded-xl bg-[#007AFF] px-3 py-2 text-xs font-bold text-white">{lang === 'zh' ? '取景拍摄' : 'Camera'}</button>
              <button onClick={() => fileInputRefs.current[key]?.click()} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600">{lang === 'zh' ? '上传照片' : 'Upload'}</button>
              <input ref={el => { fileInputRefs.current[key] = el; }} type="file" accept="image/jpeg,image/png" className="hidden"
                onChange={event => { const file = event.target.files?.[0]; if (file) handleFileChange(key, file); event.currentTarget.value = ''; }} />
            </div>
          </div>
        ))}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <input type="checkbox" checked={protocolAcknowledged} onChange={event => { setProtocolAcknowledged(event.target.checked); resetResult(); }} className="mt-0.5 h-4 w-4" />
        <span className="text-xs leading-relaxed text-gray-600">
          {lang === 'zh'
            ? '我确认照片按上述协议拍摄。系统仍会检查人物大小、居中、方向和标志点；未通过时会标为近似结果，不参与趋势指数。'
            : 'I confirm the capture protocol was followed. Failed quality checks remain approximate and are excluded from the trend index.'}
        </span>
      </label>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{lang === 'zh' ? '安全与训练问卷' : 'Safety and training questionnaire'}</h3>
            <p className="mt-1 text-[11px] text-gray-400">{lang === 'zh' ? '静态照片不能推断肌肉紧张或薄弱，建议必须结合以下信息。' : 'Static photos cannot infer muscle tightness or weakness.'}</p>
          </div>
          <div className="w-24">
            <label className="text-[10px] text-gray-400">{lang === 'zh' ? '每周训练' : 'Weekly'}</label>
            <input type="number" min={0} max={7} value={questionnaire.weeklyFrequency || 0}
              onChange={event => updateQuestionnaire('weeklyFrequency', Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input value={questionnaire.painArea || ''} onChange={event => updateQuestionnaire('painArea', event.target.value)}
            placeholder={lang === 'zh' ? '疼痛/不适部位（没有可留空）' : 'Pain area (optional)'} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs" />
          <label className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-[10px] text-gray-500">
            <span className="whitespace-nowrap">{lang === 'zh' ? '疼痛 0–10' : 'Pain 0–10'}</span>
            <input type="number" min={0} max={10} value={questionnaire.painLevel ?? 0}
              onChange={event => updateQuestionnaire('painLevel', Math.max(0, Math.min(10, Number(event.target.value))))}
              className="min-w-0 flex-1 rounded-lg border border-gray-100 bg-white px-2 py-1.5 text-xs text-gray-700" />
          </label>
          <select value={questionnaire.goal || ''} onChange={event => updateQuestionnaire('goal', event.target.value)} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs">
            <option value="posture-tracking">{lang === 'zh' ? '体态趋势追踪' : 'Posture tracking'}</option>
            <option value="movement-quality">{lang === 'zh' ? '动作质量' : 'Movement quality'}</option>
            <option value="general-fitness">{lang === 'zh' ? '综合体能' : 'General fitness'}</option>
          </select>
          <select value={questionnaire.experience || 'beginner'} onChange={event => updateQuestionnaire('experience', event.target.value)} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs">
            <option value="beginner">{lang === 'zh' ? '训练经验：入门' : 'Experience: beginner'}</option>
            <option value="intermediate">{lang === 'zh' ? '训练经验：中级' : 'Experience: intermediate'}</option>
            <option value="advanced">{lang === 'zh' ? '训练经验：高级' : 'Experience: advanced'}</option>
          </select>
          <input value={questionnaire.equipment || ''} onChange={event => updateQuestionnaire('equipment', event.target.value)}
            placeholder={lang === 'zh' ? '可用器械' : 'Available equipment'} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
          {([
            ['recentSurgery', '近期手术', 'Recent surgery'], ['acuteInjury', '近期急性损伤', 'Acute injury'],
            ['neurologicalSymptoms', '麻木/无力/放射症状', 'Numbness/weakness'], ['dizziness', '眩晕', 'Dizziness'],
          ] as const).map(([key, zh, en]) => (
            <label key={key} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
              <input type="checkbox" checked={Boolean(questionnaire[key])} onChange={event => updateQuestionnaire(key, event.target.checked)} />
              {lang === 'zh' ? zh : en}
            </label>
          ))}
        </div>
      </section>

      <button onClick={handleAnalyze} disabled={!POSTURE_V2_ENABLED || analyzing || !images.front || !images.side}
        className="w-full rounded-2xl bg-gradient-to-r from-[#007AFF] to-[#5856D6] py-3.5 text-sm font-bold text-white transition disabled:opacity-30">
        {analyzing ? stage || (lang === 'zh' ? '分析中…' : 'Analyzing…') : (lang === 'zh' ? '开始 V2 摄影测量' : 'Start V2 photogrammetry')}
      </button>

      {!POSTURE_V2_ENABLED && (
        <div className="rounded-2xl border border-[#FF9500]/15 bg-[#FF9500]/5 p-4 text-xs text-[#C93400]">
          {lang === 'zh' ? 'V2 当前由功能开关关闭，仅在教练试点环境开放。' : 'V2 is currently disabled by the pilot feature flag.'}
        </div>
      )}

      {error && <div className="rounded-2xl border border-[#FF3B30]/10 bg-[#FF3B30]/5 p-4 text-sm font-medium text-[#FF3B30]">{error}</div>}

      {data && (
        <>
          <section className={`rounded-2xl border p-4 ${comparable ? 'border-[#34C759]/20 bg-[#34C759]/5' : 'border-[#FF9500]/20 bg-[#FF9500]/5'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`text-sm font-bold ${comparable ? 'text-[#248A3D]' : 'text-[#C93400]'}`}>
                  {comparable ? (lang === 'zh' ? '标准化结果，可用于个人趋势' : 'Standardised and trend-comparable') : (lang === 'zh' ? '本次暂不比较趋势，训练处方仍会完整生成' : 'Trend comparison is paused; the full training plan is still generated')}
                </p>
                <p className="mt-1 text-xs text-gray-500">{data.disclaimer}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-2 text-center shadow-sm">
                <p className="text-[10px] text-gray-400">{lang === 'zh' ? '趋势指数' : 'Trend index'}</p>
                <p className="text-xl font-extrabold text-gray-800">{data.trendIndex ?? '基线'}</p>
              </div>
            </div>
            {!comparable && (
              <div className="mt-3 grid gap-1 text-[11px] text-[#C93400]">
                {(Object.entries(data.capture.quality) as [string, { warnings?: string[] } | undefined][]).flatMap(([view, quality]) => (quality?.warnings || []).map(message => <span key={`${view}-${message}`}>• {view}: {message}</span>))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Posture3DViewer reconstruction={data.reconstruction} activeLandmarkIds={activeMeasurement?.landmarkIds} />
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">{lang === 'zh' ? '可追溯测量' : 'Traceable measurements'}</h3>
                <span className="text-[10px] text-gray-400">± {lang === 'zh' ? '定位不确定度' : 'localisation uncertainty'}</span>
              </div>
              <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                {data.measurements.map(item => (
                  <button key={item.id} onClick={() => { setActiveMeasurementId(item.id); setEvidenceView(item.view); }}
                    className={`w-full rounded-xl border p-3 text-left transition ${activeMeasurementId === item.id ? 'border-[#007AFF]/30 bg-[#007AFF]/5' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-gray-800">{lang === 'zh' ? item.name : item.nameEn}</p>
                        <p className="mt-1 text-[10px] text-gray-400">{item.direction}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-gray-800">{item.value.toFixed(1)}{item.unit}</p>
                        <p className="text-[10px] text-gray-400">±{item.uncertainty.toFixed(1)}{item.unit}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">{(item.confidence * 100).toFixed(0)}% confidence</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${item.trackable ? 'bg-[#34C759]/10 text-[#248A3D]' : item.validated ? 'bg-gray-200 text-gray-500' : 'bg-[#FF9500]/10 text-[#C93400]'}`}>
                        {item.trackable
                          ? (lang === 'zh' ? '可追踪' : 'Trackable')
                          : !item.validated
                            ? (lang === 'zh' ? '教练参考' : 'Coach reference')
                            : (lang === 'zh' ? '仅观察' : 'Observe only')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <TrainingPrescriptionPanel
            data={data}
            lang={lang}
            analyzing={analyzing}
            coachApproved={coachApproved}
            saved={saved}
            onRefresh={handleRecompute}
            onApprove={setCoachApproved}
            onSave={handleSave}
          />

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800">{lang === 'zh' ? '证据照片与节点复核' : 'Evidence and landmark review'}</h3>
                <p className="mt-1 text-[11px] text-gray-400">{lang === 'zh' ? '绿色贴点优先于模型节点；拖动后必须重新计算。' : 'Marker points override pose points. Recompute after edits.'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditMode(value => !value)} className={`rounded-xl px-3 py-2 text-xs font-bold ${editMode ? 'bg-[#FF9500] text-white' : 'bg-gray-100 text-gray-600'}`}>{editMode ? '结束拖动' : '人工复核'}</button>
                <button onClick={handleRecompute} disabled={analyzing} className="rounded-xl bg-[#007AFF] px-3 py-2 text-xs font-bold text-white disabled:opacity-30">{lang === 'zh' ? '重新计算角度与处方' : 'Recompute angles & plan'}</button>
              </div>
            </div>
            <div className="mb-3 flex gap-1 rounded-xl bg-gray-100 p-1">
              {PHOTO_TYPES.filter(item => data.views[item.key] && images[item.key]).map(item => (
                <button key={item.key} onClick={() => setEvidenceView(item.key)} className={`flex-1 rounded-lg py-2 text-xs font-semibold ${evidenceView === item.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>{lang === 'zh' ? item.labelZh : item.labelEn}</button>
              ))}
            </div>
            {activeViewResult && images[evidenceView] && (
              <PosturePhotoOverlay src={images[evidenceView]!} view={activeViewResult}
                measurement={activeMeasurement?.view === evidenceView ? activeMeasurement : undefined}
                editable={editMode} onMove={updatePoint} className="h-[620px]" />
            )}
          </section>

          <section className="hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800">{lang === 'zh' ? '4 周训练处方草案' : '4-week training prescription draft'}</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{lang === 'zh' ? data.recommendation.summary : data.recommendation.summaryEn}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#007AFF]/5 px-3 py-1 text-[10px] font-bold text-[#007AFF]">
                  {data.recommendation.frequencyPerWeek || 0}×/{lang === 'zh' ? '周' : 'week'} · {data.recommendation.sessionMinutes || 0} min
                </span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${data.recommendation.status === 'draft' ? 'bg-[#FF9500]/10 text-[#C93400]' : data.recommendation.status === 'blocked' ? 'bg-[#FF3B30]/10 text-[#BC1C17]' : 'bg-gray-100 text-gray-500'}`}>{data.recommendation.status}</span>
              </div>
            </div>
            {data.recommendation.safetyFlags.length > 0 && (
              <div className="mt-4 rounded-xl bg-[#FF3B30]/5 p-3 text-xs text-[#BC1C17]">安全提示：{data.recommendation.safetyFlags.join('、')}</div>
            )}
            {data.recommendation.priorities.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {data.recommendation.priorities.map((priority, index) => (
                  <div key={priority.measurementId} className="rounded-xl border border-[#007AFF]/10 bg-[#007AFF]/[0.035] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#007AFF]">Priority {index + 1}</span>
                        <p className="mt-1 text-xs font-bold text-gray-800">{lang === 'zh' ? priority.name : priority.nameEn}</p>
                      </div>
                      <span className="text-sm font-extrabold text-gray-800">{Number(priority.value).toFixed(1)}{priority.unit} <small className="font-medium text-gray-400">±{Number(priority.uncertainty || 0).toFixed(1)}</small></span>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-gray-600">{lang === 'zh' ? priority.goal : priority.goalEn}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-gray-400">{lang === 'zh' ? priority.rationale : priority.rationaleEn}</p>
                  </div>
                ))}
              </div>
            )}
            {(data.recommendation.schedule?.length || 0) > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                {data.recommendation.schedule!.map(item => (
                  <div key={item.week} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-extrabold text-[#5856D6]">WEEK {item.week}</p>
                    <p className="mt-1 text-[10px] font-semibold leading-snug text-gray-700">{lang === 'zh' ? item.focus : item.focusEn}</p>
                    <p className="mt-2 text-[9px] text-gray-400">{item.sessions} 次 · {item.effort}</p>
                  </div>
                ))}
              </div>
            )}
            {(['week1_2', 'week3_4'] as const).map((phase, phaseIndex) => {
              const exercises = data.recommendation.exercises.filter(item => item.phase === phase);
              if (!exercises.length) return null;
              return (
                <div key={phase} className="mt-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${phaseIndex === 0 ? 'bg-[#007AFF]' : 'bg-[#5856D6]'}`} />
                    <h4 className="text-xs font-extrabold text-gray-800">{phase === 'week1_2' ? (lang === 'zh' ? '第 1–2 周 · 控制与耐受' : 'Weeks 1–2 · Control and tolerance') : (lang === 'zh' ? '第 3–4 周 · 负荷与整合' : 'Weeks 3–4 · Load and integration')}</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {exercises.map((exercise, index) => (
                      <div key={`${phase}-${exercise.name}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-bold text-gray-800">{index + 1}. {lang === 'zh' ? exercise.name : exercise.nameEn}</span>
                          <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[9px] font-bold text-[#007AFF]">{exercise.dose}</span>
                        </div>
                        <p className="mt-2 text-[10px] leading-relaxed text-gray-500">{lang === 'zh' ? exercise.description : exercise.descriptionEn}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-gray-500">
                          <span>Tempo · {lang === 'zh' ? exercise.tempo : exercise.tempoEn}</span>
                          <span>{lang === 'zh' ? exercise.equipment : exercise.equipmentEn}</span>
                        </div>
                        {(lang === 'zh' ? exercise.cues : exercise.cuesEn).length > 0 && (
                          <ul className="mt-2 space-y-1 text-[9px] leading-relaxed text-gray-500">
                            {(lang === 'zh' ? exercise.cues : exercise.cuesEn).map(cue => <li key={cue}>• {cue}</li>)}
                          </ul>
                        )}
                        <div className="mt-3 border-t border-gray-200 pt-2 text-[9px] leading-relaxed text-gray-400">
                          <p><b>{lang === 'zh' ? '退阶' : 'Regress'}:</b> {lang === 'zh' ? exercise.regression : exercise.regressionEn}</p>
                          <p className="mt-1"><b>{lang === 'zh' ? '进阶' : 'Progress'}:</b> {lang === 'zh' ? exercise.progression : exercise.progressionEn}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#5856D6]/10 bg-[#5856D6]/5 p-4">
              <input type="checkbox" checked={coachApproved} onChange={event => setCoachApproved(event.target.checked)} className="mt-0.5" />
              <span className="text-xs leading-relaxed text-gray-600">{lang === 'zh' ? '教练已核对节点、角度、会员问卷和四周训练处方，可以保存并用于后续课程编排。' : 'Coach reviewed the landmarks, angles, questionnaire, and four-week plan for programme delivery.'}</span>
            </label>
            <button onClick={handleSave} disabled={!coachApproved || saved} className="mt-4 w-full rounded-xl bg-[#34C759] py-3 text-sm font-bold text-white disabled:opacity-40">{saved ? (lang === 'zh' ? '已保存本次评估' : 'Assessment saved') : (lang === 'zh' ? '确认并保存评估' : 'Approve and save')}</button>
          </section>
        </>
      )}
    </div>
  );
};

export default PostureAssess;
