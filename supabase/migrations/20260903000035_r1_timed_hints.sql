-- R1 힌트 시간차 공개 — "R1도 지급하되 거래 마감 N분 전에 공개".
--
-- 배경: 종전 규칙은 R1 무지급이었다(R1은 전 조가 같은 가격에 사 평가금액이 시드로 동률 →
--   순위 차등이 무의미). 이번 실제-사건 데이터셋(v5)은 R1에도 힌트를 넣고, 대신 거래가
--   열린 뒤 마감 직전(기본 5분 전)에 공개해 "정보가 늦게 도착하는" 긴장감을 준다.
--
-- 설계(서버가 유일 심판, pg_cron 없음):
--   * hint_grants에 reveal_at(공개 예정 시각) 추가. null = 즉시 공개(R2~R5·수동 지급, 종전과 동일).
--   * R1 힌트는 [타이머 시작] 시점에 미리 배분하되 reveal_at = round_ends_at - lead 로 숨겨 둔다.
--   * get_my_hints가 reveal_at <= now() 인 것만 돌려준다 → 시각이 지나면 자동으로 보이기 시작.
--     (클라 카운트다운이 그 시점에 refetch하고, 늦게 접속한 학생도 서버 게이트로 바로 보인다.)
--   * lead = game_state.r1_hint_lead_seconds (기본 300초=5분). 타이머 상수처럼 설정값으로 둔다.
--
-- 정합: reveal_at은 힌트 '표시 시점'만 바꾼다. 배분 규칙(등급순×순위 라운드로빈, distribute.js)과
--   힌트↔가격 방향 불변식은 그대로다. R1은 전 조 동률이라 라운드로빈이 생성순(id) 순으로 갈린다.

-- ── 컬럼 ─────────────────────────────────────────────────────────────────────
alter table hint_grants add column if not exists reveal_at timestamptz;
comment on column hint_grants.reveal_at is
  '이 힌트를 조에게 보여줄 예정 시각. null이면 즉시 공개. R1 시간차 공개에 쓴다(마감 lead초 전).';

alter table game_state add column if not exists r1_hint_lead_seconds int not null default 300;
comment on column game_state.r1_hint_lead_seconds is
  'R1 힌트를 거래 마감 몇 초 전에 공개할지. 기본 300=5분. start_round_timer가 R1일 때 쓴다.';

-- ── get_my_hints — 공개 시각이 지난 힌트만 ────────────────────────────────────
create or replace function get_my_hints(p_team_code text)
returns table (
  id bigint,
  round int,
  grade text,
  headline text,
  impact text,
  related_stock_ids text[],
  granted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select h.id, h.round, h.grade, h.headline, h.impact, h.related_stock_ids, hg.granted_at
  from hints h
  join hint_grants hg on hg.hint_id = h.id
  join teams t on t.id = hg.team_id
  where t.code = p_team_code
    and (hg.reveal_at is null or hg.reveal_at <= now())  -- 예약 힌트는 시각 전엔 숨김
  order by hg.granted_at desc, h.id desc;
$$;
grant execute on function get_my_hints(text) to anon, authenticated;

-- ── distribute_round_hints — R1 허용 + reveal_at 인자 ─────────────────────────
--   옛 (int) 시그니처는 drop(오버로드로 무방비 버전이 남지 않게). 새 함수는 2번째 인자에
--   default null을 둬서 advance_round의 기존 호출 distribute_round_hints(v_cur+1) 이 그대로
--   이 함수로 해석된다(reveal_at=null → 즉시 공개, R2~R5 종전 동작 유지).
drop function if exists distribute_round_hints(int);

create or replace function distribute_round_hints(p_hint_round int, p_reveal_at timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
  v_granted int := 0;
begin
  select count(*) into v_n from teams;
  if v_n = 0 then
    return jsonb_build_object('granted', 0, 'warnings', '[]'::jsonb);
  end if;

  with ranked as (
    select t.id,
           (row_number() over (order by team_equity(t.id) asc, t.created_at asc, t.id asc) - 1) as rn
    from teams t
  ),
  pool as (
    select h.id as hint_id,
           (row_number() over (
              order by case h.grade
                when 'S' then 0 when 'A' then 1 when 'B' then 2 when 'C' then 3 else 4 end asc,
              h.id asc) - 1) as hn
    from hints h
    where h.round = p_hint_round
  ),
  assign as (
    select p.hint_id, r.id as team_id
    from pool p
    join ranked r on r.rn = (p.hn % v_n)
  ),
  ins as (
    insert into hint_grants (hint_id, team_id, reveal_at)
    select hint_id, team_id, p_reveal_at from assign
    on conflict (hint_id, team_id) do nothing
    returning 1
  )
  select count(*) into v_granted from ins;

  return jsonb_build_object('granted', v_granted, 'warnings', '[]'::jsonb);
end;
$$;
revoke all on function distribute_round_hints(int, timestamptz) from public, anon, authenticated;

-- ── start_round_timer — R1이면 마감 lead초 전 공개로 R1 힌트 예약 배분 ──────────
--   16의 (text, int default null) 시그니처를 그대로 유지하고 R1 배분만 얹는다.
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

  -- 분을 지정하면 기본 길이도 그 값으로 갱신(다음 라운드에도 유지)
  if p_minutes is not null and p_minutes > 0 then
    v_dur := p_minutes * 60;
    update game_state set round_duration_seconds = v_dur where id = 1;
  end if;

  v_ends := v_start + make_interval(secs => coalesce(v_dur, 600));
  -- round_start_at = 타이머를 (다시) 연 시각. 장중 가격경로 스텝이 여기서 0부터 진행된다(라이브 유지).
  update game_state set round_start_at = v_start, round_ends_at = v_ends, is_locked = false where id = 1;

  perform emit_signal('timer_started', jsonb_build_object('round', v_round, 'ends_at', v_ends));

  -- R1: 힌트를 지금 배분하되 마감 lead초 전에 공개(reveal_at). 미리 배분해 두면 늦게 접속한
  --      학생도 시각이 지나는 순간 서버 게이트(get_my_hints)로 바로 보게 된다.
  if v_round = 1 then
    v_reveal := v_ends - make_interval(secs => coalesce(v_lead, 300));
    v_dist := distribute_round_hints(1, v_reveal);
    perform emit_signal('hints_scheduled',
      jsonb_build_object('round', 1, 'reveal_at', v_reveal, 'granted', (v_dist ->> 'granted')::int));
  end if;

  return jsonb_build_object('ok', true, 'round', v_round, 'ends_at', v_ends,
    'seconds', coalesce(v_dur, 600), 'hints', v_dist);
end;
$$;
grant execute on function start_round_timer(text, int) to anon, authenticated;
