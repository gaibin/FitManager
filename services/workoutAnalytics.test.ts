import { describe, expect, it } from 'vitest';
import type { Workout } from '../types';
import { buildWorkoutChartData, getAvailableExercises, getWorkoutSummary } from './workoutAnalytics';

const workouts: Workout[] = [
  { id: '1', date: '2026-07-01', exercise: '深蹲', weight: 60, sets: 3, reps: 8, completed: true, rpe: 7 },
  { id: '2', date: '2026-07-01', exercise: '下巴回收', weight: 0, sets: 3, reps: 10, completed: true, durationSeconds: 90, rpe: 5 },
  { id: '3', date: '2026-07-08', exercise: '深蹲', weight: 65, sets: 4, reps: 6, completed: false, rpe: 9 },
];

describe('workout analytics', () => {
  it('keeps bodyweight posture exercises in completed-set trends', () => {
    expect(new Set(getAvailableExercises(workouts, 'sets'))).toEqual(new Set(['下巴回收', '深蹲']));
    expect(buildWorkoutChartData(workouts, 'sets')).toEqual([
      { date: '07-01', fullDate: '2026-07-01', 深蹲: 3, 下巴回收: 3 },
    ]);
  });

  it('excludes incomplete workouts from performed volume and RPE averages', () => {
    expect(getWorkoutSummary(workouts)).toEqual({
      sessionCount: 2,
      completionRate: 67,
      averageRpe: 6,
      totalDurationSeconds: 90,
      totalVolume: 1440,
      completedSets: 6,
    });
  });

  it('keeps weight charts specific to loaded exercises', () => {
    expect(getAvailableExercises(workouts, 'weight')).toEqual(['深蹲']);
    expect(buildWorkoutChartData(workouts, 'weight')[0].深蹲).toBe(60);
  });
});
