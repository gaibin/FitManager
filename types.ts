export type Language = 'en' | 'zh';

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  exercise: string;
  weight: number;
  sets: number;
  reps: number;
}

export interface Member {
  id: string;
  name: string;
  avatar: string; // URL or placeholder
  joinDate: string;
  workouts: Workout[];
  photoUrl?: string; // For progress pics
}

export interface StudioConfig {
  name: string;
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