-- R1 힌트 공개: "마감 5분 전" → "타이머 시작 후 lead초" + 관리자 즉시 공개 버튼.
--
-- 배경: R1 힌트 공개 시각을 round_ends_at - lead(마감 기준)로 잡으면, 강사가 R1을 빨리 넘기거나
--   라운드를 짧게 운영하면 공개 시각이 도래하기 전에 지나가 R1 힌트가 아예 안 보인다(테스트 때 혼란).
-- 조치 2가지:
--   1) 자동 공개 기준을 round_start_at + lead(시작 기준)로 바꿔 라운드 길이와 무관하게 안정적으로.
--      (10분 라운드·lead 300이면 종전과 같은 순간 = 시작 5분 후.)
--   2) 관리자 [R1 힌트 지금 공개] 버튼용 admin_reveal_r1_hints() — 원하는 순간 즉시 공개.

-- ── start_round_timer: R1 공개 시각 = 시작 + lead ───────────────────────────
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

  -- R1: 타이머 시작 후 lead초에 공개(시작 기준). 미리 배분해 두면 늦게 접속해도 시각이 지나면 보인다.
  if v_round = 1 then
    v_reveal := v_start + make_interval(secs => coalesce(v_lead, 300));
    v_dist := distribute_round_hints(1, v_reveal);
    perform emit_signal('hints_scheduled',
      jsonb_build_object('round', 1, 'reveal_at', v_reveal, 'granted', (v_dist ->> 'granted')::int));
  end if;

  return jsonb_build_object('ok', true, 'round', v_round, 'ends_at', v_ends,
    'seconds', coalesce(v_dur, 600), 'hints', v_dist);
end;
$$;
grant execute on function start_round_timer(text, int) to anon, authenticated;

-- ── 관리자: R1 힌트 즉시 공개 (버튼) ─────────────────────────────────────────
--   아직 배분 안 됐으면 지금 배분(즉시 공개), 이미 예약된 것(미래 reveal_at)은 지금으로 당긴다.
create or replace function admin_reveal_r1_hints(p_admin_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_granted int;
  v_revealed int;
begin
  if not private.verify_admin(p_admin_secret) then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select (distribute_round_hints(1, now()) ->> 'granted')::int into v_granted;

  update hint_grants set reveal_at = now()
  where hint_id in (select id from hints where round = 1) and reveal_at > now();
  get diagnostics v_revealed = row_count;

  perform emit_signal('hints_changed', jsonb_build_object('round', 1, 'manual', true));
  return jsonb_build_object('ok', true, 'granted', v_granted, 'revealed', v_revealed);
end;
$$;
grant execute on function admin_reveal_r1_hints(text) to anon, authenticated;
