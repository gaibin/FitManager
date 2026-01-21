import { db } from './cloudDatabase';
import { SEED_MEMBERS } from './seedData';

/**
 * 将预置的 10 个会员 + 各 20 条训练记录写入 Supabase。
 * 如果数据库里已有会员，则直接跳过不再重复导入。
 */
export const seedSampleData = async () => {
  const existing = await db.getMembers();
  if (existing.length > 0) {
    return { skipped: true, reason: 'already_has_members' };
  }

  for (const seed of SEED_MEMBERS) {
    const member = await db.addMember(seed.name, {
      joinDate: seed.joinDate,
      avatar: seed.avatar,
    });
    if (seed.workouts.length > 0) {
      await db.addWorkouts(member.id, seed.workouts);
    }
  }

  return { inserted: SEED_MEMBERS.length };
};

