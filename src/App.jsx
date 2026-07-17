import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PRINCIPAL,
  ROUNDS,
  initialCash,
  stocks as catalog,
  initialHistory,
  initialNews,
  initialRound,
} from './data'
import { deriveAccount } from './account'
import { buildLeaderboard } from './leaderboard'
import { makeActions } from './actions'
import { useTheme } from './theme'
import { loadTeam, login as authLogin, logout as authLogout } from './auth'

import Login from './components/Login'
import RotateNotice from './components/RotateNotice'
import Header from './components/Header'
import StockList from './components/StockList'
import Chart from './components/Chart'
import OrderPanel from './components/OrderPanel'
import NewsFeed from './components/NewsFeed'
import Leaderboard from './components/Leaderboard'
import MyModal from './components/MyModal'
import FinancialModal from './components/FinancialModal'
import ConfirmModal from './components/ConfirmModal'
import RoundModal from './components/RoundModal'
import Toasts, { useToasts } from './components/Toast'

const STOCK_NAMES = catalog.map((s) => s.name)

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [team, setTeam] = useState(loadTeam)

  // 보유 현황만 상태로 든다. 시세는 라운드에서 파생되므로 여기 섞지 않는다.
  const [positions, setPositions] = useState({}) // { [code]: { holding, avgPrice } }
  const [cash, setCash] = useState(initialCash)
  const [history, setHistory] = useState(initialHistory)
  const [news, setNews] = useState(initialNews)
  const [round, setRound] = useState(initialRound)
  const [roundLog, setRoundLog] = useState({}) // { [round]: 그 라운드를 떠날 때의 평가금액 }

  const [selectedCode, setSelectedCode] = useState('005930')
  const [buyQty, setBuyQty] = useState(0)
  const [sellQty, setSellQty] = useState(0)
  const [drawings, setDrawings] = useState({}) // 종목코드별 그림 { [code]: stroke[] }

  const [myOpen, setMyOpen] = useState(false)
  const [finOpen, setFinOpen] = useState(false)
  const [pending, setPending] = useState(null) // 확인 대기 중인 주문
  const [roundSummary, setRoundSummary] = useState(null) // 라운드 전환 요약 모달
  const [focusNewsId, setFocusNewsId] = useState(null) // 토스트로 지목된 뉴스 카드
  const [toasts, pushToast, dismissToast] = useToasts()

  // 현재 라운드 시세 + 보유를 합친 종목 목록. 화면은 전부 이걸 쓴다.
  const stocks = useMemo(
    () =>
      catalog.map((s) => {
        const raw = s.priceByYear[round.year]
        // 상장폐지·미상장 등으로 그 해 가격이 없거나 0이면 거래정지.
        // 0으로 나누는 곳이 생기지 않게 막는다.
        const halted = !raw || raw <= 0
        const price = halted ? 0 : raw
        const prevRaw = s.priceByYear[round.year - 1]
        const prev = !prevRaw || prevRaw <= 0 ? price : prevRaw
        const delta = price - prev
        const pos = positions[s.code]
        return {
          ...s,
          price,
          halted,
          delta: halted ? 0 : delta,
          chg: halted || !prev ? 0 : (delta / prev) * 100,
          holding: pos?.holding ?? 0,
          avgPrice: pos?.avgPrice ?? 0,
        }
      }),
    [round.year, positions],
  )

  const selected = useMemo(
    () => stocks.find((s) => s.code === selectedCode) ?? stocks[0],
    [stocks, selectedCode],
  )

  const acct = deriveAccount(stocks, cash, PRINCIPAL)

  // 판 것에서 실제로 번 돈. 체결 시점에 기록해 둔 값을 합산한다.
  const realizedTotal = useMemo(
    () => history.reduce((sum, h) => sum + (h.realized ?? 0), 0),
    [history],
  )

  // 조별 순위. 다른 조는 서버가 붙기 전까지 예시 데이터다 (leaderboard.js 참고).
  const ranking = useMemo(
    () =>
      team
        ? buildLeaderboard({
            myTeam: team,
            myEquity: acct.equity,
            round: round.round,
            principal: PRINCIPAL,
          })
        : [],
    [team, acct.equity, round.round],
  )
  const myRank = ranking.find((t) => t.me)?.rank ?? null

  // 아직 오지 않은 라운드의 뉴스는 스포일러다 — 현재 라운드까지만 보여준다.
  const visibleNews = useMemo(
    () =>
      news
        .filter((n) => n.round <= round.round)
        .sort((a, b) => b.round - a.round || b.time.localeCompare(a.time)),
    [news, round.round],
  )

  // 수익률 차트: 원금에서 출발해 지나온 라운드마다 한 점.
  const rounds = useMemo(() => {
    const past = ROUNDS.filter((r) => r.round <= round.round).map((r) => ({
      label: `R${r.round} · ${r.year}`,
      equity: r.round === round.round ? acct.equity : (roundLog[r.round] ?? PRINCIPAL),
    }))
    return [{ label: '시작', equity: PRINCIPAL }, ...past]
  }, [round.round, roundLog, acct.equity])

  // 종목을 바꾸면 주문 수량을 비운다.
  // 남겨두면 삼성전자 500주를 입력해 둔 채 카카오로 옮겨 무심코 BUY를 누르는 오주문이 난다.
  useEffect(() => {
    setBuyQty(0)
    setSellQty(0)
  }, [selectedCode])

  // 라운드가 바뀌면 요약 모달을 띄운다. 조용히 숫자만 바뀌면 학생이 알아채지 못한다.
  const seenRound = useRef(round.round)
  useEffect(() => {
    if (seenRound.current === round.round) return
    seenRound.current = round.round
    setRoundSummary(round)
  }, [round])

  // actions가 낡은 값을 읽지 않도록 ref로 현재값을 노출한다
  const stateRef = useRef()
  stateRef.current = { positions, cash, round, equity: acct.equity }

  const actions = useMemo(
    () =>
      makeActions({
        getState: () => stateRef.current,
        set: {
          positions: setPositions,
          cash: setCash,
          history: setHistory,
          news: setNews,
          round: setRound,
          roundLog: setRoundLog,
        },
        notify: pushToast,
        focusNews: setFocusNewsId,
      }),
    [pushToast],
  )
  // 운영자 패널이 붙기 전까지 개발 중 수동 테스트용 통로
  if (import.meta.env.DEV) window.wtsAdmin = actions

  const handleLogin = useCallback((code) => {
    const result = authLogin(code)
    if (result.ok) setTeam(result.team)
    return result
  }, [])

  const handleLogout = useCallback(() => {
    authLogout()
    setTeam(null)
    setMyOpen(false)
  }, [])

  const setStrokes = useCallback(
    (next) => setDrawings((d) => ({ ...d, [selectedCode]: next })),
    [selectedCode],
  )

  const selectByName = useCallback((name) => {
    const s = catalog.find((x) => x.name === name)
    if (s) setSelectedCode(s.code)
  }, [])

  // BUY/SELL → 확인 모달 요청
  const requestOrder = useCallback(
    (side, qty) => {
      if (selected.halted) return
      setPending({ code: selected.code, name: selected.name, side, qty, price: selected.price })
    },
    [selected],
  )

  // 확인 → 체결 (실패 응답은 서버가 붙으면 그대로 살아난다)
  const confirmOrder = useCallback(async () => {
    if (!pending) return
    const result = await actions.executeOrder(pending)
    setPending(null)
    if (result.ok) {
      setBuyQty(0)
      setSellQty(0)
    } else {
      pushToast(result.error, 'down')
    }
  }, [pending, actions, pushToast])

  if (!team) {
    return (
      <>
        <RotateNotice />
        <Login onSubmit={handleLogin} theme={theme} onToggleTheme={toggleTheme} />
      </>
    )
  }

  return (
    <>
      <RotateNotice />
      <Header
        account={acct}
        team={team}
        round={round}
        rank={myRank}
        teamCount={ranking.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      <div className="app">
        <StockList
          stocks={stocks}
          selectedCode={selectedCode}
          onSelect={setSelectedCode}
          onOpenMy={() => setMyOpen(true)}
        />
        <Chart
          stock={selected}
          onOpenFinancial={() => setFinOpen(true)}
          strokes={drawings[selectedCode] ?? []}
          onStrokesChange={setStrokes}
        />
        <OrderPanel
          stock={selected}
          cash={cash}
          buyQty={buyQty}
          setBuyQty={setBuyQty}
          sellQty={sellQty}
          setSellQty={setSellQty}
          onRequestOrder={requestOrder}
        />
        <NewsFeed
          news={visibleNews}
          knownStocks={STOCK_NAMES}
          onSelectStock={selectByName}
          focusId={focusNewsId}
          onFocusHandled={() => setFocusNewsId(null)}
        />
        <Leaderboard rows={ranking} />
      </div>

      <MyModal
        open={myOpen}
        onClose={() => setMyOpen(false)}
        account={acct}
        realized={realizedTotal}
        stocks={stocks}
        history={history}
        rounds={rounds}
        ranking={ranking}
      />
      <FinancialModal
        open={finOpen}
        onClose={() => setFinOpen(false)}
        stock={selected}
        round={round}
      />
      <ConfirmModal
        order={pending}
        cash={cash}
        onCancel={() => setPending(null)}
        onConfirm={confirmOrder}
      />
      <RoundModal
        round={roundSummary}
        account={acct}
        stocks={stocks}
        prevEquity={roundSummary ? roundLog[roundSummary.round - 1] : null}
        onClose={() => setRoundSummary(null)}
      />

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}
