import type { Member, Workout } from '../types';

export interface BodyWeightPoint {
  date: string;
  weightKg: number;
  source: 'profile' | 'training';
}

export function buildBodyWeightTrend(
  workouts: Workout[],
  profileWeightKg?: number,
  joinDate?: string,
): BodyWeightPoint[] {
  const byDate = new Map<string, BodyWeightPoint>();
  if (profileWeightKg != null && joinDate) {
    byDate.set(joinDate, { date: joinDate, weightKg: profileWeightKg, source: 'profile' });
  }
  [...workouts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(workout => {
      if (workout.bodyWeightKg == null || !Number.isFinite(workout.bodyWeightKg)) return;
      byDate.set(workout.date, {
        date: workout.date,
        weightKg: workout.bodyWeightKg,
        source: 'training',
      });
    });
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getCurrentBodyWeight(member: Member): number | undefined {
  return buildBodyWeightTrend(member.workouts, member.weightKg, member.joinDate).at(-1)?.weightKg;
}
