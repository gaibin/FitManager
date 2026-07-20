import { getSupabaseClient } from './supabaseClient';
import type { Member, PostureAssessment, Workout } from '../types';

/**
 * 基于 Supabase 的云端数据库，实现与�?MockDatabase 相同的接�?
 * 约定的表结构�?README 或下方注释：
 *
 * �?members:
 *  - id: uuid (primary key)
 *  - name: text
 *  - avatar: text
 *  - join_date: text (YYYY-MM-DD)
 *  - photo_url: text (nullable)
 *
 * �?workouts:
 *  - id: uuid (primary key)
 *  - member_id: uuid (fk -> members.id)
 *  - date: text
 *  - exercise: text
 *  - weight: numeric
 *  - sets: integer
 *  - reps: integer
 */

class CloudDatabase {
  private async getStudioId(): Promise<string> {
    const supabase = getSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error('登录状态已失效，请重新登录');
    const { data, error } = await supabase
      .from('profiles')
      .select('studio_id')
      .eq('id', authData.user.id)
      .single();
    if (error || !data?.studio_id) throw new Error('无法确定当前工作区');
    return data.studio_id;
  }

  // --- Members ---

  async getMembers(): Promise<Member[]> {
    const supabase = getSupabaseClient();
    // 拉取所有会员与训练记录，在前端组装�?Member[]
    const { data: memberRows, error: memberError } = await supabase
      .from('members')
      .select('*')
      .order('join_date', { ascending: true });

    if (memberError) {
      console.error('[Supabase] getMembers members error', memberError);
      throw new Error(`会员数据暂时无法读取：${memberError.message}`);
    }

    const { data: workoutRows, error: workoutError } = await supabase
      .from('workouts')
      .select('*')
      .order('date', { ascending: true });

    if (workoutError) {
      console.error('[Supabase] getMembers workouts error', workoutError);
    }

    const { data: assessmentRows, error: assessmentError } = await supabase
      .from('posture_assessments')
      .select('member_id, data, assessment_date')
      .order('assessment_date', { ascending: false });

    if (assessmentError) {
      console.error('[Supabase] getMembers posture assessments error', assessmentError);
    }

    const workoutsByMember: Record<string, Workout[]> = {};
    (workoutRows || []).forEach((w: any) => {
      const memberId = w.member_id;
      if (!workoutsByMember[memberId]) workoutsByMember[memberId] = [];
      workoutsByMember[memberId].push({
        id: w.id,
        date: w.date,
        exercise: w.exercise,
        weight: Number(w.weight),
        sets: Number(w.sets),
        reps: Number(w.reps),
        durationSeconds: w.duration_seconds == null ? undefined : Number(w.duration_seconds),
        rpe: w.rpe == null ? undefined : Number(w.rpe),
        completed: w.completed == null ? undefined : Boolean(w.completed),
        note: w.note || undefined,
        bodyWeightKg: w.body_weight_kg == null ? undefined : Number(w.body_weight_kg),
      });
    });

    const assessmentsByMember: Record<string, PostureAssessment[]> = {};
    (assessmentRows || []).forEach((row: any) => {
      const memberId = row.member_id;
      if (!assessmentsByMember[memberId]) assessmentsByMember[memberId] = [];
      if (row.data) assessmentsByMember[memberId].push(row.data as PostureAssessment);
    });

    return (memberRows || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      joinDate: m.join_date,
      gender: m.gender || 'male',
      heightCm: m.height_cm || 170,
      weightKg: m.weight_kg == null ? undefined : Number(m.weight_kg),
      workouts: workoutsByMember[m.id] || [],
      assessments: assessmentsByMember[m.id] || [],
      photoUrl: m.photo_url || undefined,
    }));
  }

  async addMember(
    name: string,
    options?: {
      joinDate?: string;
      avatar?: string;
      photoUrl?: string;
      gender?: 'male' | 'female';
      heightCm?: number;
      weightKg?: number;
    }
  ): Promise<Member> {
    const supabase = getSupabaseClient();
    const studioId = await this.getStudioId();
    const joinDate = options?.joinDate || new Date().toISOString().split('T')[0];
    const avatar =
      options?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    const photoUrl = options?.photoUrl;
    const gender = options?.gender || 'male';
    const heightCm = options?.heightCm;
    const weightKg = options?.weightKg;

    const { data, error } = await supabase
      .from('members')
      .insert({
        studio_id: studioId,
        name,
        avatar,
        join_date: joinDate,
        photo_url: photoUrl,
        gender,
        height_cm: heightCm,
        weight_kg: weightKg,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[Supabase] addMember error', error);
      const detail = error?.message || '数据库没有返回新会员';
      throw new Error(`新增会员失败：${detail}`);
    }

    const member: Member = {
      id: data.id,
      name: data.name,
      avatar: data.avatar,
      joinDate: data.join_date,
      gender: data.gender || 'male',
      heightCm: data.height_cm || 170,
      weightKg: data.weight_kg == null ? undefined : Number(data.weight_kg),
      workouts: [],
      assessments: [],
      photoUrl: data.photo_url || undefined,
    };

    return member;
  }

  async deleteMember(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    // 先删 workouts，再�?member（也可以在数据库里配 FK ON DELETE CASCADE�?
    const { error: wError } = await supabase
      .from('workouts')
      .delete()
      .eq('member_id', id);

    if (wError) {
      console.error('[Supabase] deleteMember workouts error', wError);
    }

    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) {
      console.error('[Supabase] deleteMember member error', error);
      throw new Error('Failed to delete member');
    }
  }

  async updateMemberPhoto(memberId: string, photoUrl: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('members')
      .update({ photo_url: photoUrl })
      .eq('id', memberId);

    if (error) {
      console.error('[Supabase] updateMemberPhoto error', error);
      throw new Error('Failed to update member photo');
    }
  }

  async updateMember(
    memberId: string,
    updates: Partial<Pick<Member, 'name' | 'gender' | 'heightCm' | 'weightKg' | 'avatar'>>
  ): Promise<void> {
    const supabase = getSupabaseClient();
    const payload: Record<string, string | number | null> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.heightCm !== undefined) payload.height_cm = updates.heightCm;
    if (updates.weightKg !== undefined) payload.weight_kg = updates.weightKg;
    if (updates.avatar !== undefined) payload.avatar = updates.avatar;

    const { data, error } = await supabase.from('members').update(payload).eq('id', memberId).select('id').single();
    if (error || !data) {
      console.error('[Supabase] updateMember error', error);
      throw new Error(`保存会员资料失败：${error?.message || '未找到可修改的会员资料'}`);
    }
  }

  // --- Workouts ---

  async addWorkouts(
    memberId: string,
    workouts: Omit<Workout, 'id'>[]
  ): Promise<Workout[]> {
    const supabase = getSupabaseClient();
      const rows = workouts.map((w) => ({
      member_id: memberId,
      date: w.date,
      exercise: w.exercise,
      weight: w.weight,
      sets: w.sets,
        reps: w.reps,
        duration_seconds: w.durationSeconds,
        rpe: w.rpe,
        completed: w.completed,
        note: w.note,
        body_weight_kg: w.bodyWeightKg,
    }));

    const { data, error } = await supabase
      .from('workouts')
      .insert(rows)
      .select('*');

    if (error) {
      console.error('[Supabase] addWorkouts error', error);
      throw new Error('Failed to add workouts');
    }

    return (data || []).map((w: any) => ({
      id: w.id,
      date: w.date,
      exercise: w.exercise,
      weight: Number(w.weight),
      sets: Number(w.sets),
        reps: Number(w.reps),
        durationSeconds: w.duration_seconds == null ? undefined : Number(w.duration_seconds),
        rpe: w.rpe == null ? undefined : Number(w.rpe),
        completed: w.completed == null ? undefined : Boolean(w.completed),
        note: w.note || undefined,
        bodyWeightKg: w.body_weight_kg == null ? undefined : Number(w.body_weight_kg),
    }));
  }

  async updateWorkout(memberId: string, workout: Workout): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('workouts')
      .update({
        date: workout.date,
        exercise: workout.exercise,
        weight: workout.weight,
        sets: workout.sets,
        reps: workout.reps,
        duration_seconds: workout.durationSeconds,
        rpe: workout.rpe,
        completed: workout.completed,
        note: workout.note,
        body_weight_kg: workout.bodyWeightKg,
      })
      .eq('id', workout.id)
      .eq('member_id', memberId);

    if (error) {
      console.error('[Supabase] updateWorkout error', error);
      throw new Error('Failed to update workout');
    }
  }

  async deleteWorkout(memberId: string, workoutId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId)
      .eq('member_id', memberId);

    if (error) {
      console.error('[Supabase] deleteWorkout error', error);
      throw new Error('Failed to delete workout');
    }
  }

  // --- Posture Assessments ---
  async saveAssessment(memberId: string, assessment: PostureAssessment): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('posture_assessments').upsert({
      id: assessment.id,
      member_id: memberId,
      assessment_date: assessment.date,
      data: assessment,
    }, { onConflict: 'member_id,assessment_date' });
    if (error) {
      console.error('[Supabase] saveAssessment error', error);
      throw new Error('Failed to save posture assessment');
    }
  }

  async getAssessments(memberId: string): Promise<PostureAssessment[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('posture_assessments')
      .select('data')
      .eq('member_id', memberId)
      .order('assessment_date', { ascending: false });
    if (error) {
      console.error('[Supabase] getAssessments error', error);
      return [];
    }
    return (data || []).map((row: any) => row.data as PostureAssessment);
  }

  async deleteAssessment(memberId: string, assessmentId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('posture_assessments')
      .delete()
      .eq('member_id', memberId)
      .eq('id', assessmentId);
    if (error) {
      console.error('[Supabase] deleteAssessment error', error);
      throw new Error('Failed to delete posture assessment');
    }
  }

  async saveAIConfig(config: any): Promise<void> {
    await this.saveConfig('ai_config', config);
  }

  async saveStudioConfig(config: any): Promise<void> {
    await this.saveConfig('studio_config', config);
  }

  async getStudioConfig(): Promise<any> {
    return this.getConfig('studio_config');
  }

  async getAIConfig(): Promise<any | null> {
    return this.getConfig('ai_config');
  }

  private async saveConfig(key: string, value: any): Promise<void> {
    const supabase = getSupabaseClient();
    const studioId = await this.getStudioId();
    const { error } = await supabase.from('app_configs').upsert({
      studio_id: studioId,
      key,
      value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'studio_id,key' });
    if (error) {
      console.error(`[Supabase] saveConfig ${key} error`, error);
      throw new Error(`Failed to save ${key}`);
    }
  }

  private async getConfig(key: string): Promise<any | null> {
    const supabase = getSupabaseClient();
    const studioId = await this.getStudioId();
    const { data, error } = await supabase
      .from('app_configs')
      .select('value')
      .eq('studio_id', studioId)
      .eq('key', key)
      .maybeSingle();
    if (error) {
      console.error(`[Supabase] getConfig ${key} error`, error);
      return null;
    }
    return data?.value ?? null;
  }
}

export const db = new CloudDatabase();

