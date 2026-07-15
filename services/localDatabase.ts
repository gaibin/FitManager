/**
 * 本地 IndexedDB 数据库封装 (Dexie.js)
 * 实现与 cloudDatabase.ts 相同的接口，并扩展体态评估功能
 */

import Dexie, { type Table } from 'dexie';
import type { Member, Workout, PostureAssessment, AIProviderConfig, TrainingTemplate, MemberGoal } from '../types';

interface MemberRow {
  id: string;
  name: string;
  avatar: string;
  joinDate: string;
  gender: string;
  heightCm: number;
  photoUrl?: string;
}

interface WorkoutRow {
  id: string;
  memberId: string;
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

interface AssessmentRow {
  id: string;
  memberId: string;
  data: PostureAssessment;
}

interface ConfigRow {
  key: string;
  value: any;
}

interface TemplateRow {
  id: string;
  data: TrainingTemplate;
}

interface GoalRow {
  id: string;
  memberId: string;
  data: MemberGoal;
}

class NeonFitDB extends Dexie {
  members!: Table<MemberRow, string>;
  workouts!: Table<WorkoutRow, string>;
  assessments!: Table<AssessmentRow, string>;
  configs!: Table<ConfigRow, string>;
  templates!: Table<TemplateRow, string>;
  goals!: Table<GoalRow, string>;

  constructor() {
    super('NeonFitStudioDB');
    this.version(2).stores({
      members: 'id',
      workouts: 'id, memberId, date',
      assessments: 'id, memberId',
      configs: 'key',
      templates: 'id',
      goals: 'id, memberId',
    });
  }
}

const dexieDb = new NeonFitDB();

class LocalDatabase {
  // --- Members ---

  async getMembers(): Promise<Member[]> {
    const memberRows = await dexieDb.members.toArray();
    const workoutRows = await dexieDb.workouts.toArray();
    const assessmentRows = await dexieDb.assessments.toArray();

    const workoutsByMember: Record<string, Workout[]> = {};
    for (const w of workoutRows) {
      if (!workoutsByMember[w.memberId]) workoutsByMember[w.memberId] = [];
      workoutsByMember[w.memberId].push({
        id: w.id,
        date: w.date,
        exercise: w.exercise,
        weight: w.weight,
        sets: w.sets,
        reps: w.reps,
        durationSeconds: w.durationSeconds,
        rpe: w.rpe,
        completed: w.completed,
        note: w.note,
      });
    }

    const assessmentsByMember: Record<string, PostureAssessment[]> = {};
    for (const a of assessmentRows) {
      if (!assessmentsByMember[a.memberId]) assessmentsByMember[a.memberId] = [];
      assessmentsByMember[a.memberId].push(a.data);
    }

    return memberRows.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      joinDate: m.joinDate,
      gender: (m.gender as 'male' | 'female') || 'male',
      heightCm: m.heightCm || 170,
      workouts: workoutsByMember[m.id] || [],
      assessments: assessmentsByMember[m.id] || [],
      photoUrl: m.photoUrl,
    }));
  }

  async addMember(
    name: string,
    options?: { joinDate?: string; avatar?: string; photoUrl?: string; gender?: string; heightCm?: number }
  ): Promise<Member> {
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
    const joinDate = options?.joinDate || new Date().toISOString().split('T')[0];
    const avatar =
      options?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    const row: MemberRow = {
      id,
      name,
      avatar,
      joinDate,
      gender: options?.gender || 'male',
      heightCm: options?.heightCm || 170,
      photoUrl: options?.photoUrl,
    };

    await dexieDb.members.put(row);

    return {
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      joinDate: row.joinDate,
      gender: row.gender as 'male' | 'female',
      heightCm: row.heightCm,
      workouts: [],
      assessments: [],
      photoUrl: row.photoUrl,
    };
  }

  async deleteMember(id: string): Promise<void> {
    await dexieDb.workouts.where('memberId').equals(id).delete();
    await dexieDb.assessments.where('memberId').equals(id).delete();
    await dexieDb.members.delete(id);
  }

  async updateMemberPhoto(memberId: string, photoUrl: string): Promise<void> {
    await dexieDb.members.update(memberId, { photoUrl });
  }

  async updateMember(memberId: string, updates: Partial<Pick<MemberRow, 'gender' | 'heightCm' | 'name' | 'avatar'>>): Promise<void> {
    await dexieDb.members.update(memberId, updates);
  }

  // --- Workouts ---

  async addWorkouts(
    memberId: string,
    workouts: Omit<Workout, 'id'>[]
  ): Promise<Workout[]> {
    const newWorkouts: Workout[] = [];
    for (const w of workouts) {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
      const row: WorkoutRow = {
        id,
        memberId,
        date: w.date,
        exercise: w.exercise,
        weight: w.weight,
        sets: w.sets,
        reps: w.reps,
        durationSeconds: w.durationSeconds,
        rpe: w.rpe,
        completed: w.completed,
        note: w.note,
      };
      await dexieDb.workouts.put(row);
      newWorkouts.push({ id, ...w });
    }
    return newWorkouts;
  }

  async updateWorkout(memberId: string, workout: Workout): Promise<void> {
    await dexieDb.workouts.update(workout.id, {
      date: workout.date,
      exercise: workout.exercise,
      weight: workout.weight,
      sets: workout.sets,
      reps: workout.reps,
      durationSeconds: workout.durationSeconds,
      rpe: workout.rpe,
      completed: workout.completed,
      note: workout.note,
    });
  }

  async deleteWorkout(memberId: string, workoutId: string): Promise<void> {
    await dexieDb.workouts.delete(workoutId);
  }

  // --- Posture Assessments ---

  async saveAssessment(memberId: string, assessment: PostureAssessment): Promise<void> {
    const existing = await dexieDb.assessments.where('memberId').equals(memberId).toArray();
    // 如果当天已有评估则更新，否则新增
    const sameDate = existing.find((a) => a.data.date === assessment.date);
    if (sameDate) {
      await dexieDb.assessments.update(sameDate.id, { data: assessment });
    } else {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
      await dexieDb.assessments.put({ id, memberId, data: assessment });
    }
  }

  async getAssessments(memberId: string): Promise<PostureAssessment[]> {
    const rows = await dexieDb.assessments.where('memberId').equals(memberId).toArray();
    return rows
      .map((r) => r.data)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async deleteAssessment(memberId: string, assessmentId: string): Promise<void> {
    await dexieDb.assessments.delete(assessmentId);
  }

  // --- AI Config ---

  async saveAIConfig(config: AIProviderConfig): Promise<void> {
    await dexieDb.configs.put({ key: 'ai_config', value: config });
  }

  async getAIConfig(): Promise<AIProviderConfig | null> {
    const row = await dexieDb.configs.get('ai_config');
    return row ? row.value : null;
  }

  // --- Studio Config ---

  async saveStudioConfig(config: {
    name: string; logo?: string; coachName?: string;
    accentColor?: string; phone?: string; email?: string;
  }): Promise<void> {
    await dexieDb.configs.put({ key: 'studio_config', value: config });
  }

  async getStudioConfig(): Promise<any> {
    const row = await dexieDb.configs.get('studio_config');
    return row ? row.value : null;
  }

  // --- Training Templates ---

  async saveTemplate(template: TrainingTemplate): Promise<void> {
    await dexieDb.templates.put({ id: template.id, data: template });
  }

  async getTemplates(): Promise<TrainingTemplate[]> {
    return (await dexieDb.templates.toArray()).map(r => r.data);
  }

  async deleteTemplate(id: string): Promise<void> {
    await dexieDb.templates.delete(id);
  }

  async initDefaultTemplates(): Promise<void> {
    const existing = await dexieDb.templates.count();
    if (existing > 0) return;
    const defaults: TrainingTemplate[] = [
      { id: 'tp-fat-loss', name: '减脂计划', nameEn: 'Fat Loss', description: '高代谢循环训练，侧重有氧+轻重量多次数', descriptionEn: 'High-metabolic circuit training, cardio + light weight high reps', category: 'fat-loss', workouts: [
        { exercise: 'Burpee', sets: 4, reps: 15, weight: 0 }, { exercise: 'Kettlebell Swing', sets: 4, reps: 20, weight: 16 },
        { exercise: 'Jump Squat', sets: 3, reps: 15, weight: 0 }, { exercise: 'Mountain Climber', sets: 3, reps: 30, weight: 0 },
        { exercise: 'Dumbbell Thruster', sets: 3, reps: 12, weight: 8 }, { exercise: 'Plank', sets: 3, reps: 45, weight: 0 },
      ]},
      { id: 'tp-muscle', name: '增肌计划', nameEn: 'Muscle Gain', description: '经典推拉腿分化，大重量低次数渐进超负荷', descriptionEn: 'Classic PPL split, heavy weight low reps progressive overload', category: 'muscle-gain', workouts: [
        { exercise: 'Bench Press', sets: 4, reps: 8, weight: 60 }, { exercise: 'Squat', sets: 4, reps: 8, weight: 80 },
        { exercise: 'Deadlift', sets: 3, reps: 6, weight: 100 }, { exercise: 'Overhead Press', sets: 3, reps: 10, weight: 40 },
        { exercise: 'Barbell Row', sets: 4, reps: 8, weight: 60 }, { exercise: 'Pull Up', sets: 3, reps: 8, weight: 0 },
      ]},
      { id: 'tp-posture', name: '体态矫正', nameEn: 'Posture Fix', description: '针对含胸/头前引/骨盆问题的矫正训练', descriptionEn: 'Corrective exercises for rounded shoulders / forward head / pelvic tilt', category: 'posture-fix', workouts: [
        { exercise: 'Wall Angel', sets: 3, reps: 10, weight: 0 }, { exercise: 'Band Face Pull', sets: 3, reps: 15, weight: 0 },
        { exercise: 'Chin Tuck', sets: 3, reps: 12, weight: 0 }, { exercise: 'Glute Bridge', sets: 3, reps: 15, weight: 0 },
        { exercise: 'Thoracic Extension', sets: 3, reps: 10, weight: 0 }, { exercise: 'Dead Bug', sets: 3, reps: 10, weight: 0 },
      ]},
      { id: 'tp-general', name: '综合体能', nameEn: 'General Fitness', description: '基础全身训练，适合新手建立运动习惯', descriptionEn: 'Full-body foundation, ideal for beginners', category: 'general', workouts: [
        { exercise: 'Goblet Squat', sets: 3, reps: 12, weight: 16 }, { exercise: 'Push Up', sets: 3, reps: 12, weight: 0 },
        { exercise: 'Dumbbell Row', sets: 3, reps: 12, weight: 12 }, { exercise: 'Lunge', sets: 3, reps: 10, weight: 0 },
        { exercise: 'Plank', sets: 3, reps: 30, weight: 0 }, { exercise: 'Farmers Walk', sets: 2, reps: 1, weight: 20 },
      ]},
    ];
    for (const t of defaults) await dexieDb.templates.put({ id: t.id, data: t });
  }

  // --- Member Goals ---

  async saveGoal(goal: MemberGoal): Promise<void> {
    await dexieDb.goals.put({ id: goal.id, memberId: goal.memberId, data: goal });
  }

  async getMemberGoals(memberId: string): Promise<MemberGoal[]> {
    return (await dexieDb.goals.where('memberId').equals(memberId).toArray()).map(r => r.data);
  }

  async deleteGoal(id: string): Promise<void> {
    await dexieDb.goals.delete(id);
  }
}

export const db = new LocalDatabase();
