-- R1 힌트 자동 공개가 타이머 조정을 따라가게 — 줄이면 공개도 당겨지고, 마감(round_ends_at)을 넘지 않게.
--
-- 배경: reveal_at을 [타이머 시작] 때 "시작+lead"로 한 번만 고정하면, 강사가 ±1분(adjust_round_timer)으로
--   라운드를 5분 이하로 줄였을 때 공개 시각(시작+5분)이 마감 뒤로 밀려 R1 힌트가 거래 중 안 뜬다.
-- 조치: reveal_at = least(round_start_at + lead, round_ends_at). start_round_timer·adjust_round_timer
--   양쪽에서 이 규칙으로 (재)계산한다. 이미 공개된 지급분(reveal_at<=now)은 건드리지 않는다.
--   더 일찍 띄우려면 관리자 [R1 힌트 지금 공개] 버튼(admin_reveal_r1_hints).

-- ── start_round_timer: R1 공개 시각 = least(시작+lead, 마감) ──────────────────
create or replace function start_round_timer(p_admin_secret text, p_minutes int default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round int;
  v_dur int;
  v_lead int;
  v_start timestamptz := now();
  v_ends timestamptz;
  v_reveal timestamptz;
  v_dist jsonb := jsonb_build_object('granted', 0);
begin
  if not private.verify_admin(p_admin_secret) then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select current_round, round_duration_seconds, r1_hint_lead_seconds
    into v_round, v_dur, v_lead
  from game_state where id = 1 for update;
  if v_round is null or v_round < 1 then
    return jsonb_build_object('ok', false, 'error', 'game_not_started');
  end if;

  if p_minutes is not null and p_minutes > 0 then
    v_dur := p_minutes * 60;
    update game_state set round_duration_seconds = v_dur where id = 1;
  end if;

  v_ends := v_start + make_interval(secs => coalesce(v_dur, 600));
  update game_state set round_start_at = v_start, round_ends_at = v_ends, is_locked = false where id = 1;

  perform emit_signal('timer_started', jsonb_build_object('round', v_round, 'ends_at', v_ends));

  if v_round = 1 then
    -- 시작+lead, 단 마감을 넘지 않게(짧은 라운드는 마감 때 공개). 관리자 버튼으로 더 일찍 가능.
    v_reveal := least(v_start + make_interval(secs => coalesce(v_lead, 300)), v_ends);
    v_dist := distribute_round_hints(1, v_reveal);
    perform emit_signal('hints_scheduled',
      jsonb_build_object('round', 1, 'reveal_at', v_reveal, 'granted', (v_dist ->> 'granted')::int));
  end if;

  return jsonb_build_object('ok', true, 'round', v_round, 'ends_at', v_ends,
    'seconds', coalesce(v_dur, 600), 'hints', v_dist);
end;
$$;
grant execute on function start_round_timer(text, int) to anon, authenticated;

-- ── adjust_round_timer: 마감 조정 시 R1 공개 시각도 함께 재계산 ───────────────
create or replace function adjust_round_timer(p_admin_secret text, p_delta_seconds integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round int;
  v_ends timestamptz;
  v_new timestamptz;
  v_start timestamptz;
  v_lead int;
  v_reveal timestamptz;
begin
  if not private.verify_admin(p_admin_secret) then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select current_round, round_ends_at, round_start_at, r1_hint_lead_seconds
    into v_round, v_ends, v_start, v_lead
  from game_state where id = 1 for update;
  if v_round is null or v_round < 1 then
    return jsonb_build_object('ok', false, 'error', 'game_not_started');
  end if;
  if v_ends is null then
    return jsonb_build_object('ok', false, 'error', 'timer_not_running');
  end if;

  v_new := greatest(now() + interval '10 seconds', v_ends + make_interval(secs => p_delta_seconds));
  update game_state set round_ends_at = v_new, is_locked = false where id = 1;

  -- R1: 공개 시각을 새 마감에 맞춰 재계산(시작+lead, 마감 못 넘게). 이미 공개된 지급분은 유지.
  if v_round = 1 and v_start is not null then
    v_reveal := least(v_start + make_interval(secs => coalesce(v_lead, 300)), v_new);
    update hint_grants set reveal_at = v_reveal
    where hint_id in (select id from hints where round = 1) and reveal_at > now();
  end if;

  perform emit_signal('timer_started', jsonb_build_object('round', v_round, 'ends_at', v_new));
  return jsonb_build_object('ok', true, 'round', v_round, 'ends_at', v_new);
end;
$$;
grant execute on function adjust_round_timer(text, integer) to anon, authenticated;
