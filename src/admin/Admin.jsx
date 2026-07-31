import { useCallback, useEffect, useMemo, useState } from 'react'
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
import AdminBoard from './AdminBoard'

const TABS = [
  { key: 'progress', label: '진행' },
  { key: 'hints', label: '힌트' },
  { key: 'teams', label: '조 관리' },
  { key: 'stocks', label: '종목·가격' },
  { key: 'content', label: '재무·시황' },
  { key: 'board', label: '리더보드' },
]

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

  const actions = useMemo(() => makeAdminActions(() => secret), [secret])

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
          <div className="mark" />
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
          <span className="dot" />
          Cufic WTS
        </div>
        <span className="badge round">관리자</span>
        {game && (
          <span className="badge">
            {game.current_round === 0
              ? '시작 전'
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
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>

        <main className="admin-main">
          {tab === 'progress' && <AdminProgress {...shared} />}
          {tab === 'hints' && <AdminHints {...shared} />}
          {tab === 'teams' && <AdminTeams {...shared} />}
          {tab === 'stocks' && <AdminStocks {...shared} />}
          {tab === 'content' && <AdminContent {...shared} />}
          {tab === 'board' && <AdminBoard {...shared} />}
        </main>
      </div>

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
