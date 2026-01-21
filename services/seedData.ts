export type SeedWorkout = {
  date: string;
  exercise: string;
  weight: number;
  sets: number;
  reps: number;
};

export type SeedMember = {
  name: string;
  joinDate: string;
  avatar?: string;
  workouts: SeedWorkout[];
};

const EXERCISES = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Row'];

function generateWorkouts(startMonth: number, baseWeight: number): SeedWorkout[] {
  const workouts: SeedWorkout[] = [];
  for (let i = 0; i < 20; i++) {
    const month = startMonth + Math.floor(i / 10); // 每 10 次往后一个月
    const day = String((i * 3) % 28 + 1).padStart(2, '0');
    const date = `2024-${String(month).padStart(2, '0')}-${day}`;
    const ex = EXERCISES[i % EXERCISES.length];
    const weight = baseWeight + (i % 5) * 2;
    const sets = 4;
    const reps = 6 + (i % 4) * 2; // 6/8/10/12
    workouts.push({ date, exercise: ex, weight, sets, reps });
  }
  return workouts;
}

export const SEED_MEMBERS: SeedMember[] = [
  { name: 'Alice Chen', joinDate: '2024-01-05', workouts: generateWorkouts(1, 50) },
  { name: 'Bob Smith', joinDate: '2024-01-08', workouts: generateWorkouts(1, 80) },
  { name: 'Cathy Wu', joinDate: '2024-01-10', workouts: generateWorkouts(2, 55) },
  { name: 'David Liu', joinDate: '2024-01-12', workouts: generateWorkouts(2, 70) },
  { name: 'Ella Zhang', joinDate: '2024-01-15', workouts: generateWorkouts(3, 42) },
  { name: 'Frank Zhao', joinDate: '2024-01-18', workouts: generateWorkouts(3, 90) },
  { name: 'Grace Lin', joinDate: '2024-01-20', workouts: generateWorkouts(4, 48) },
  { name: 'Henry Gu', joinDate: '2024-01-22', workouts: generateWorkouts(4, 76) },
  { name: 'Ivy Sun', joinDate: '2024-01-25', workouts: generateWorkouts(5, 52) },
  { name: 'Jack Ma', joinDate: '2024-01-28', workouts: generateWorkouts(5, 68) },
];

