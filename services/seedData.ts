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

const EXERCISES = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Lunge', 'Pull Up'];

function generateProgressiveWorkouts(startMonth: number, baseWeight: number, intensity: number): SeedWorkout[] {
  const workouts: SeedWorkout[] = [];
  const sessionCount = 15 + Math.floor(Math.random() * 10); // 15-25 sessions

  for (let i = 0; i < sessionCount; i++) {
    // 模拟时间推进：每隔2-4天练一次
    const totalDays = i * 3 + Math.floor(Math.random() * 2);
    const dateObj = new Date(2024, startMonth - 1, 1 + totalDays);
    const date = dateObj.toISOString().split('T')[0];

    // 每个 session 1-3 个动作
    const sessionExCount = 1 + (i % 3);
    for (let j = 0; j < sessionExCount; j++) {
      const exIndex = (i + j) % EXERCISES.length;
      const ex = EXERCISES[exIndex];

      // 重量随次数增加（递增化）
      // 基础重量 + (强度 * 进度索引) + 随机波动
      const progressBonus = i * intensity;
      const weight = Math.round(baseWeight + progressBonus + (Math.random() * 2));

      const sets = 3 + (i % 2);
      const reps = 8 + (i % 5);

      workouts.push({ date, exercise: ex, weight, sets, reps });
    }
  }
  return workouts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const NAMES = [
  'Alice Chen', 'Bob Smith', 'Cathy Wu', 'David Liu', 'Ella Zhang',
  'Frank Zhao', 'Grace Lin', 'Henry Gu', 'Ivy Sun', 'Jack Ma',
  'Kevin King', 'Laura Li', 'Michael Wang', 'Nancy He', 'Oscar Yang',
  'Peter Pan', 'Queenie Tan', 'Ryan Ho', 'Sophie Xu', 'Tom Cruise'
];

export const SEED_MEMBERS: SeedMember[] = NAMES.map((name, index) => {
  const baseWeight = 30 + (index * 5); // 基础重量各异
  const intensity = 1 + (index % 3) * 0.5; // 进步速度各异
  const startMonth = 1 + (index % 6); // 入职日期分布在半年内

  return {
    name,
    joinDate: `2024-${String(startMonth).padStart(2, '0')}-01`,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    workouts: generateProgressiveWorkouts(startMonth, baseWeight, intensity)
  };
});
