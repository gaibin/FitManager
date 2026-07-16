-- Rich, repeatable demo workout history for the six YGFIT demo members.
-- Replaces workouts only for members whose names start with “演示会员·”.

do $$
declare
  profile jsonb;
  member_row record;
  week_no integer;
  day_no integer;
  exercise_no integer;
  session_date date;
  session_plan jsonb;
  exercise_plan jsonb;
  exercise_name text;
  base_load numeric;
  weekly_step numeric;
  load_value numeric;
  set_count integer;
  rep_count integer;
  effort numeric;
  is_completed boolean;
  demo_profiles jsonb := '[
    {
      "name":"演示会员·林悦","frequency":3,
      "sessions":[
        [{"name":"高脚杯深蹲","base":12,"step":0.7,"sets":3,"reps":12},{"name":"罗马尼亚硬拉","base":22,"step":1.0,"sets":3,"reps":10},{"name":"坐姿划船","base":20,"step":0.8,"sets":3,"reps":12},{"name":"死虫","base":0,"step":0,"sets":3,"reps":10}],
        [{"name":"保加利亚分腿蹲","base":8,"step":0.5,"sets":3,"reps":10},{"name":"高位下拉","base":24,"step":0.8,"sets":3,"reps":10},{"name":"哑铃卧推","base":10,"step":0.5,"sets":3,"reps":10},{"name":"侧桥","base":0,"step":0,"sets":3,"reps":30}],
        [{"name":"壶铃硬拉","base":24,"step":1.0,"sets":4,"reps":8},{"name":"台阶上步","base":8,"step":0.4,"sets":3,"reps":10},{"name":"面拉","base":14,"step":0.6,"sets":3,"reps":15},{"name":"农夫行走","base":12,"step":0.5,"sets":4,"reps":30}]
      ]
    },
    {
      "name":"演示会员·陈浩","frequency":3,
      "sessions":[
        [{"name":"杠铃卧推","base":45,"step":1.4,"sets":4,"reps":8},{"name":"坐姿划船","base":48,"step":1.2,"sets":4,"reps":10},{"name":"哑铃肩推","base":14,"step":0.7,"sets":3,"reps":10},{"name":"绳索下压","base":20,"step":0.6,"sets":3,"reps":12}],
        [{"name":"杠铃深蹲","base":62.5,"step":1.8,"sets":4,"reps":6},{"name":"罗马尼亚硬拉","base":55,"step":1.6,"sets":4,"reps":8},{"name":"腿举","base":100,"step":2.5,"sets":3,"reps":10},{"name":"平板支撑","base":0,"step":0,"sets":3,"reps":45}],
        [{"name":"高位下拉","base":50,"step":1.1,"sets":4,"reps":8},{"name":"上斜哑铃卧推","base":16,"step":0.8,"sets":3,"reps":10},{"name":"保加利亚分腿蹲","base":16,"step":0.7,"sets":3,"reps":10},{"name":"面拉","base":22,"step":0.6,"sets":3,"reps":15}]
      ]
    },
    {
      "name":"演示会员·周雨桐","frequency":2,
      "sessions":[
        [{"name":"箱式深蹲","base":16,"step":0.8,"sets":3,"reps":10},{"name":"哑铃罗马尼亚硬拉","base":18,"step":0.8,"sets":3,"reps":10},{"name":"高位下拉","base":28,"step":0.8,"sets":3,"reps":12},{"name":"死虫","base":0,"step":0,"sets":3,"reps":10}],
        [{"name":"反向箭步蹲","base":8,"step":0.5,"sets":3,"reps":10},{"name":"坐姿划船","base":26,"step":0.8,"sets":3,"reps":12},{"name":"哑铃卧推","base":10,"step":0.5,"sets":3,"reps":10},{"name":"Pallof抗旋转","base":8,"step":0.3,"sets":3,"reps":12}],
        [{"name":"臀推","base":36,"step":1.4,"sets":4,"reps":10},{"name":"台阶上步","base":8,"step":0.4,"sets":3,"reps":10},{"name":"面拉","base":14,"step":0.5,"sets":3,"reps":15},{"name":"侧桥","base":0,"step":0,"sets":3,"reps":30}]
      ]
    },
    {
      "name":"演示会员·王嘉诚","frequency":3,
      "sessions":[
        [{"name":"陷阱杠硬拉","base":70,"step":2.5,"sets":4,"reps":6},{"name":"杠铃划船","base":45,"step":1.5,"sets":4,"reps":8},{"name":"农夫行走","base":24,"step":1.0,"sets":4,"reps":30},{"name":"Pallof抗旋转","base":14,"step":0.5,"sets":3,"reps":12}],
        [{"name":"前蹲","base":52.5,"step":1.8,"sets":4,"reps":6},{"name":"杠铃卧推","base":60,"step":1.6,"sets":4,"reps":6},{"name":"引体向上辅助","base":20,"step":-0.7,"sets":4,"reps":8},{"name":"面拉","base":25,"step":0.7,"sets":3,"reps":15}],
        [{"name":"罗马尼亚硬拉","base":65,"step":2.0,"sets":4,"reps":8},{"name":"哑铃肩推","base":18,"step":0.8,"sets":3,"reps":8},{"name":"保加利亚分腿蹲","base":20,"step":0.8,"sets":3,"reps":8},{"name":"绳索划船","base":50,"step":1.2,"sets":4,"reps":10}]
      ]
    },
    {
      "name":"演示会员·赵敏","frequency":2,
      "sessions":[
        [{"name":"箱式深蹲","base":10,"step":0.6,"sets":3,"reps":12},{"name":"壶铃硬拉","base":16,"step":0.8,"sets":3,"reps":10},{"name":"绳索划船","base":20,"step":0.7,"sets":3,"reps":12},{"name":"鸟狗","base":0,"step":0,"sets":3,"reps":10}],
        [{"name":"台阶上步","base":6,"step":0.4,"sets":3,"reps":10},{"name":"高位下拉","base":22,"step":0.7,"sets":3,"reps":12},{"name":"器械推胸","base":15,"step":0.6,"sets":3,"reps":12},{"name":"侧向弹力带走","base":0,"step":0,"sets":3,"reps":12}],
        [{"name":"臀推","base":25,"step":1.0,"sets":3,"reps":12},{"name":"分腿蹲","base":6,"step":0.4,"sets":3,"reps":10},{"name":"面拉","base":12,"step":0.5,"sets":3,"reps":15},{"name":"呼吸与对线扫描","base":0,"step":0,"sets":2,"reps":5}]
      ]
    },
    {
      "name":"演示会员·刘洋","frequency":3,
      "sessions":[
        [{"name":"杠铃深蹲","base":50,"step":1.7,"sets":4,"reps":8},{"name":"杠铃卧推","base":42.5,"step":1.2,"sets":4,"reps":8},{"name":"坐姿划船","base":42,"step":1.1,"sets":4,"reps":10},{"name":"平板支撑","base":0,"step":0,"sets":3,"reps":45}],
        [{"name":"传统硬拉","base":70,"step":2.2,"sets":4,"reps":5},{"name":"高位下拉","base":45,"step":1.0,"sets":4,"reps":10},{"name":"哑铃肩推","base":14,"step":0.7,"sets":3,"reps":10},{"name":"反向箭步蹲","base":14,"step":0.6,"sets":3,"reps":10}],
        [{"name":"前蹲","base":40,"step":1.3,"sets":4,"reps":8},{"name":"上斜哑铃卧推","base":14,"step":0.7,"sets":3,"reps":10},{"name":"单臂哑铃划船","base":18,"step":0.8,"sets":3,"reps":10},{"name":"农夫行走","base":20,"step":0.8,"sets":4,"reps":30}]
      ]
    }
  ]'::jsonb;
begin
  for profile in select value from jsonb_array_elements(demo_profiles)
  loop
    select m.id, m.name into member_row
    from public.members m
    where m.name = profile->>'name'
    limit 1;

    if member_row.id is null then
      continue;
    end if;

    delete from public.workouts where member_id = member_row.id;

    for week_no in 0..12 loop
      for day_no in 0..2 loop
        if day_no >= (profile->>'frequency')::integer then
          continue;
        end if;
        if (week_no + day_no + length(member_row.name)) % 17 = 0 then
          continue;
        end if;

        session_date := date '2026-04-20' + week_no * 7 + (array[1, 3, 5])[day_no + 1];
        if session_date > date '2026-07-16' then
          continue;
        end if;

        session_plan := profile->'sessions'->(day_no % 3);
        exercise_no := 0;
        for exercise_plan in select value from jsonb_array_elements(session_plan)
        loop
          exercise_name := exercise_plan->>'name';
          base_load := (exercise_plan->>'base')::numeric;
          weekly_step := (exercise_plan->>'step')::numeric;
          load_value := case
            when base_load = 0 then 0
            else greatest(
              0,
              base_load + weekly_step * week_no
              + case ((week_no + exercise_no + day_no) % 4)
                  when 0 then -0.5 when 1 then 0 when 2 then 0.5 else 0 end
            ) * case when week_no in (4, 9) then 0.9 else 1 end
          end;
          load_value := round(load_value * 2) / 2;
          set_count := (exercise_plan->>'sets')::integer
            + case when week_no >= 7 and exercise_no = 0 then 1 else 0 end;
          rep_count := (exercise_plan->>'reps')::integer
            + case when week_no in (2, 6, 11) and base_load > 0 then 1 else 0 end;
          effort := round((6.0 + ((week_no + day_no + exercise_no) % 5) * 0.4
            - case when week_no in (4, 9) then 0.8 else 0 end)::numeric, 1);
          is_completed := not (
            week_no in (3, 10)
            and day_no = 1
            and exercise_no = jsonb_array_length(session_plan) - 1
          );

          insert into public.workouts (
            id, member_id, date, exercise, weight, sets, reps,
            duration_seconds, rpe, completed, note
          ) values (
            md5(member_row.id::text || session_date::text || exercise_name)::uuid,
            member_row.id, session_date, exercise_name, load_value, set_count, rep_count,
            case when base_load = 0 then 45 + week_no * 2 else 55 + exercise_no * 10 end,
            effort, is_completed,
            case
              when not is_completed then '演示记录：时间不足，最后一项未完成'
              when week_no in (4, 9) then '演示记录：调整周，主动降低负荷'
              when week_no >= 10 and exercise_no = 0 then '演示记录：动作稳定，继续小幅进阶'
              else '演示记录：节奏稳定，保留 2–3 次余力'
            end
          )
          on conflict (id) do update set
            member_id = excluded.member_id, date = excluded.date,
            exercise = excluded.exercise, weight = excluded.weight,
            sets = excluded.sets, reps = excluded.reps,
            duration_seconds = excluded.duration_seconds, rpe = excluded.rpe,
            completed = excluded.completed, note = excluded.note;

          exercise_no := exercise_no + 1;
        end loop;
      end loop;
    end loop;
  end loop;
end $$;
