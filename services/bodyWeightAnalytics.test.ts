import { describe, expect, it } from 'vitest';
import { buildBodyWeightTrend } from './bodyWeightAnalytics';
import type { Workout } from '../types';

describe('buildBodyWeightTrend', () => {
  it('keeps exercise load separate and collapses one body weight per date', () => {
    const workouts: Workout[] = [
      { id: '1', date: '2026-07-02', exercise: '深蹲', weight: 80, sets: 3, reps: 8, bodyWeightKg: 70.4 },
      { id: '2', date: '2026-07-02', exercise: '卧推', weight: 60, sets: 3, reps: 8, bodyWeightKg: 70.4 },
      { id: '3', date: '2026-07-05', exercise: '划船', weight: 45, sets: 3, reps: 10, bodyWeightKg: 69.9 },
    ];

    expect(buildBodyWeightTrend(workouts, 71, '2026-07-01')).toEqual([
      { date: '2026-07-01', weightKg: 71, source: 'profile' },
      { date: '2026-07-02', weightKg: 70.4, source: 'training' },
      { date: '2026-07-05', weightKg: 69.9, source: 'training' },
    ]);
  });
});
