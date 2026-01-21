import { getSupabaseClient } from './supabaseClient';
import type { Member, Workout } from '../types';

/**
 * 基于 Supabase 的云端数据库，实现与原 MockDatabase 相同的接口
 * 约定的表结构见 README 或下方注释：
 *
 * 表 members:
 *  - id: uuid (primary key)
 *  - name: text
 *  - avatar: text
 *  - join_date: text (YYYY-MM-DD)
 *  - photo_url: text (nullable)
 *
 * 表 workouts:
 *  - id: uuid (primary key)
 *  - member_id: uuid (fk -> members.id)
 *  - date: text
 *  - exercise: text
 *  - weight: numeric
 *  - sets: integer
 *  - reps: integer
 */

class CloudDatabase {
  // --- Members ---

  async getMembers(): Promise<Member[]> {
    const supabase = getSupabaseClient();
    // 拉取所有会员与训练记录，在前端组装成 Member[]
    const { data: memberRows, error: memberError } = await supabase
      .from('members')
      .select('*')
      .order('join_date', { ascending: true });

    if (memberError) {
      console.error('[Supabase] getMembers members error', memberError);
      return [];
    }

    const { data: workoutRows, error: workoutError } = await supabase
      .from('workouts')
      .select('*')
      .order('date', { ascending: true });

    if (workoutError) {
      console.error('[Supabase] getMembers workouts error', workoutError);
      return [];
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
      });
    });

    return (memberRows || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      joinDate: m.join_date,
      workouts: workoutsByMember[m.id] || [],
      photoUrl: m.photo_url || undefined,
    }));
  }

  async addMember(
    name: string,
    options?: { joinDate?: string; avatar?: string; photoUrl?: string }
  ): Promise<Member> {
    const supabase = getSupabaseClient();
    const joinDate = options?.joinDate || new Date().toISOString().split('T')[0];
    const avatar =
      options?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    const photoUrl = options?.photoUrl;

    const { data, error } = await supabase
      .from('members')
      .insert({
        name,
        avatar,
        join_date: joinDate,
        photo_url: photoUrl,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[Supabase] addMember error', error);
      throw new Error('Failed to add member');
    }

    const member: Member = {
      id: data.id,
      name: data.name,
      avatar: data.avatar,
      joinDate: data.join_date,
      workouts: [],
      photoUrl: data.photo_url || undefined,
    };

    return member;
  }

  async deleteMember(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    // 先删 workouts，再删 member（也可以在数据库里配 FK ON DELETE CASCADE）
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
}

export const db = new CloudDatabase();

