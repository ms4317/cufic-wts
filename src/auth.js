// 조별 코드 로그인.
// 지금은 코드 검증 없이 통과시킨다. 추후 서버 검증은 login() 안에만 붙이면 된다.
const TEAM_KEY = 'wts-team'

export function loadTeam() {
  try {
    return localStorage.getItem(TEAM_KEY) || null
  } catch {
    return null
  }
}

/**
 * 참가 코드로 입장 처리.
 * @returns {{ok: true, team: string} | {ok: false, error: string}}
 */
export function login(code) {
  const team = String(code || '').trim().toUpperCase()
  if (!team) return { ok: false, error: '참가 코드를 입력해 주세요.' }

  // TODO: 서버 검증 자리. await fetch('/api/login', ...) 결과로 ok/error를 결정.
  try {
    localStorage.setItem(TEAM_KEY, team)
  } catch {
    // 저장 실패해도 세션 내 입장은 허용
  }
  return { ok: true, team }
}

export function logout() {
  try {
    localStorage.removeItem(TEAM_KEY)
  } catch {
    // 무시
  }
}
