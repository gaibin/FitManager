export type Language = 'en' | 'zh';

export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  memberId?: string; // 如果是会员，关联到 members.id
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  exercise: string;
  weight: number;
  sets: number;
  reps: number;
  /** Optional posture-training details. Missing values keep legacy records valid. */
  durationSeconds?: number;
  rpe?: number;
  completed?: boolean;
  note?: string;
}

export interface PostureAssessment {
  id: string;
  date: string; // YYYY-MM-DD
  schemaVersion?: 1 | 2;
  protocolVersion?: string;
  modelVersion?: string;
  frontImage: string; // base64 缩略图
  sideImage: string;
  backImage?: string;
  report: PostureReport;
  correctionPlan: CorrectionPlan;
  aiRecommendation?: string;
  capture?: PostureCapture;
  views?: Partial<Record<PostureView, PostureViewResult>>;
  measurements?: PostureMeasurement[];
  reconstruction?: PostureReconstruction;
  questionnaire?: PostureQuestionnaire;
  recommendation?: PostureRecommendation;
  audit?: PostureAudit;
}

export interface PostureReport {
  score: number | null; // V1: 0-100 score; V2: nullable trend index
  trendIndex?: number | null;
  confidence: number;
  issues: PostureIssue[];
  measurements?: PostureMeasurement[];
  disclaimer?: string;
}

export interface PostureIssue {
  name: string; // 如 "高低肩"
  nameEn: string; // 如 "Shoulder Height Imbalance"
  value: number;
  unit: string;
  severity: '正常' | '中度' | '严重' | '低置信度' | '观察';
  description: string;
  descriptionEn: string;
  exercises: string[];
  confidence: number;
  uncertainty?: number;
  measurementId?: string;
}

export type PostureView = 'front' | 'side' | 'back';
export type LandmarkSource = 'pose' | 'marker' | 'manual' | 'derived';

export interface PostureLandmark {
  x: number;
  y: number;
  z?: number;
  confidence: number;
  visibility: number;
  source: LandmarkSource;
  sigma: number;
}

export interface PostureViewQuality {
  status: 'good' | 'usable' | 'poor';
  capture_mode: 'guided' | 'upload';
  protocol_acknowledged: boolean;
  standardized: boolean;
  comparable: boolean;
  visibility: number;
  body_height_ratio: number;
  center_x: number;
  shoulder_width_ratio: number;
  orientation_ok: boolean;
  marker_completeness: number;
  warnings: string[];
}

export interface PostureViewResult {
  view: PostureView;
  landmarks: Record<string, PostureLandmark>;
  world_landmarks: Record<string, PostureLandmark>;
  markers: Record<string, PostureLandmark>;
  quality: PostureViewQuality;
  engine: string;
  segmentationMask?: string;
  coordinateTransform?: {
    space: 'normalized-image';
    origin: 'top-left';
    x_axis: 'right';
    y_axis: 'down';
    image_width: number;
    image_height: number;
  };
}

export interface PostureMeasurement {
  id: string;
  name: string;
  nameEn: string;
  view: PostureView;
  value: number;
  unit: string;
  uncertainty: number;
  confidence: number;
  status: 'measured' | 'low_confidence' | 'estimated' | 'unavailable';
  trackable: boolean;
  direction: string;
  landmarkIds: string[];
  description: string;
  descriptionEn: string;
  validated: boolean;
}

export interface ReconstructionNode {
  x: number;
  y: number;
  z: number;
  confidence: number;
}

export interface PostureReconstruction {
  available: boolean;
  kind: '2.5d';
  units?: string;
  comparable?: boolean;
  poseMismatch?: number;
  nodes?: Record<string, ReconstructionNode>;
  bones?: [string, string][];
  limitations?: string[];
  reason?: string;
}

export interface PostureCapture {
  mode: 'guided' | 'upload';
  standardized: boolean;
  comparable: boolean;
  quality: Partial<Record<PostureView, PostureViewQuality>>;
}

export interface PostureQuestionnaire {
  painArea?: string;
  painLevel?: number;
  recentSurgery: boolean;
  acuteInjury: boolean;
  neurologicalSymptoms: boolean;
  dizziness: boolean;
  goal?: string;
  experience?: string;
  equipment?: string;
  weeklyFrequency?: number;
}

export interface RecommendationExercise {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  purpose: string;
  purposeEn: string;
  setup: string;
  setupEn: string;
  steps: string[];
  stepsEn: string[];
  commonMistakes: string[];
  commonMistakesEn: string[];
  completionStandard: string;
  completionStandardEn: string;
  coachObservation: string;
  coachObservationEn: string;
  phase: 'week1_2' | 'week3_4';
  targetMeasurementId: string;
  dose: string;
  frequency: string;
  frequencyEn: string;
  intensity: string;
  intensityEn: string;
  tempo: string;
  tempoEn: string;
  rest: string;
  restEn: string;
  equipment: string;
  equipmentEn: string;
  cues: string[];
  cuesEn: string[];
  regression: string;
  regressionEn: string;
  progression: string;
  progressionEn: string;
  stopCondition: string;
  stopConditionEn: string;
}

export interface PostureRecommendation {
  status: 'draft' | 'blocked' | 'withheld' | 'approved';
  methodVersion?: string;
  requiresCoachReview: boolean;
  approved: boolean;
  safetyFlags: string[];
  evidenceLevel?: 'validated' | 'screening' | 'withheld' | 'coach_reference';
  priorities: {
    measurementId: string;
    name: string;
    nameEn?: string;
    value: number;
    unit: string;
    uncertainty?: number;
    confidence?: number;
    direction?: string;
    view?: PostureView;
    goal?: string;
    goalEn?: string;
    rationale?: string;
    rationaleEn?: string;
  }[];
  exercises: RecommendationExercise[];
  summary: string;
  summaryEn: string;
  goal?: string;
  goalEn?: string;
  frequencyPerWeek?: number;
  sessionMinutes?: number;
  schedule?: {
    week: number;
    focus: string;
    focusEn: string;
    sessions: number;
    effort: string;
  }[];
  limitations?: string[];
  reassessment?: string;
}

export interface PostureAudit {
  processingMs: number;
  qualityFailures: Partial<Record<PostureView, string[]>>;
  manualCorrectionDistanceNorm: Partial<Record<PostureView, number>>;
  rawPhotoTelemetry: false;
}

export interface CorrectionPlan {
  week1_2: Exercise[];
  week3_4: Exercise[];
}

export interface Exercise {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  sets: string; // 如 "3x15" 或 "3x30s"
  stopCondition?: string;
  cues?: string[];
  cuesEn?: string[];
  tempo?: string;
  tempoEn?: string;
  rest?: string;
  restEn?: string;
  equipment?: string;
  equipmentEn?: string;
  regression?: string;
  regressionEn?: string;
  progression?: string;
  progressionEn?: string;
}

export interface AIProviderConfig {
  provider: 'gemini' | 'deepseek' | 'kimi' | 'openai-compatible';
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

export interface Member {
  id: string;
  name: string;
  avatar: string; // URL or placeholder
  joinDate: string;
  gender: 'male' | 'female';
  heightCm: number;
  workouts: Workout[];
  assessments: PostureAssessment[];
  photoUrl?: string; // For progress pics
}

export interface StudioConfig {
  name: string;
  logo?: string; // base64 or URL
  coachName?: string;
  accentColor?: string; // hex color
  phone?: string;
  email?: string;
}

// 健康指数
export interface WellnessScore {
  posture: number | null; // V1 体态分；V2 趋势指数不作为健康分量
  consistency: number;   // 出勤一致性 0-100
  progress: number;      // 训练进步 0-100
  total: number;         // 综合分 0-100
}

// 评估趋势
export interface AssessmentTrend {
  date: string;
  score: number;
  confidence: number;
}

// 训练模板
export interface TrainingTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: 'fat-loss' | 'muscle-gain' | 'posture-fix' | 'general';
  workouts: { exercise: string; sets: number; reps: number; weight: number }[];
}

// 会员课程目标
export interface MemberGoal {
  id: string;
  memberId: string;
  type: 'posture' | 'strength' | 'weight' | 'attendance';
  target: number;
  current: number;
  unit: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface TranslationDictionary {
  [key: string]: {
    en: string;
    zh: string;
  };
}

export const CHART_COLORS = [
  '#a3e635', // lime-400
  '#3b82f6', // blue-500
  '#f43f5e', // rose-500
  '#e879f9', // fuchsia-400
  '#f59e0b', // amber-500
  '#22d3ee', // cyan-400
  '#a78bfa', // violet-400
  '#fb923c', // orange-400
  '#34d399', // emerald-400
  '#818cf8', // indigo-400
  '#fb7185', // rose-400
  '#c084fc', // purple-400
];
