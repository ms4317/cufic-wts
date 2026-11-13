-- 월봉(월별 OHLC) 지원 — 학생 차트를 생성 봉 → 실데이터 월봉으로.
--
-- 데이터셋의 monthly_prices(엑셀 '월별가격(선택)' 시트에서 파싱)를 저장·게이팅한다.
--   · 공개 게이팅: get_monthly()가 year <= public_year() 만 반환 → 미래 봉 절대 노출 안 됨
--     (연도 넘기기로 public_year가 오르면 그 해 12봉이 추가로 보인다). 재무·시황과 같은 원리.
--   · 월별 없는 데이터셋은 monthly_prices 비어 있음 → 차트가 연도 라인으로 폴백(클라).

create table if not exists monthly_prices (
  stock_id text not null references stocks(id) on delete cascade,
  year  int not null,
  month int not null,
  open  bigint,
  high  bigint,
  low   bigint,
  close bigint,
  primary key (stock_id, year, month)
);
alter table monthly_prices enable row level security;
-- select 정책 없음 = REST로 통째로 못 긁는다. get_monthly(공개 연도 게이팅)로만 읽는다.

-- 공개 연도까지의 월봉만 (미래 봉 차단). 재무·시황 게이팅과 동일.
create or replace function get_monthly()
returns setof monthly_prices
language sql stable security definer set search_path = public
as $$
  select m.* from monthly_prices m where m.year <= public_year() order by m.stock_id, m.year, m.month;
$$;
grant execute on function get_monthly() to anon, authenticated;

-- ── restore_content: monthly_prices 적재 추가 (라이브 34 버전 + 월별) ──────────
create or replace function restore_content(v_data jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare v_game jsonb := v_data -> 'game';
begin
  delete from round_snapshots where true;
  delete from trades where true;
  delete from positions where true;
  delete from hint_grants where true;
  delete from broadcasts where true;
  delete from monthly_prices where true;
  delete from hints where true;
  delete from financials where true;
  delete from macro where true;
  delete from stocks where true;

  insert into stocks (id, name, description, sector, listed_from_round, prices, display_order)
  select s->>'id', s->>'name', coalesce(s->>'description',''), coalesce(s->>'sector',''),
         coalesce((s->>'listed_from_round')::int,1), s->'prices', coalesce((s->>'display_order')::int,0)
  from jsonb_array_elements(v_data->'stocks') s;

  insert into financials (stock_id, year, current_assets, noncurrent_assets,
      current_liabilities, noncurrent_liabilities, revenue, operating_expense, nonoperating_expense)
  select f->>'stock_id',(f->>'year')::int,
         (f->>'current_assets')::bigint,(f->>'noncurrent_assets')::bigint,
         (f->>'current_liabilities')::bigint,(f->>'noncurrent_liabilities')::bigint,
         (f->>'revenue')::bigint,(f->>'operating_expense')::bigint,(f->>'nonoperating_expense')::bigint
  from jsonb_array_elements(v_data->'financials') f;

  insert into macro (year, summary, kospi, sp500, nikkei, europe, rate, cpi, oil, gold)
  select (m->>'year')::int, coalesce(m->>'summary',''),
         (m->>'kospi')::int, (m->>'sp500')::int, (m->>'nikkei')::int, (m->>'europe')::int,
         (m->>'rate')::numeric, (m->>'cpi')::numeric, (m->>'oil')::int, (m->>'gold')::int
  from jsonb_array_elements(v_data->'macro') m;

  insert into hints (round, grade, headline, impact, related_stock_ids)
  select (h->>'round')::int,h->>'grade',h->>'headline',h->>'impact',
         coalesce((select array_agg(v) from jsonb_array_elements_text(h->'related_stock_ids') v),'{}')
  from jsonb_array_elements(v_data->'hints') h;

  -- 월별 OHLC (없으면 빈 배열 → 스킵). stocks 적재 후(FK).
  insert into monthly_prices (stock_id, year, month, open, high, low, close)
  select mp->>'stock_id',(mp->>'year')::int,(mp->>'month')::int,
         (mp->>'open')::bigint,(mp->>'high')::bigint,(mp->>'low')::bigint,(mp->>'close')::bigint
  from jsonb_array_elements(coalesce(v_data->'monthly_prices','[]'::jsonb)) mp;

  update game_state set
    total_rounds=(v_game->>'total_rounds')::int, round_year_map=v_game->'round_year_map',
    default_seed=(v_game->>'default_seed')::bigint, final_year=(v_game->>'final_year')::int,
    round_duration_seconds=coalesce((v_game->>'round_duration_seconds')::int,600),
    current_round=0, is_ended=false, is_locked=false, round_ends_at=null
  where id=1;
  update teams set cash=seed where true;
end;
$$;
revoke all on function restore_content(jsonb) from public, anon, authenticated;

-- ── snapshot_content: monthly_prices 포함 (라이브 34 버전 + 월별) ──────────────
create or replace function snapshot_content()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'game', (select jsonb_build_object('total_rounds', total_rounds, 'round_year_map', round_year_map,
        'default_seed', default_seed, 'final_year', final_year, 'round_duration_seconds', round_duration_seconds)
      from game_state where id = 1),
    'stocks', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'description', description,
        'sector', sector, 'listed_from_round', listed_from_round, 'prices', prices, 'display_order', display_order)
      order by display_order), '[]'::jsonb) from stocks),
    'financials', (select coalesce(jsonb_agg(jsonb_build_object('stock_id', stock_id, 'year', year,
        'current_assets', current_assets, 'noncurrent_assets', noncurrent_assets,
        'current_liabilities', current_liabilities, 'noncurrent_liabilities', noncurrent_liabilities,
        'revenue', revenue, 'operating_expense', operating_expense, 'nonoperating_expense', nonoperating_expense)), '[]'::jsonb) from financials),
    'macro', (select coalesce(jsonb_agg(jsonb_build_object('year', year, 'summary', summary,
        'kospi', kospi, 'sp500', sp500, 'nikkei', nikkei, 'europe', europe,
        'rate', rate, 'cpi', cpi, 'oil', oil, 'gold', gold) order by year), '[]'::jsonb) from macro),
    'hints', (select coalesce(jsonb_agg(jsonb_build_object('round', round, 'grade', grade, 'headline', headline,
        'impact', impact, 'related_stock_ids', related_stock_ids)), '[]'::jsonb) from hints),
    'monthly_prices', (select coalesce(jsonb_agg(jsonb_build_object('stock_id', stock_id, 'year', year, 'month', month,
        'open', open, 'high', high, 'low', low, 'close', close) order by stock_id, year, month), '[]'::jsonb) from monthly_prices)
  );
$$;
revoke all on function snapshot_content() from public, anon, authenticated;
