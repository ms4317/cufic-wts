// 서버에서 게임 상태를 읽어와 화면이 쓰는 모양으로 만든다.
//
// data.js의 더미를 대체한다. data.js는 이제 seed.sql 생성용으로만 남는다
// (scripts/gen-seed.mjs). 화면은 전부 여기서 나온 값을 쓴다.

import { supabase, rpc, select } from './supabase'

/** 라운드 → 연도. 종료 후엔 current_round가 total_rounds를 넘어 round_year_map에 없으므로
 *  final_year(예: 2025)로 폴백한다 — 최종 정산 시 2025 가격을 공개하는 장치. */
export const yearOf = (game, round = game?.current_round) => {
  const y = game?.round_year_map?.[String(round)]
  if (y != null) return y
  if (game?.final_year != null && round != null && round > (game?.total_rounds ?? 0)) return game.final_year
  return null
}

/**
 * 종목 + 현재 라운드 시세 + 내 보유를 합친 목록. 화면은 전부 이걸 쓴다.
 * 가격이 없거나 0이면 거래정지 — 0으로 나누는 계산이 생기지 않게 여기서 막는다.
 */
export function buildStocks(rawStocks, game, positions) {
  const year = yearOf(game)
  const prevYear = year != null ? year - 1 : null
  const round = game?.current_round ?? 0
  const posByCode = Object.fromEntries((positions ?? []).map((p) => [p.stock_id, p]))

  return (rawStocks ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((s) => {
      const raw = year != null ? Number(s.prices?.[String(year)] ?? 0) : 0
      const halted = !raw || raw <= 0
      const price = halted ? 0 : raw
      const prevRaw = prevYear != null ? Number(s.prices?.[String(prevYear)] ?? 0) : 0
      const prev = !prevRaw || prevRaw <= 0 ? price : prevRaw
      const delta = price - prev
      const pos = posByCode[s.id]
      // 상장 예정: 아직 상장 라운드에 못 미친 종목. 목록에서 숨긴다(스포일러·오조작 방지).
      // 가격 0으로 거래정지되는 '상장폐지'와 구분되는 상태다.
      const preListed = round > 0 && round < (s.listed_from_round ?? 1)
      return {
        code: s.id,
        name: s.name,
        desc: s.description ?? '',
        market: 'KOSPI',
        prices: s.prices ?? {},
        price,
        halted,
        preListed,
        listedFromRound: s.listed_from_round ?? 1,
        delta: halted ? 0 : delta,
        chg: halted || !prev ? 0 : (delta / prev) * 100,
        holding: pos?.quantity ?? 0,
        avgPrice: Number(pos?.avg_price ?? 0),
      }
    })
}

/**
 * 로그인 후 한 번에 가져오는 초기 데이터. 병렬로 요청한다.
 * 실패하면 화면이 통째로 죽는 대신 {ok:false}를 돌려준다.
 */
export async function loadAll(teamCode, teamId) {
  const [game, stocks, positions, trades, hints, snaps, board, me, cash, bcast] = await Promise.all([
    select('game_state', '*'),
    select('stocks', '*'),
    select('positions', '*', (q) => q.eq('team_id', teamId)),
    select('trades', '*', (q) => q.eq('team_id', teamId).order('created_at', { ascending: false })),
    rpc('get_my_hints', { p_team_code: teamCode }),
    select('round_snapshots', '*', (q) => q.eq('team_id', teamId).order('round')),
    rpc('leaderboard'),
    select('public_teams', '*', (q) => q.eq('id', teamId)),
    rpc('team_cash', { p_team_id: teamId }),
    select('broadcasts', '*', (q) => q.order('id', { ascending: false })),
  ])

  const failed = [game, stocks, positions, trades, hints, snaps, board, me, bcast].find((r) => !r.ok)
  if (failed) return { ok: false, error: failed.error ?? 'network' }

  return {
    ok: true,
    game: game.rows[0] ?? null,
    rawStocks: stocks.rows,
    positions: positions.rows,
    trades: trades.rows,
    hints: hints.rows ?? [],
    snapshots: snaps.rows,
    leaderboard: board.rows ?? [],
    broadcasts: bcast.rows ?? [],
    seed: Number(me.rows[0]?.seed ?? 0), // 원금 — 조마다 다를 수 있다
    cash: Number(cash.value ?? 0),
  }
}

/** 신호를 받았을 때 다시 가져오는 것들 (내 조 데이터 + 공개 데이터) */
export async function refetchMine(teamCode, teamId) {
  const [positions, trades, hints, snaps, board, game, cash, bcast] = await Promise.all([
    select('positions', '*', (q) => q.eq('team_id', teamId)),
    select('trades', '*', (q) => q.eq('team_id', teamId).order('created_at', { ascending: false })),
    rpc('get_my_hints', { p_team_code: teamCode }),
    select('round_snapshots', '*', (q) => q.eq('team_id', teamId).order('round')),
    rpc('leaderboard'),
    select('game_state', '*'),
    rpc('team_cash', { p_team_id: teamId }),
    select('broadcasts', '*', (q) => q.order('id', { ascending: false })),
  ])
  const failed = [positions, trades, hints, snaps, board, game, bcast].find((r) => !r.ok)
  if (failed) return { ok: false, error: failed.error ?? 'network' }
  return {
    ok: true,
    positions: positions.rows,
    trades: trades.rows,
    hints: hints.rows ?? [],
    snapshots: snaps.rows,
    leaderboard: board.rows ?? [],
    broadcasts: bcast.rows ?? [],
    game: game.rows[0] ?? null,
    cash: Number(cash.value ?? 0),
  }
}

/**
 * 실시간 신호 구독.
 *
 * [잠정] 힌트는 조별로 격리돼 있어(select 정책 없음) Realtime Postgres Changes로 못 받는다.
 * Realtime은 RLS를 쓰는데 anon은 hint_grants를 볼 수 없기 때문. 그래서 signals 테이블에
 * "무엇이 바뀌었다"만 흘리고, 받으면 각자 자기 데이터를 RPC로 다시 가져온다.
 */
export function subscribeSignals(onSignal) {
  const ch = supabase
    .channel('wts-signals')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals' }, (p) =>
      onSignal(p.new),
    )
    .subscribe()
  return () => supabase.removeChannel(ch)
}
