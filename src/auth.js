import { rpc } from './supabase'

// 조별 코드 로그인. 검증은 서버(login_team RPC)가 한다.
const TEAM_KEY = 'wts-team'

export function loadTeam() {
  try {
    return localStorage.getItem(TEAM_KEY) || null
  } catch {
    return null
  }
}

/**
 * 참가 코드로 입장. 서버에 실제로 있는 코드인지 확인한다.
 * @returns {Promise<{ok: true, team: {code, name, id}} | {ok: false, error: string}>}
 */
export async function login(code) {
  const trimmed = String(code || '').trim()
  if (!trimmed) return { ok: false, error: '참가 코드를 입력해 주세요.' }

  const r = await rpc('login_team', { p_code: trimmed })
  if (!r.ok) {
    return {
      ok: false,
      error:
        r.error === 'unknown_code'
          ? '등록되지 않은 코드예요. 강사 선생님께 확인해 주세요.'
          : '연결이 불안정해요. 다시 시도해 주세요.',
    }
  }

  try {
    localStorage.setItem(TEAM_KEY, r.code)
  } catch {
    // 저장 실패해도 세션 내 입장은 허용
  }
  return { ok: true, team: { id: r.team_id, code: r.code, name: r.name } }
}

/** 새로고침 시 자동 재로그인. 저장된 코드가 아직 유효한지 서버에 확인한다. */
export async function restore() {
  const code = loadTeam()
  if (!code) return { ok: false, error: 'no_saved_code' }
  const r = await rpc('login_team', { p_code: code })
  if (!r.ok) {
    // 조가 삭제됐거나 코드가 바뀌었으면 저장된 것을 지운다
    if (r.error === 'unknown_code') logout()
    return { ok: false, error: r.error }
  }
  return { ok: true, team: { id: r.team_id, code: r.code, name: r.name } }
}

export function logout() {
  try {
    localStorage.removeItem(TEAM_KEY)
  } catch {
    // 무시
  }
}
