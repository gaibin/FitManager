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
}

export interface PostureAssessment {
  id: string;
  date: string; // YYYY-MM-DD
  frontImage: string; // base64 缩略图
  sideImage: string;
  backImage?: string;
  report: PostureReport;
  correctionPlan: CorrectionPlan;
  aiRecommendation?: string;
}

export interface PostureReport {
  score: number; // 0-100
  confidence: number;
  issues: PostureIssue[];
}

export interface PostureIssue {
  name: string; // 如 "高低肩"
  nameEn: string; // 如 "Shoulder Height Imbalance"
  value: number;
  unit: string;
  severity: '正常' | '中度' | '严重' | '低置信度';
  description: string;
  descriptionEn: string;
  exercises: string[];
  confidence: number;
}

export interface CorrectionPlan {
  week1_2: Exercise[];
  week3_4: Exercise[];
}

export interface Exercise {
  name: string;
  description: string;
  sets: string; // 如 "3x15" 或 "3x30s"
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
  logo?: string;
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
