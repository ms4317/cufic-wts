import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { deriveAccount } from './account'
import { makeActions } from './actions'
import { buildStocks, loadAll, refetchMine, subscribeSignals, yearOf } from './gameData'
import { useTheme } from './theme'
import { loadTeam, login as authLogin, logout as authLogout, restore } from './auth'
import { errorText } from './supabase'

import Login from './components/Login'
import RotateNotice from './components/RotateNotice'
import Header from './components/Header'
import StockList from './components/StockList'
import Chart from './components/Chart'
import OrderSheet from './components/OrderSheet'
import HintModal from './components/HintModal'
import BroadcastModal from './components/BroadcastModal'
import MyModal from './components/MyModal'
import FinancialModal from './components/FinancialModal'
import RoundModal from './components/RoundModal'
import RankingModal from './components/RankingModal'
import Toasts, { useToasts } from './components/Toast'
import Admin from './admin/Admin'

export default function App() {
  const [theme, toggleTheme] = useTheme()

  // /admin 또는 ?admin=1 로 관리자 화면. 라우터를 들이지 않고 최소로 분기한다.
  const isAdmin =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/admin') ||
      new URLSearchParams(window.location.search).has('admin'))

  if (isAdmin) return <Admin theme={theme} onToggleTheme={toggleTheme} />

  return <Student theme={theme} onToggleTheme={toggleTheme} />
}

function Student({ theme, onToggleTheme }) {
  const [team, setTeam] = useState(null)
  const [booting, setBooting] = useState(true) // 저장된 코드로 재로그인 시도 중
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const [game, setGame] = useState(null)
  const [rawStocks, setRawStocks] = useState([])
  const [positions, setPositions] = useState([])
  const [cash, setCash] = useState(0)
  const [trades, setTrades] = useState([])
  const [hints, setHints] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [board, setBoard] = useState([])
  const [broadcasts, setBroadcasts] = useState([]) // 전체 공통 속보
  const [seed, setSeed] = useState(0) // 내 조의 원금. 조마다 다를 수 있다.

  const [placing, setPlacing] = useState(false) // 즉시 체결 요청 중
  const [nowTs, setNowTs] = useState(() => Date.now()) // 카운트다운용 1초 틱
  const [selectedCode, setSelectedCode] = useState(null)
  const [drawings, setDrawings] = useState({})

  const [myOpen, setMyOpen] = useState(false)
  const [finOpen, setFinOpen] = useState(false)
  const [rankOpen, setRankOpen] = useState(false)
  const [hintsOpen, setHintsOpen] = useState(false)
  const [bcOpen, setBcOpen] = useState(false) // 속보 팝업
  // 마지막으로 확인한 속보 id — 이보다 큰 게 있으면 종이 깜빡인다 (기기별 localStorage)
  const [seenBc, setSeenBc] = useState(() => {
    try {
      return Number(localStorage.getItem('wts-seen-bc') || 0)
    } catch {
      return 0
    }
  })
  const [roundSummary, setRoundSummary] = useState(null)
  const [toasts, pushToast, dismissToast] = useToasts()

  const stocks = useMemo(() => buildStocks(rawStocks, game, positions), [rawStocks, game, positions])
  const selected = useMemo(
    () => stocks.find((s) => s.code === selectedCode) ?? stocks[0] ?? null,
    [stocks, selectedCode],
  )
  const acct = useMemo(() => deriveAccount(stocks, cash, seed || 0), [stocks, cash, seed])

  // 순위 행 (헤더 배지 · 순위 모달이 공유)
  const rankRows = useMemo(
    () =>
      board.map((b) => ({
        rank: Number(b.rank),
        name: b.name,
        equity: Number(b.equity),
        pnl: Number(b.pnl),
        pnlPct: Number(b.pnl_pct),
        me: b.team_id === team?.id,
      })),
    [board, team],
  )
  const realizedTotal = useMemo(
    () => trades.reduce((s, t) => s + Number(t.realized_pnl ?? 0), 0),
    [trades],
  )
  const year = yearOf(game)
  const locked = !!game?.is_locked
  const started = (game?.current_round ?? 0) >= 1

  // 라운드 타이머. 서버 round_ends_at이 유일한 기준이다(place_order도 서버 시각으로 검사).
  // 클라이언트 시계가 어긋나도 표시만 틀릴 뿐, 마감 이후 거래는 서버가 거부한다.
  const endsAt = game?.round_ends_at ? new Date(game.round_ends_at).getTime() : null
  const remainingMs = endsAt ? Math.max(0, endsAt - nowTs) : 0
  const tradingOpen = started && !locked && remainingMs > 0

  // 안 읽은 속보 개수 — 종 버튼 깜빡임·배지용
  const unreadBc = broadcasts.reduce((n, b) => n + (Number(b.id) > seenBc ? 1 : 0), 0)

  const myRank = board.find((b) => b.team_id === team?.id)?.rank ?? null

  // 수익률 차트 — 서버 스냅샷 기반
  const rounds = useMemo(() => {
    const pts = [{ label: '시작', equity: seed || 0 }]
    for (const s of snapshots) {
      pts.push({ label: `R${s.round} · ${game?.round_year_map?.[String(s.round)] ?? ''}`, equity: Number(s.equity) })
    }
    if (started) pts.push({ label: `지금 · R${game.current_round}`, equity: acct.equity })
    return pts
  }, [snapshots, seed, acct.equity, game, started])

  // ── 데이터 로드
  const teamRef = useRef(null)
  teamRef.current = team
  // 신호 콜백이 최신 힌트 목록을 봐야 한다 (클로저에 갇히면 안 됨)
  const hintsRef = useRef([])
  hintsRef.current = hints

  const load = useCallback(async (t) => {
    setLoading(true)
    setLoadError(null)
    const r = await loadAll(t.code, t.id)
    setLoading(false)
    if (!r.ok) {
      setLoadError(r.error)
      return false
    }
    setGame(r.game)
    setRawStocks(r.rawStocks)
    setPositions(r.positions)
    setTrades(r.trades)
    setHints(r.hints)
    setSnapshots(r.snapshots)
    setBoard(r.leaderboard)
    setBroadcasts(r.broadcasts)
    setSeed(r.seed)
    setCash(r.cash)
    setSelectedCode((c) => c ?? r.rawStocks[0]?.id ?? null)
    return true
  }, [])

  // 새로 읽은 값을 그대로 돌려준다 — 호출부가 setState 직후에 ref를 읽으면
  // 아직 렌더 전이라 옛 값을 본다.
  const refetch = useCallback(async () => {
    const t = teamRef.current
    if (!t) return { ok: false, error: 'no_team' }
    const r = await refetchMine(t.code, t.id)
    if (!r.ok) {
      pushToast(errorText(r.error), 'down')
      return r
    }
    setPositions(r.positions)
    setTrades(r.trades)
    setHints(r.hints)
    setSnapshots(r.snapshots)
    setBoard(r.leaderboard)
    setBroadcasts(r.broadcasts)
    setGame(r.game)
    setCash(r.cash)
    return r
  }, [pushToast])

  // 카운트다운 1초 틱 — 타이머가 도는 동안만 의미가 있지만, 항상 돌려도 가볍다.
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // 속보 팝업이 열려 있으면(그리고 목록이 갱신되면) 전부 읽음 처리 → 깜빡임 멈춤
  useEffect(() => {
    if (!bcOpen) return
    const maxId = broadcasts.reduce((m, b) => Math.max(m, Number(b.id)), 0)
    setSeenBc((prev) => Math.max(prev, maxId))
    try {
      localStorage.setItem('wts-seen-bc', String(maxId))
    } catch {
      /* 무시 */
    }
  }, [bcOpen, broadcasts])

  // ── 재접속 복원: 저장된 코드로 자동 재로그인
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!loadTeam()) {
        setBooting(false)
        return
      }
      const r = await restore()
      if (!alive) return
      if (r.ok) {
        setTeam(r.team)
        await load(r.team)
      }
      setBooting(false)
    })()
    return () => {
      alive = false
    }
  }, [load])

  // ── 실시간 신호
  const seenRound = useRef(null)
  useEffect(() => {
    if (!team) return
    const off = subscribeSignals(async (sig) => {
      // 다른 조의 주문서 제출은 나와 무관하다 — 관리자만 본다
      if (sig.kind === 'sheet_saved') return

      const before = hintsRef.current.length
      const fresh = await refetch()
      if (!fresh?.ok) return

      if (sig.kind === 'hints_changed') {
        // 나에게 실제로 새 힌트가 왔을 때만 알린다.
        // 다른 조에 지급돼도 신호는 오지만 내 목록은 그대로다.
        if (fresh.hints.length > before) {
          // 누르면 힌트 팝업이 열린다
          pushToast('새로운 힌트가 도착했어요', 'gold', () => setHintsOpen(true))
        }
      } else if (sig.kind === 'timer_started') {
        pushToast('거래 시간이 시작됐어요', 'up')
      } else if (sig.kind === 'broadcast') {
        // 새 속보 도착 → 종이 깜빡인다. 회수(deleted) 신호면 목록만 조용히 갱신.
        if (!sig.payload?.deleted) pushToast('📢 속보가 도착했어요', 'gold', () => setBcOpen(true))
      } else if (sig.kind === 'game_reset') {
        pushToast('대회가 초기화되었어요', 'gold')
      } else if (sig.kind === 'game_ended') {
        pushToast('대회가 종료되었어요', 'gold')
      }
      // round_advanced는 game이 갱신되면 아래 effect가 요약 모달을 띄운다
    })
    return off
    // hints는 ref로 읽으므로 의존성에 넣지 않는다 (넣으면 구독이 계속 재생성된다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, refetch, pushToast])

  // 라운드가 바뀌면 요약 모달
  useEffect(() => {
    const r = game?.current_round
    if (r == null) return
    if (seenRound.current === null) {
      seenRound.current = r
      return
    }
    if (seenRound.current !== r && r >= 1) {
      seenRound.current = r
      setRoundSummary({ round: r, year: yearOf(game, r) })
    }
  }, [game])

  const handleLogin = useCallback(
    async (code) => {
      const r = await authLogin(code)
      if (!r.ok) return r
      setTeam(r.team)
      await load(r.team)
      return r
    },
    [load],
  )

  const handleLogout = useCallback(() => {
    authLogout()
    setTeam(null)
    setMyOpen(false)
  }, [])

  const actions = useMemo(
    () => makeActions({ getTeamCode: () => teamRef.current?.code, refetch, notify: pushToast }),
    [refetch, pushToast],
  )

  const placeOrder = useCallback(
    async (side, qty) => {
      if (!selectedCode || qty <= 0) return
      setPlacing(true)
      await actions.placeOrder(selectedCode, side, qty)
      setPlacing(false)
    },
    [actions, selectedCode],
  )

  const setStrokes = useCallback(
    (next) => setDrawings((d) => ({ ...d, [selectedCode]: next })),
    [selectedCode],
  )

  if (booting) {
    return (
      <>
        <RotateNotice />
        <div className="boot">
          <div className="spinner" />
          <p>불러오는 중…</p>
        </div>
      </>
    )
  }

  if (!team) {
    return (
      <>
        <RotateNotice />
        <Login onSubmit={handleLogin} theme={theme} onToggleTheme={onToggleTheme} />
      </>
    )
  }

  if (loading || !game || !selected) {
    return (
      <>
        <RotateNotice />
        <div className="boot">
          {loadError ? (
            <>
              <p className="boot-err">{errorText(loadError)}</p>
              <button className="act-btn buy" onClick={() => load(team)} style={{ maxWidth: 200 }}>
                다시 시도
              </button>
            </>
          ) : (
            <>
              <div className="spinner" />
              <p>대회 정보를 불러오는 중…</p>
            </>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <RotateNotice />
      <Header
        account={acct}
        team={team.name || team.code}
        round={{ round: game.current_round, year }}
        rank={myRank}
        teamCount={board.length}
        hintCount={hints.length}
        tradingOpen={tradingOpen}
        remainingMs={remainingMs}
        started={started}
        bellTotal={broadcasts.length}
        bellCount={unreadBc}
        onOpenBroadcasts={() => setBcOpen(true)}
        onOpenRanking={() => setRankOpen(true)}
        onOpenHints={() => setHintsOpen(true)}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onLogout={handleLogout}
      />

      {!started && (
        <div className="notstarted">아직 대회가 시작되지 않았어요. 강사 선생님을 기다려 주세요.</div>
      )}

      <div className="app">
        <StockList
          stocks={stocks}
          selectedCode={selected.code}
          onSelect={setSelectedCode}
          onOpenMy={() => setMyOpen(true)}
        />
        <Chart
          stock={selected}
          onOpenFinancial={() => setFinOpen(true)}
          strokes={drawings[selected.code] ?? []}
          onStrokesChange={setStrokes}
        />
        <OrderSheet
          key={selected.code}
          stock={selected}
          stocks={stocks}
          cash={cash}
          onOrder={placeOrder}
          onSelectStock={setSelectedCode}
          placing={placing}
          tradingOpen={tradingOpen}
          started={started}
          hasTraded={trades.length > 0}
        />
      </div>

      <MyModal
        open={myOpen}
        onClose={() => setMyOpen(false)}
        account={acct}
        realized={realizedTotal}
        stocks={stocks}
        history={trades.map((t) => {
          const d = new Date(t.created_at)
          const p2 = (n) => String(n).padStart(2, '0')
          return {
            time: `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`,
            round: t.round,
            year: yearOf(game, t.round),
            name: stocks.find((s) => s.code === t.stock_id)?.name ?? t.stock_id,
            side: t.side,
            price: Number(t.price),
            qty: t.quantity,
            amount: Number(t.price) * t.quantity,
            realized: Number(t.realized_pnl ?? 0),
          }
        })}
        rounds={rounds}
      />
      <RankingModal open={rankOpen} onClose={() => setRankOpen(false)} rows={rankRows} />
      <HintModal
        open={hintsOpen}
        onClose={() => setHintsOpen(false)}
        hints={hints}
        stocks={stocks}
        onSelectStock={setSelectedCode}
      />
      <BroadcastModal
        open={bcOpen}
        onClose={() => setBcOpen(false)}
        broadcasts={broadcasts}
        game={game}
      />
      <FinancialModal
        open={finOpen}
        onClose={() => setFinOpen(false)}
        stock={selected}
        round={{ round: game.current_round, year }}
      />
      <RoundModal
        round={roundSummary}
        account={acct}
        stocks={stocks}
        prevEquity={
          roundSummary
            ? Number(snapshots.find((s) => s.round === roundSummary.round - 1)?.equity ?? seed)
            : null
        }
        onClose={() => setRoundSummary(null)}
      />

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}
