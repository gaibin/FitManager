import type { Language, Member, PostureAssessment } from '../types';
import type { PostureV2Data } from './postureService';

const API_URL = (
  import.meta.env.VITE_POSTURE_API_URL
  || (import.meta.env.PROD && typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000')
).replace(/\/$/, '');

export interface PostureCoachInsight {
  overview: string;
  confidenceNote: string;
  priorities: Array<{
    title: string;
    measurementId: string;
    evidence: string;
    whyItMatters: string;
    coachingFocus: string;
  }>;
  sessionBrief: {
    objective: string;
    warmupFocus: string;
    mainFocus: string;
    finishFocus: string;
  };
  planNotes: string[];
  coachChecks: string[];
  followUpAnswer?: string;
  model: string;
  generatedAt: string;
  source: 'structured_measurements_only';
}

export interface MemberCoachBrief {
  headline: string;
  summary: string;
  todayFocus: string[];
  loadNote: string;
  postureNote: string;
  nextActions: string[];
  answer?: string;
  model: string;
  generatedAt: string;
  source: 'structured_member_data_only';
}

function minimalMeasurements(measurements: PostureV2Data['measurements'] | undefined) {
  return (measurements || []).slice(0, 30).map(item => ({
    id: item.id,
    name: item.name,
    nameEn: item.nameEn,
    view: item.view,
    value: item.value,
    unit: item.unit,
    uncertainty: item.uncertainty,
    confidence: item.confidence,
    status: item.status,
    trackable: item.trackable,
    direction: item.direction,
    validated: item.validated,
  }));
}

function minimalRecommendation(recommendation: PostureV2Data['recommendation'] | PostureAssessment['recommendation']) {
  if (!recommendation) return null;
  return {
    status: recommendation.status,
    evidenceLevel: recommendation.evidenceLevel,
    safetyFlags: recommendation.safetyFlags,
    summary: recommendation.summary,
    summaryEn: recommendation.summaryEn,
    goal: recommendation.goal,
    goalEn: recommendation.goalEn,
    frequencyPerWeek: recommendation.frequencyPerWeek,
    sessionMinutes: recommendation.sessionMinutes,
    priorities: recommendation.priorities,
    schedule: recommendation.schedule,
    limitations: recommendation.limitations,
    reassessment: recommendation.reassessment,
    exercises: recommendation.exercises.slice(0, 12).map(item => ({
      name: item.name,
      nameEn: item.nameEn,
      purpose: item.purpose,
      purposeEn: item.purposeEn,
      setup: item.setup,
      setupEn: item.setupEn,
      steps: item.steps,
      stepsEn: item.stepsEn,
      targetMeasurementId: item.targetMeasurementId,
      phase: item.phase,
      dose: item.dose,
      frequency: item.frequency,
      frequencyEn: item.frequencyEn,
      intensity: item.intensity,
      intensityEn: item.intensityEn,
      tempo: item.tempo,
      tempoEn: item.tempoEn,
      rest: item.rest,
      restEn: item.restEn,
      equipment: item.equipment,
      equipmentEn: item.equipmentEn,
      cues: item.cues,
      cuesEn: item.cuesEn,
      commonMistakes: item.commonMistakes,
      commonMistakesEn: item.commonMistakesEn,
      coachObservation: item.coachObservation,
      coachObservationEn: item.coachObservationEn,
      regression: item.regression,
      regressionEn: item.regressionEn,
      progression: item.progression,
      progressionEn: item.progressionEn,
      stopCondition: item.stopCondition,
      stopConditionEn: item.stopConditionEn,
    })),
  };
}

async function postAI<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.error || `AI request failed (${response.status})`);
    }
    return result.data as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('AI 响应超时，请稍后重试');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export function getPostureCoachInsight(args: {
  data: PostureV2Data;
  member: { name: string; heightCm: number; gender: 'male' | 'female' };
  previousAssessment?: PostureAssessment;
  lang: Language;
  coachQuestion?: string;
}) {
  const previous = args.previousAssessment?.schemaVersion === 2
    ? {
        date: args.previousAssessment.date,
        measurements: minimalMeasurements(args.previousAssessment.measurements),
      }
    : null;
  return postAI<PostureCoachInsight>('/api/ai/posture-coach', {
    language: args.lang === 'zh' ? 'zh-CN' : 'en',
    member: args.member,
    capture: {
      standardized: args.data.capture.standardized,
      comparable: args.data.capture.comparable,
      confidence: args.data.confidence,
    },
    measurements: minimalMeasurements(args.data.measurements),
    questionnaire: args.data.questionnaire,
    recommendation: minimalRecommendation(args.data.recommendation),
    previousAssessment: previous,
    coachQuestion: args.coachQuestion?.trim().slice(0, 500) || undefined,
  });
}

function minimalLatestAssessment(assessment: PostureAssessment | undefined) {
  if (!assessment) return null;
  return {
    date: assessment.date,
    schemaVersion: assessment.schemaVersion || 1,
    confidence: assessment.report.confidence,
    measurements: minimalMeasurements(assessment.measurements || assessment.report.measurements),
    recommendation: minimalRecommendation(assessment.recommendation),
  };
}

export function getMemberCoachBrief(member: Member, lang: Language, question?: string) {
  const latestAssessment = [...(member.assessments || [])]
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const recentWorkouts = [...(member.workouts || [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)
    .map(item => ({
      date: item.date,
      exercise: item.exercise,
      sets: item.sets,
      reps: item.reps,
      weightKg: item.weight,
      durationSeconds: item.durationSeconds,
      rpe: item.rpe,
      completed: item.completed,
      note: item.note,
    }));
  return postAI<MemberCoachBrief>('/api/ai/member-coach', {
    language: lang === 'zh' ? 'zh-CN' : 'en',
    member: {
      name: member.name,
      gender: member.gender,
      heightCm: member.heightCm,
      joinDate: member.joinDate,
    },
    recentWorkouts,
    latestAssessment: minimalLatestAssessment(latestAssessment),
    question: question?.trim().slice(0, 500) || undefined,
  });
}
