/**
 * AI 训练记录智能导入 — 通过 DeepSeek API 解析自然语言训练记录
 */

import { createAIProvider, PROVIDER_PRESETS } from './aiProvider';
import { normalizeExercise } from './exerciseStandardizer';
import { db } from './localDatabase';
import type { Workout, AIProviderConfig } from '../types';

interface ParsedWorkout {
  date: string;
  exercise: string;
  weight: number;
  sets: number;
  reps: number;
  durationSeconds?: number;
  rpe?: number;
  completed?: boolean;
  note?: string;
}

const IMPORT_PROMPT = `You are a fitness training log parser. Given a free-text training log in Chinese or English, extract each exercise into structured data.

Output ONLY a valid JSON array of objects. Each object must have these fields:
- date: string (YYYY-MM-DD format, use today's date if not specified)
- exercise: string (standard exercise name in English, e.g. "Bench Press" not "bench" or "卧推")
- weight: number (in kg, default 0 if bodyweight)
- sets: number (default 3 if not specified)
- reps: number (default 10 if not specified)
- durationSeconds: optional number (total hold/training time in seconds)
- rpe: optional number (1-10 only when explicitly stated)
- completed: boolean (default true for a completed training log)
- note: optional short string (only preserve useful coach/member notes)

Exercise name standardization:
- "卧推" / "bench press" / "bp" → "Bench Press"
- "深蹲" / "squat" / "sqt" → "Squat"
- "硬拉" / "deadlift" / "dl" → "Deadlift"
- "推举" / "ohp" / "shoulder press" → "Overhead Press"
- "划船" / "row" → "Barbell Row"
- "引体向上" / "pull up" → "Pull Up"
- "侧平举" / "lateral raise" → "Lateral Raise"
- "弯举" / "curl" → "Barbell Curl"
- "飞鸟" / "fly" → "Chest Fly"
- "腿举" / "leg press" → "Leg Press"
- Running / walking → weight=0
- Plank → sets=duration in seconds, reps=1

Example input: "今天卧推60kg做了4组8次，深蹲80kg5组5次"
Example output: [{"date":"2025-01-15","exercise":"Bench Press","weight":60,"sets":4,"reps":8},{"date":"2025-01-15","exercise":"Squat","weight":80,"sets":5,"reps":5}]

Now parse this training log:`;

export async function parseTrainingLog(text: string, defaultDate: string): Promise<ParsedWorkout[]> {
  const config: AIProviderConfig | null = await db.getAIConfig();
  if (!config || !config.apiKey) {
    // No AI config — try simple regex fallback
    return fallbackParse(text, defaultDate);
  }

  try {
    const provider = createAIProvider(config);
    const response = await provider.generateText(IMPORT_PROMPT + '\n' + text);
    
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');
    
    const parsed = JSON.parse(jsonMatch[0]) as ParsedWorkout[];
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty result');

    // Normalize exercise names
    return parsed.map(w => ({
      ...w,
      date: w.date || defaultDate,
      exercise: normalizeExercise(w.exercise) || w.exercise,
      weight: Number(w.weight) || 0,
      sets: Number(w.sets) || 3,
      reps: Number(w.reps) || 10,
      durationSeconds: Number(w.durationSeconds) > 0 ? Number(w.durationSeconds) : undefined,
      rpe: Number(w.rpe) >= 1 && Number(w.rpe) <= 10 ? Number(w.rpe) : undefined,
      completed: w.completed !== false,
      note: typeof w.note === 'string' && w.note.trim() ? w.note.trim() : undefined,
    }));
  } catch (err) {
    console.warn('AI parse failed, using fallback:', err);
    return fallbackParse(text, defaultDate);
  }
}

// 简单正则 fallback（AI 不可用时）
function fallbackParse(text: string, defaultDate: string): ParsedWorkout[] {
  const results: ParsedWorkout[] = [];
  // 匹配模式: "动作名 weight x kg x sets x reps" 或 "动作名 sets x reps weight kg"
  const patterns = [
    // 卧推60kg4组8次 / Bench 60kg 4x8
    /([\u4e00-\u9fa5a-zA-Z\s]+?)\s*(\d+)\s*kg\s*(\d+)\s*[组x×]\s*(\d+)/gi,
    // 60kg卧推4x8
    /(\d+)\s*kg\s*([\u4e00-\u9fa5a-zA-Z\s]+?)\s*(\d+)\s*[x×]\s*(\d+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const exercise = pattern === patterns[0] ? match[1].trim() : match[2].trim();
      const weight = pattern === patterns[0] ? Number(match[2]) : Number(match[1]);
      const sets = pattern === patterns[0] ? Number(match[3]) : Number(match[3]);
      const reps = pattern === patterns[0] ? Number(match[4]) : Number(match[4]);
      if (exercise && weight >= 0 && sets > 0 && reps > 0) {
        results.push({
          date: defaultDate,
          exercise: normalizeExercise(exercise),
          weight,
          sets,
          reps,
          completed: true,
        });
      }
    }
  }

  return results;
}
