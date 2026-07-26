// 상태를 바꾸는 동작을 한곳에 모은다.
//
// 화면(App.jsx)은 여기 있는 함수만 호출한다. 전부 async이고 {ok, error?}를 돌려준다.
// 이제 내부는 Supabase RPC 호출이다 — 서버가 유일한 심판이고, 프론트 검증은 UX용일 뿐이다.
// 낙관적 업데이트는 하지 않는다. 서버가 확정한 뒤 다시 읽어서 반영한다.

import { rpc, errorText } from './supabase'

/**
 * @param {object} deps
 * @param {() => string} deps.getTeamCode
 * @param {() => Promise<void>} deps.refetch  서버 확정 후 상태를 다시 읽는다
 * @param {(msg: string, tone?: string, onClick?: Function) => void} [deps.notify]
 */
export function makeActions({ getTeamCode, refetch, notify }) {
  /**
   * 즉시 체결. 서버가 최종 판정하고, 확정되면 다시 읽어 반영한다(낙관적 업데이트 없음).
   * 타이머가 열려 있을 때만 통과한다(서버 검사). 닫혀 있으면 round_closed로 거부.
   * @param {string} stockId
   * @param {'buy'|'sell'} side
   * @param {number} qty
   */
  async function placeOrder(stockId, side, qty) {
    const r = await rpc('place_order', {
      p_team_code: getTeamCode(),
      p_stock_id: stockId,
      p_side: side,
      p_quantity: qty,
    })
    if (!r.ok) {
      notify?.(errorText(r.error), 'down')
      return r
    }
    await refetch()
    notify?.(side === 'buy' ? '매수 체결됐어요' : '매도 체결됐어요', side === 'buy' ? 'up' : 'down')
    return r
  }

  return { placeOrder }
}

/**
 * 관리자 액션. 비밀번호를 매 호출에 실어 보낸다 —
 * 서버가 private.verify_admin()으로 검사하고, 틀리면 unauthorized를 돌려준다.
 */
export function makeAdminActions(getSecret) {
  const call = async (fn, args = {}) => rpc(fn, { ...args, p_admin_secret: getSecret() })

  return {
    login: (secret) => rpc('admin_login', { p_admin_secret: secret }),
    advanceRound: () => call('advance_round'),
    startTimer: () => call('start_round_timer'),
    endGame: () => call('admin_end_game'),
    resetGame: () => call('reset_game'),

    sendBroadcast: (headline) => call('admin_send_broadcast', { p_headline: headline }),
    deleteBroadcast: (id) => call('admin_delete_broadcast', { p_id: id }),

    teamsStatus: () => call('admin_teams_status'),
    createTeam: (code, name, seed) =>
      call('admin_create_team', { p_code: code, p_name: name, p_seed: seed }),
    deleteTeam: (code) => call('admin_delete_team', { p_code: code }),
    setTeamSeed: (code, seed) => call('admin_set_team_seed', { p_code: code, p_seed: seed }),

    listHints: () => call('admin_list_hints'),
    upsertHint: (h) =>
      call('admin_upsert_hint', {
        p_id: h.id ?? null,
        p_round: h.round,
        p_grade: h.grade,
        p_headline: h.headline,
        p_impact: h.impact,
        p_related: h.related_stock_ids ?? [],
      }),
    deleteHint: (id) => call('admin_delete_hint', { p_id: id }),
    grantHints: (grants) => call('admin_grant_hints', { p_grants: grants }),
    revokeHint: (hintId, teamCode) =>
      call('revoke_hint', { p_hint_id: hintId, p_team_code: teamCode }),

    upsertStock: (s) =>
      call('admin_upsert_stock', {
        p_id: s.id,
        p_name: s.name,
        p_description: s.description ?? '',
        p_prices: s.prices ?? {},
        p_display_order: s.display_order ?? 0,
      }),
    deleteStock: (id) => call('admin_delete_stock', { p_id: id }),
  }
}
