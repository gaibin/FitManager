/** 体态评估 Flask 后端 API 服务封装（V1 兼容 + V2 摄影测量）。 */

import type {
  PostureAssessment,
  PostureAudit,
  PostureCapture,
  PostureMeasurement,
  PostureQuestionnaire,
  PostureRecommendation,
  PostureReconstruction,
  PostureView,
  PostureViewResult,
} from '../types';

const API_URL = (
  import.meta.env.VITE_POSTURE_API_URL
  || (import.meta.env.PROD && typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000')
).replace(/\/$/, '');

export interface AnalyzeRequest {
  front_image: string;
  side_image: string;
  back_image?: string;
  height_cm: number;
  gender: string;
  pose_engine?: string;
  strict_mode?: boolean;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: {
    score: number;
    confidence: number;
    issues: Array<{
      name: string;
      value: number;
      unit: string;
      severity: string;
      description: string;
      exercises?: string[];
      threshold_warn?: number;
      threshold_err?: number;
      confidence?: number;
    }>;
    correction_plan?: {
      week1_2: Array<{
        name: string;
        description: string;
        sets: string;
      }>;
      week3_4: Array<{
        name: string;
        description: string;
        sets: string;
      }>;
    };
    photo_quality?: Record<string, any>;
  };
  error?: string;
  photo_quality?: Record<string, any>;
}

export interface PostureV2Data {
  schemaVersion: 2;
  protocolVersion: string;
  modelVersion: string;
  poseEngine: string;
  disclaimer: string;
  capture: PostureCapture;
  views: Partial<Record<PostureView, PostureViewResult>>;
  measurements: PostureMeasurement[];
  reconstruction: PostureReconstruction;
  trend: { index: number | null; status: string; components: any[]; reason?: string };
  trendIndex: number | null;
  confidence: number;
  recommendation: PostureRecommendation;
  questionnaire: PostureQuestionnaire;
  issues: any[];
  correctionPlan: any;
  audit: PostureAudit;
}

export interface V2AnalyzeRequest {
  frontImage: string;
  sideImage: string;
  backImage?: string;
  heightCm: number;
  captureMode: 'guided' | 'upload';
  protocolAcknowledged: boolean;
  questionnaire: PostureQuestionnaire;
  previousAssessment?: PostureAssessment;
}

async function requestWithTimeout<T>(url: string, options: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查后端是否正常运行');
    }
    throw error;
  }
}

export async function analyzePosture(data: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await requestWithTimeout<AnalyzeResponse>(
    `${API_URL}/api/analyze`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    45000 // 体态分析可能需要较长时间
  );
  return res;
}

function normalizeLandmark(raw: any) {
  return {
    x: Number(raw.x), y: Number(raw.y), z: Number(raw.z || 0),
    confidence: Number(raw.confidence || 0), visibility: Number(raw.visibility || 0),
    source: raw.source || 'pose', sigma: Number(raw.sigma || 0.006),
  };
}

function normalizeView(raw: any): PostureViewResult {
  const mapPoints = (items: Record<string, any> = {}) => Object.fromEntries(
    Object.entries(items).map(([key, value]) => [key, normalizeLandmark(value)])
  );
  return {
    view: raw.view,
    landmarks: mapPoints(raw.landmarks),
    world_landmarks: mapPoints(raw.world_landmarks),
    markers: mapPoints(raw.markers),
    quality: raw.quality,
    engine: raw.engine,
    segmentationMask: raw.segmentation_mask,
    coordinateTransform: raw.coordinate_transform,
  };
}

function normalizeMeasurement(raw: any): PostureMeasurement {
  return {
    id: raw.id, name: raw.name, nameEn: raw.name_en || raw.name,
    view: raw.view, value: Number(raw.value), unit: raw.unit,
    uncertainty: Number(raw.uncertainty || 0), confidence: Number(raw.confidence || 0),
    status: raw.status, trackable: Boolean(raw.trackable), direction: raw.direction || '',
    landmarkIds: raw.landmark_ids || [], description: raw.description || '',
    descriptionEn: raw.description_en || raw.description || '', validated: Boolean(raw.validated),
  };
}

function normalizeRecommendation(raw: any): PostureRecommendation {
  return {
    status: raw.status, methodVersion: raw.method_version,
    requiresCoachReview: Boolean(raw.requires_coach_review),
    approved: Boolean(raw.approved), safetyFlags: raw.safety_flags || [],
    priorities: (raw.priorities || []).map((item: any) => ({
      measurementId: item.measurement_id, name: item.name, nameEn: item.name_en || item.name,
      value: item.value, unit: item.unit, uncertainty: item.uncertainty,
      confidence: item.confidence, direction: item.direction || '', view: item.view,
      goal: item.goal || '', goalEn: item.goal_en || item.goal || '',
      rationale: item.rationale || '', rationaleEn: item.rationale_en || item.rationale || '',
    })),
    exercises: (raw.exercises || []).map((item: any) => ({
      name: item.name, nameEn: item.name_en || item.name,
      description: item.description || '', descriptionEn: item.description_en || item.description || '',
      purpose: item.purpose || '', purposeEn: item.purpose_en || item.purpose || '',
      setup: item.setup || '', setupEn: item.setup_en || item.setup || '',
      steps: item.steps || [], stepsEn: item.steps_en || item.steps || [],
      commonMistakes: item.common_mistakes || [], commonMistakesEn: item.common_mistakes_en || item.common_mistakes || [],
      completionStandard: item.completion_standard || '', completionStandardEn: item.completion_standard_en || item.completion_standard || '',
      coachObservation: item.coach_observation || '', coachObservationEn: item.coach_observation_en || item.coach_observation || '',
      phase: item.phase || 'week1_2', targetMeasurementId: item.target_measurement_id || 'foundation',
      dose: item.dose || '', stopCondition: item.stop_condition || '',
      stopConditionEn: item.stop_condition_en || item.stop_condition || '',
      frequency: item.frequency || '', frequencyEn: item.frequency_en || item.frequency || '',
      intensity: item.intensity || '', intensityEn: item.intensity_en || item.intensity || '',
      tempo: item.tempo || '', tempoEn: item.tempo_en || item.tempo || '',
      rest: item.rest || '', restEn: item.rest_en || item.rest || '',
      equipment: item.equipment || '', equipmentEn: item.equipment_en || item.equipment || '',
      cues: item.cues || [], cuesEn: item.cues_en || item.cues || [],
      regression: item.regression || '', regressionEn: item.regression_en || item.regression || '',
      progression: item.progression || '', progressionEn: item.progression_en || item.progression || '',
    })),
    summary: raw.summary || '', summaryEn: raw.summary_en || raw.summary || '',
    goal: raw.goal || '', goalEn: raw.goal_en || raw.goal || '',
    evidenceLevel: raw.evidence_level || 'screening',
    frequencyPerWeek: Number(raw.frequency_per_week || 0),
    sessionMinutes: Number(raw.session_minutes || 0),
    schedule: (raw.schedule || []).map((item: any) => ({
      week: Number(item.week), focus: item.focus || '', focusEn: item.focus_en || item.focus || '',
      sessions: Number(item.sessions || 0), effort: item.effort || '',
    })),
    limitations: raw.limitations || [],
    reassessment: raw.reassessment,
  };
}

function normalizeReconstruction(raw: any): PostureReconstruction {
  return {
    available: Boolean(raw?.available), kind: '2.5d', units: raw?.units,
    comparable: raw?.comparable, poseMismatch: raw?.pose_mismatch,
    nodes: raw?.nodes, bones: raw?.bones, limitations: raw?.limitations, reason: raw?.reason,
  };
}

function normalizeV2(raw: any): PostureV2Data {
  const views = Object.fromEntries(
    Object.entries(raw.views || {}).map(([key, value]) => [key, normalizeView(value)])
  ) as Partial<Record<PostureView, PostureViewResult>>;
  return {
    schemaVersion: 2,
    protocolVersion: raw.protocol_version,
    modelVersion: raw.model_version,
    poseEngine: raw.pose_engine,
    disclaimer: raw.disclaimer,
    capture: raw.capture,
    views,
    measurements: (raw.measurements || []).map(normalizeMeasurement),
    reconstruction: normalizeReconstruction(raw.reconstruction),
    trend: raw.trend,
    trendIndex: raw.trend_index,
    confidence: Number(raw.confidence || 0),
    recommendation: normalizeRecommendation(raw.recommendation || {}),
    questionnaire: raw.questionnaire || {},
    issues: raw.issues || [],
    correctionPlan: raw.correction_plan || { week1_2: [], week3_4: [] },
    audit: {
      processingMs: Number(raw.audit?.processing_ms || 0),
      qualityFailures: raw.audit?.quality_failures || {},
      manualCorrectionDistanceNorm: raw.audit?.manual_correction_distance_norm || {},
      rawPhotoTelemetry: false,
    },
  };
}

export async function checkPostureView(args: {
  image: string;
  view: PostureView;
  heightCm: number;
  captureMode: 'guided' | 'upload';
  protocolAcknowledged: boolean;
}): Promise<PostureViewResult> {
  const response = await requestWithTimeout<any>(`${API_URL}/api/posture/v2/check-view`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: args.image, view: args.view, height_cm: args.heightCm,
      capture_mode: args.captureMode, protocol_acknowledged: args.protocolAcknowledged,
    }),
  }, 60000);
  if (!response.success) throw new Error(response.error || '视图检查失败');
  return normalizeView(response.data);
}

export async function analyzePostureV2(args: V2AnalyzeRequest): Promise<PostureV2Data> {
  const previous = args.previousAssessment?.schemaVersion === 2 ? {
    protocol_version: args.previousAssessment.protocolVersion,
    measurements: args.previousAssessment.measurements?.map(item => ({
      id: item.id, value: item.value, confidence: item.confidence, trackable: item.trackable,
    })),
    capture: args.previousAssessment.capture,
  } : undefined;
  const q = args.questionnaire;
  const response = await requestWithTimeout<any>(`${API_URL}/api/posture/v2/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      front_image: args.frontImage, side_image: args.sideImage, back_image: args.backImage,
      height_cm: args.heightCm, capture_mode: args.captureMode,
      protocol_acknowledged: args.protocolAcknowledged,
      questionnaire: {
        pain_area: q.painArea, pain_level: q.painLevel,
        recent_surgery: q.recentSurgery, acute_injury: q.acuteInjury,
        neurological_symptoms: q.neurologicalSymptoms, dizziness: q.dizziness,
        goal: q.goal, experience: q.experience, equipment: q.equipment,
        weekly_frequency: q.weeklyFrequency,
      },
      previous_assessment: previous,
    }),
  }, 120000);
  if (!response.success) throw new Error(response.error || '体态评估 V2 失败');
  return normalizeV2(response.data);
}

export async function recomputePostureV2(args: {
  views: Partial<Record<PostureView, PostureViewResult>>;
  heightCm: number;
  questionnaire: PostureQuestionnaire;
  previousAssessment?: PostureAssessment;
}): Promise<PostureV2Data> {
  const previous = args.previousAssessment?.schemaVersion === 2 ? {
    protocol_version: args.previousAssessment.protocolVersion,
    measurements: args.previousAssessment.measurements,
    capture: args.previousAssessment.capture,
  } : undefined;
  const response = await requestWithTimeout<any>(`${API_URL}/api/posture/v2/recompute`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      views: args.views, height_cm: args.heightCm,
      questionnaire: {
        pain_area: args.questionnaire.painArea,
        pain_level: args.questionnaire.painLevel,
        recent_surgery: args.questionnaire.recentSurgery,
        acute_injury: args.questionnaire.acuteInjury,
        neurological_symptoms: args.questionnaire.neurologicalSymptoms,
        dizziness: args.questionnaire.dizziness,
        goal: args.questionnaire.goal,
        experience: args.questionnaire.experience,
        equipment: args.questionnaire.equipment,
        weekly_frequency: args.questionnaire.weeklyFrequency,
      },
      previous_assessment: previous,
    }),
  }, 60000);
  if (!response.success) throw new Error(response.error || '节点复核失败');
  return normalizeV2(response.data);
}

export async function checkHealth(): Promise<{ status: string; version: string }> {
  const res = await requestWithTimeout<{ status: string; version: string }>(
    `${API_URL}/api/health`,
    { method: 'GET' },
    10000
  );
  return res;
}
