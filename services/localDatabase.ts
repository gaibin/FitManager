/**
 * 本地 IndexedDB 数据库封装 (Dexie.js)
 * 实现与 cloudDatabase.ts 相同的接口，并扩展体态评估功能
 */

import Dexie, { type Table } from 'dexie';
import type { Member, Workout, PostureAssessment, AIProviderConfig } from '../types';

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

class NeonFitDB extends Dexie {
  members!: Table<MemberRow, string>;
  workouts!: Table<WorkoutRow, string>;
  assessments!: Table<AssessmentRow, string>;
  configs!: Table<ConfigRow, string>;

  constructor() {
    super('NeonFitStudioDB');
    this.version(1).stores({
      members: 'id',
      workouts: 'id, memberId, date',
      assessments: 'id, memberId',
      configs: 'key',
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

  async saveStudioConfig(config: { name: string; logo?: string }): Promise<void> {
    await dexieDb.configs.put({ key: 'studio_config', value: config });
  }

  async getStudioConfig(): Promise<{ name: string; logo?: string } | null> {
    const row = await dexieDb.configs.get('studio_config');
    return row ? row.value : null;
  }
}

export const db = new LocalDatabase();
