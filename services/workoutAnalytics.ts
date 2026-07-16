import type { Workout } from '../types';

export type WorkoutChartMetric = 'weight' | 'volume' | 'sets';

export interface WorkoutChartPoint {
  date: string;
  fullDate: string;
  [exercise: string]: string | number;
}

export interface WorkoutSummary {
  sessionCount: number;
  completionRate: number | null;
  averageRpe: number | null;
  totalDurationSeconds: number;
  totalVolume: number;
  completedSets: number;
}

export const isWorkoutCompleted = (workout: Workout) => workout.completed !== false;

export function getWorkoutSummary(workouts: Workout[]): WorkoutSummary {
  const completed = workouts.filter(isWorkoutCompleted);
  const rpeValues = completed
    .map(workout => workout.rpe)
    .filter((value): value is number => typeof value === 'number' && value >= 1 && value <= 10);

  return {
    sessionCount: new Set(workouts.map(workout => workout.date)).size,
    completionRate: workouts.length > 0
      ? Math.round((completed.length / workouts.length) * 100)
      : null,
    averageRpe: rpeValues.length > 0
      ? rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length
      : null,
    totalDurationSeconds: completed.reduce((sum, workout) => sum + (workout.durationSeconds ?? 0), 0),
    totalVolume: completed.reduce(
      (sum, workout) => sum + workout.weight * workout.sets * workout.reps,
      0,
    ),
    completedSets: completed.reduce((sum, workout) => sum + workout.sets, 0),
  };
}

export function getAvailableExercises(workouts: Workout[], metric: WorkoutChartMetric): string[] {
  const counts = new Map<string, number>();
  workouts.forEach(workout => {
    if (!isWorkoutCompleted(workout)) return;
    if (metric !== 'sets' && workout.weight <= 0) return;
    counts.set(workout.exercise, (counts.get(workout.exercise) ?? 0) + 1);
  });
  return Array.from(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

export function buildWorkoutChartData(
  workouts: Workout[],
  metric: WorkoutChartMetric,
): WorkoutChartPoint[] {
  const rows = new Map<string, WorkoutChartPoint>();

  workouts.forEach(workout => {
    if (!isWorkoutCompleted(workout)) return;
    if (metric !== 'sets' && workout.weight <= 0) return;

    const row = rows.get(workout.date) ?? {
      date: workout.date.substring(5),
      fullDate: workout.date,
    };
    const previous = Number(row[workout.exercise] ?? 0);

    if (metric === 'weight') {
      row[workout.exercise] = Math.max(previous, workout.weight);
    } else if (metric === 'volume') {
      row[workout.exercise] = previous + workout.weight * workout.sets * workout.reps;
    } else {
      row[workout.exercise] = previous + workout.sets;
    }

    rows.set(workout.date, row);
  });

  return Array.from(rows.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
}
