import crypto from 'node:crypto';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const password = process.env.YGFIT_ADMIN_PASSWORD;
if (!password) throw new Error('Set YGFIT_ADMIN_PASSWORD before running this script.');
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration in .env.local.');
}

const sql = fs.readFileSync('services/supabase_demo_training_history.sql', 'utf8');
const profileMatch = sql.match(/demo_profiles jsonb := '(\[[\s\S]*?\])'::jsonb;/);
if (!profileMatch) throw new Error('Could not read demo profiles from the SQL seed.');
const profiles = JSON.parse(profileMatch[1]);

const normalizedOwner = 'ygfitness';
const ownerHash = crypto.createHash('sha256').update(normalizedOwner).digest('hex').slice(0, 48);
const ownerEmail = `u-${ownerHash}@accounts.ygfit.local`;
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { error: signInError } = await supabase.auth.signInWithPassword({
  email: ownerEmail,
  password,
});
if (signInError) throw signInError;

const { data: members, error: memberError } = await supabase
  .from('members')
  .select('id,name')
  .in('name', profiles.map((profile) => profile.name));
if (memberError) throw memberError;

const memberByName = new Map((members ?? []).map((member) => [member.name, member]));
const missing = profiles.filter((profile) => !memberByName.has(profile.name)).map((profile) => profile.name);
if (missing.length > 0) throw new Error(`Missing demo members: ${missing.join(', ')}`);

const deterministicUuid = (input) => {
  const hash = crypto.createHash('md5').update(input).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
};

const dateString = (date) => date.toISOString().slice(0, 10);
const rows = [];
const perMember = {};

for (const profile of profiles) {
  const member = memberByName.get(profile.name);
  const { error: deleteError } = await supabase.from('workouts').delete().eq('member_id', member.id);
  if (deleteError) throw deleteError;

  let memberRowCount = 0;
  for (let weekNo = 0; weekNo <= 12; weekNo += 1) {
    for (let dayNo = 0; dayNo < profile.frequency; dayNo += 1) {
      if ((weekNo + dayNo + member.name.length) % 17 === 0) continue;

      const sessionDate = new Date(Date.UTC(2026, 3, 20 + weekNo * 7 + [1, 3, 5][dayNo]));
      if (dateString(sessionDate) > '2026-07-16') continue;

      const session = profile.sessions[dayNo % profile.sessions.length];
      session.forEach((exercise, exerciseNo) => {
        const deload = weekNo === 4 || weekNo === 9;
        const jitter = [-0.5, 0, 0.5, 0][(weekNo + exerciseNo + dayNo) % 4];
        const rawLoad = exercise.base === 0
          ? 0
          : Math.max(0, exercise.base + exercise.step * weekNo + jitter) * (deload ? 0.9 : 1);
        const weight = Math.round(rawLoad * 2) / 2;
        const completed = !(
          (weekNo === 3 || weekNo === 10)
          && dayNo === 1
          && exerciseNo === session.length - 1
        );
        const date = dateString(sessionDate);

        rows.push({
          id: deterministicUuid(`${member.id}${date}${exercise.name}`),
          member_id: member.id,
          date,
          exercise: exercise.name,
          weight,
          sets: exercise.sets + (weekNo >= 7 && exerciseNo === 0 ? 1 : 0),
          reps: exercise.reps + ([2, 6, 11].includes(weekNo) && exercise.base > 0 ? 1 : 0),
          duration_seconds: exercise.base === 0 ? 45 + weekNo * 2 : 55 + exerciseNo * 10,
          rpe: Math.round((
            6 + ((weekNo + dayNo + exerciseNo) % 5) * 0.4 - (deload ? 0.8 : 0)
          ) * 10) / 10,
          completed,
          note: !completed
            ? '演示记录：时间不足，最后一项未完成'
            : deload
              ? '演示记录：调整周，主动降低负荷'
              : weekNo >= 10 && exerciseNo === 0
                ? '演示记录：动作稳定，继续小幅进阶'
                : '演示记录：节奏稳定，保留 2–3 次余力',
        });
        memberRowCount += 1;
      });
    }
  }
  perMember[member.name] = memberRowCount;
}

for (let start = 0; start < rows.length; start += 150) {
  const { error } = await supabase.from('workouts').upsert(rows.slice(start, start + 150), { onConflict: 'id' });
  if (error) throw error;
}

console.log(JSON.stringify({
  insertedRows: rows.length,
  sessionCounts: Object.fromEntries(profiles.map((profile) => {
    const member = memberByName.get(profile.name);
    const dates = new Set(rows.filter((row) => row.member_id === member.id).map((row) => row.date));
    return [profile.name, dates.size];
  })),
  exerciseRows: perMember,
}, null, 2));
