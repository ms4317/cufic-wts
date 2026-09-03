-- 체결가를 "원래 방식"(엑셀 연도별 정적 가격)으로 되돌린다.
--
-- 배경: 최신 마이그레이션(36·37·44 등)이 place_order의 체결가를 private.exec_price(장중 가격경로,
--   stock_price_paths)로 바꿔 놨다. 그런데 stocks_bridge_paths 트리거가 데이터셋 로드 때 종목마다
--   "직전 연도 종가 → 당해 종가로 흐르는" 장중경로를 자동 생성해서, 라운드 시작엔 옛 가격에 체결되는
--   문제가 생긴다. 배포된 (구)프론트는 당해 연도 종가(current_price)만 화면에 보여주므로 화면가↔체결가가
--   어긋나고, 라운드 시작에 하락을 회피하는 보이지 않는 악용이 가능하다. 또 이 저장소 규칙
--   "라운드 중엔 전 거래가 같은 가격"과도 충돌한다.
--
-- 조치: exec_price가 항상 current_price(= stocks.prices의 그 연도 값, 엑셀에서 넣은 정적가)를 돌려주게 한다.
--   → 라운드 중 동일가, 연도가 넘어갈 때만 가격 점프 = 원래 게임 방식. 트리거가 경로를 다시 만들어도 무시된다.
--
-- 되돌리기(장중 기능 복원): 아래 "원본" 블록을 그대로 create or replace 하면 된다.
--   create or replace function private.exec_price(p_stock_id text) returns bigint
--     language plpgsql stable security definer set search_path to 'public' as $orig$
--   declare v_year int; v_path numeric[]; v_idx int;
--   begin
--     select coalesce((g.round_year_map ->> g.current_round::text)::int, g.final_year) into v_year
--       from game_state g where g.id = 1;
--     select prices into v_path from stock_price_paths where stock_id = p_stock_id and year = v_year;
--     if v_path is null then return current_price(p_stock_id); end if;
--     v_idx := private.round_step_idx();
--     return greatest(0, round(v_path[v_idx + 1])::bigint);
--   end; $orig$;

create or replace function private.exec_price(p_stock_id text)
returns bigint
language sql
stable
security definer
set search_path to 'public'
as $$
  -- 원래 방식: 그 연도(엑셀)의 정적 가격. 라운드 중 불변, 연도 전환 때만 점프.
  select current_price(p_stock_id);
$$;
