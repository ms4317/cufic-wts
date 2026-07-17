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
   * 주문서 저장. 시트 전체를 통째로 교체한다.
   * @param {{stock_id:string, buy_qty:number, sell_qty:number}[]} lines
   */
  async function saveOrderSheet(lines) {
    const r = await rpc('save_order_sheet', { p_team_code: getTeamCode(), p_lines: lines })
    if (!r.ok) {
      notify?.(errorText(r.error), 'down')
      return r
    }
    await refetch()
    notify?.('주문서를 저장했어요', 'up')
    return r
  }

  return { saveOrderSheet }
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
    endGame: () => call('admin_end_game'),
    resetGame: () => call('reset_game'),

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
