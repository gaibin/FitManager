import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Language, PostureAssessment } from '../types';
import type { PostureV2Data } from '../services/postureService';
import {
  getPostureCoachInsight,
  type PostureCoachInsight,
} from '../services/aiCoachService';

interface Props {
  data: PostureV2Data;
  memberName: string;
  heightCm: number;
  gender: 'male' | 'female';
  previousAssessment?: PostureAssessment;
  lang: Language;
}

const PostureAIInsight: React.FC<Props> = ({
  data, memberName, heightCm, gender, previousAssessment, lang,
}) => {
  const [insight, setInsight] = useState<PostureCoachInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const generatedFingerprint = useRef('');
  const zh = lang === 'zh';
  const fingerprint = useMemo(() => JSON.stringify({
    measurements: data.measurements.map(item => [item.id, item.value, item.confidence]),
    exercises: data.recommendation.exercises.map(item => [item.name, item.dose]),
  }), [data]);

  const generate = useCallback(async (coachQuestion?: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await getPostureCoachInsight({
        data,
        member: { name: memberName, heightCm, gender },
        previousAssessment,
        lang,
        coachQuestion,
      });
      setInsight(result);
      generatedFingerprint.current = fingerprint;
    } catch (err: any) {
      setError(err?.message || (zh ? 'AI 教练解读生成失败' : 'Unable to generate AI coach insight'));
    } finally {
      setLoading(false);
    }
  }, [data, memberName, heightCm, gender, previousAssessment, lang, fingerprint, zh]);

  useEffect(() => {
    if (data.measurements.length && generatedFingerprint.current !== fingerprint) {
      void generate();
    }
  }, [data.measurements.length, fingerprint, generate]);

  const submitQuestion = () => {
    if (!question.trim()) return;
    void generate(question);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#5856D6]/15 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-[#17152A] via-[#242044] to-[#312A67] px-5 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-white/10 px-2 py-1 text-[9px] font-black tracking-[0.18em]">AI COACH</span>
              <span className="rounded-full border border-[#70D7FF]/30 bg-[#70D7FF]/10 px-2.5 py-1 text-[9px] font-bold text-[#A9E8FF]">
                {zh ? `基于 ${data.measurements.length} 项算法测量` : `Based on ${data.measurements.length} algorithmic measurements`}
              </span>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-[9px] text-white/65">
                {zh ? '不读取照片' : 'No photo access'}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-extrabold">{zh ? '教练决策解读' : 'Coach decision brief'}</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-white/60">
              {zh ? '测量与动作选择由标准算法和规则引擎决定，AI 负责整理证据、训练顺序与现场观察重点。' : 'Measurements and exercise selection come from the algorithm and rules engine; AI organises the evidence and coaching focus.'}
            </p>
          </div>
          <button onClick={() => void generate()} disabled={loading}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/15 disabled:opacity-50">
            {loading ? (zh ? '生成中…' : 'Generating…') : (zh ? '重新生成解读' : 'Regenerate brief')}
          </button>
        </div>
      </div>

      <div className="p-5">
        {loading && !insight && (
          <div className="grid min-h-40 place-items-center rounded-xl bg-gray-50 text-sm text-gray-400">
            <span className="animate-pulse">{zh ? '正在根据测量结果组织教练简报…' : 'Building a coach brief from measurements…'}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#FF3B30]/10 bg-[#FF3B30]/5 p-3 text-xs text-[#C93400]">{error}</div>
        )}

        {insight && (
          <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-xl bg-[#F7F7FA] p-4">
                <p className="text-[9px] font-black tracking-[0.16em] text-[#5856D6]">EXECUTIVE BRIEF</p>
                <p className="mt-2 text-sm font-semibold leading-7 text-gray-800">{insight.overview}</p>
              </div>
              <div className="rounded-xl border border-[#FF9500]/10 bg-[#FF9500]/5 p-4">
                <p className="text-[9px] font-black tracking-[0.16em] text-[#C76A00]">CONFIDENCE</p>
                <p className="mt-2 text-xs leading-6 text-gray-600">{insight.confidenceNote}</p>
              </div>
            </div>

            {insight.priorities.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {insight.priorities.map((item, index) => (
                  <article key={`${item.measurementId}-${index}`} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-extrabold text-gray-900">{index + 1}. {item.title}</p>
                      <span className="rounded-full bg-[#007AFF]/5 px-2 py-1 font-mono text-[9px] text-[#007AFF]">{item.measurementId}</span>
                    </div>
                    <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] font-bold text-gray-700">{item.evidence}</p>
                    <p className="mt-2 text-xs leading-5 text-gray-500">{item.whyItMatters}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-[#5856D6]">{item.coachingFocus}</p>
                  </article>
                ))}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-extrabold text-gray-800">{zh ? '下一次课程编排' : 'Next-session structure'}</p>
              <div className="grid gap-2 md:grid-cols-4">
                {[
                  [zh ? '本次目标' : 'Objective', insight.sessionBrief.objective],
                  [zh ? '热身重点' : 'Warm-up', insight.sessionBrief.warmupFocus],
                  [zh ? '主体训练' : 'Main work', insight.sessionBrief.mainFocus],
                  [zh ? '结束环节' : 'Finish', insight.sessionBrief.finishFocus],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-gray-700">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-extrabold text-gray-800">{zh ? '计划说明' : 'Plan notes'}</p>
                <ul className="mt-2 space-y-2">
                  {insight.planNotes.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-gray-600"><span className="text-[#34C759]">●</span>{item}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-extrabold text-gray-800">{zh ? '教练现场检查' : 'Coach checkpoints'}</p>
                <ul className="mt-2 space-y-2">
                  {insight.coachChecks.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-gray-600"><span className="text-[#FF9500]">◆</span>{item}</li>)}
                </ul>
              </div>
            </div>

            {insight.followUpAnswer && (
              <div className="rounded-xl border border-[#5856D6]/10 bg-[#5856D6]/5 p-4 text-xs leading-6 text-gray-700">
                <b className="text-[#5856D6]">{zh ? '追问回答：' : 'Answer: '}</b>{insight.followUpAnswer}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row">
          <input value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') submitQuestion(); }}
            placeholder={zh ? '追问本次评估，例如：第一节课如何安排？' : 'Ask about this assessment…'}
            className="min-w-0 flex-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs outline-none focus:border-[#5856D6]/30" />
          <button onClick={submitQuestion} disabled={loading || !question.trim()}
            className="rounded-xl bg-[#5856D6] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">
            {zh ? '基于本次数据回答' : 'Answer from this data'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default PostureAIInsight;
