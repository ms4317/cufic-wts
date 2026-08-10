import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { makeAdminActions } from '../actions'
import { subscribeSignals } from '../gameData'
import { select, errorText } from '../supabase'
import ThemeToggle from '../components/ThemeToggle'
import Toasts, { useToasts } from '../components/Toast'
import AdminProgress from './AdminProgress'
import AdminHints from './AdminHints'
import AdminTeams from './AdminTeams'
import AdminStocks from './AdminStocks'
import AdminContent from './AdminContent'
import AdminDatasets from './AdminDatasets'
import AdminBoard from './AdminBoard'

// 탭을 두 그룹으로. 준비 그룹은 제작 흐름 순서(데이터셋이 시작점 → 가격 → 재무·시황 → 힌트 → 조).
const TAB_GROUPS = [
  {
    label: '대회 운영',
    tabs: [
      { key: 'progress', label: '진행' },
      { key: 'board', label: '리더보드' },
    ],
  },
  {
    label: '게임 준비',
    tabs: [
      { key: 'datasets', label: '데이터셋' },
      { key: 'stocks', label: '종목·가격' },
      { key: 'content', label: '재무·시황' },
      { key: 'hints', label: '힌트' },
      { key: 'teams', label: '조 관리' },
    ],
  },
]

// 탭 상단 한 줄 도움말
const TAB_HELP = {
  progress: '대회 진행 — 라운드 넘기기·타이머·속보',
  board: '조별 순위 — 프로젝터용 큰 글씨 모드',
  datasets: '게임 데이터 한 벌의 저장·불러오기. 제작의 시작과 끝',
  stocks: '종목과 연도별 가격 — 게임의 뼈대',
  content: '종목별 재무제표와 연도별 거시 지표',
  hints: '라운드별 힌트 작성과 지급',
  teams: '참가 조와 코드',
}

const SECRET_KEY = 'wts-admin' // 세션 동안만 기억한다 (sessionStorage)

export default function Admin({ theme, onToggleTheme }) {
  const [secret, setSecret] = useState(() => {
    try {
      return sessionStorage.getItem(SECRET_KEY) || ''
    } catch {
      return ''
    }
  })
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState('progress')
  const [toasts, pushToast, dismissToast] = useToasts()

  const [game, setGame] = useState(null)
  const [stocks, setStocks] = useState([])
  const [teams, setTeams] = useState([])
  const [hints, setHints] = useState([])
  const [board, setBoard] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [financials, setFinancials] = useState([]) // 재무제표 행 (편집용)
  const [macro, setMacro] = useState([]) // 시황 행 (편집용)

  // 비밀은 ref로 읽는다 — 로그인 직후 refresh()가 옛 secret 클로저를 쓰지 않게(안 그러면
  // 관리자 RPC가 빈 비밀번호로 호출돼 조·힌트·재무·시황이 로그인 직후 전부 비어 버린다).
  const secretRef = useRef(secret)
  secretRef.current = secret
  const actions = useMemo(() => makeAdminActions(() => secretRef.current), [])

  const refresh = useCallback(async () => {
    const [g, s, ts, hs, , bc, fin, mac] = await Promise.all([
      select('game_state', '*'),
      select('stocks', '*'),
      actions.teamsStatus(),
      actions.listHints(),
      select('public_teams', '*'), // 리더보드는 RPC로 따로
      select('broadcasts', '*', (q) => q.order('id', { ascending: false })),
      actions.listFinancials(), // 편집용: 미래 연도까지 전부
      actions.listMacro(),
    ])
    if (g.ok) setGame(g.rows[0] ?? null)
    if (s.ok) setStocks(s.rows.slice().sort((a, b) => a.display_order - b.display_order))
    if (ts.ok) setTeams(ts.teams ?? [])
    if (hs.ok) setHints(hs.hints ?? [])
    if (bc.ok) setBroadcasts(bc.rows ?? [])
    if (fin.ok) setFinancials(fin.rows ?? [])
    if (mac.ok) setMacro(mac.rows ?? [])
    const { rpc } = await import('../supabase')
    const b = await rpc('leaderboard')
    if (b.ok) setBoard(b.rows ?? [])
  }, [actions])

  // 저장된 비밀로 자동 로그인
  useEffect(() => {
    ;(async () => {
      if (!secret) {
        setChecking(false)
        return
      }
      const r = await actions.login(secret)
      if (r.ok) {
        setAuthed(true)
        await refresh()
      }
      setChecking(false)
    })()
    // secret이 바뀔 때만 (로그인 시)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 실시간: 다른 곳에서 바뀌면 갱신
  useEffect(() => {
    if (!authed) return
    return subscribeSignals(() => refresh())
  }, [authed, refresh])

  const doLogin = async (e) => {
    e.preventDefault()
    const input = new FormData(e.target).get('secret')?.toString() ?? ''
    secretRef.current = input // 로그인·직후 refresh가 이 비밀을 쓰게(상태 반영 전이라 ref로)
    const r = await actions.login(input)
    if (!r.ok) {
      pushToast(errorText(r.error), 'down')
      return
    }
    setSecret(input)
    try {
      sessionStorage.setItem(SECRET_KEY, input)
    } catch {
      /* 무시 */
    }
    setAuthed(true)
    await refresh()
  }

  const logout = () => {
    try {
      sessionStorage.removeItem(SECRET_KEY)
    } catch {
      /* 무시 */
    }
    setSecret('')
    setAuthed(false)
  }

  if (checking) {
    return (
      <div className="boot">
        <div className="spinner" />
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="login">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className="theme-fab" />
        <div className="card">
          <span className="brand-logo" role="img" aria-label="CUFIC WTS" />
          <h1>관리자</h1>
          <p className="sub2">CUFIC WTS · 대회 운영</p>
          <form onSubmit={doLogin}>
            <div className="field">
              <label htmlFor="secret">관리자 비밀번호</label>
              <input id="secret" name="secret" type="password" autoFocus autoComplete="off" />
            </div>
            <button type="submit" className="go">
              들어가기
            </button>
          </form>
        </div>
        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </div>
    )
  }

  const shared = {
    actions,
    game,
    stocks,
    teams,
    hints,
    board,
    broadcasts,
    financials,
    macro,
    refresh,
    notify: pushToast,
  }

  return (
    <div className="admin">
      <header>
        <div className="logo">
          <span className="brand-logo" role="img" aria-label="CUFIC WTS" />
        </div>
        <span className="badge round">관리자</span>
        {game && (
          <span className="badge">
            {game.current_round === 0
              ? '시작 전 · 대기 중'
              : `ROUND ${game.current_round} · ${game.round_year_map?.[String(game.current_round)]}년`}
          </span>
        )}
        {game?.is_locked && <span className="badge">정산 중</span>}
        <div className="hbtns">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button className="text-btn" onClick={logout}>
            로그아웃
          </button>
        </div>
      </header>

      <div className="admin-body">
        <nav className="admin-tabs">
          {TAB_GROUPS.map((g) => (
            <div key={g.label} className="tab-group">
              <span className="tab-group-label">{g.label}</span>
              {g.tabs.map((t) => (
                <button
                  key={t.key}
                  className={tab === t.key ? 'on' : ''}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <main className="admin-main">
          {TAB_HELP[tab] && <p className="tab-help">{TAB_HELP[tab]}</p>}
          {tab === 'progress' && <AdminProgress {...shared} />}
          {tab === 'hints' && <AdminHints {...shared} />}
          {tab === 'teams' && <AdminTeams {...shared} />}
          {tab === 'stocks' && <AdminStocks {...shared} />}
          {tab === 'content' && <AdminContent {...shared} />}
          {tab === 'datasets' && <AdminDatasets {...shared} />}
          {tab === 'board' && <AdminBoard {...shared} />}
        </main>
      </div>

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
