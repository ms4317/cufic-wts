import { num, signed, pct, dirOf } from '../format'
import ThemeToggle from './ThemeToggle'

const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Header({
  account,
  team,
  round,
  rank,
  teamCount,
  hintCount = 0,
  tradingOpen = false,
  remainingMs = 0,
  started = false,
  onOpenRanking,
  onOpenHints,
  theme,
  onToggleTheme,
  onLogout,
}) {
  const dir = dirOf(account.pnl)

  return (
    <header>
      <div className="logo">
        <span className="dot" />
        Cufic WTS
      </div>

      {/* 로그인한 팀 */}
      <span className="badge">
        <span className="pulse" />
        {team}
      </span>

      {/* 현재 라운드 */}
      <span className="badge round">
        <span className="pulse" />
        ROUND {round.round} · {round.year}년
      </span>

      {/* 거래 타이머 — 열려 있으면 카운트다운, 아니면 대기 */}
      {started && (
        <span className={'badge timer' + (tradingOpen ? ' live' : ' idle')}>
          {tradingOpen ? (
            <>
              <span className="pulse" />
              거래 {mmss(remainingMs)}
            </>
          ) : (
            '거래 대기'
          )}
        </span>
      )}

      {/* 조별 순위 — 누르면 전체 순위 팝업 */}
      {rank != null && (
        <button className="badge rank" onClick={onOpenRanking} title="전체 순위 보기">
          {rank}위 <span className="of">/ {teamCount}조</span>
        </button>
      )}

      {/* 내 힌트 — 누르면 힌트 팝업 */}
      <button className="badge hint-badge" onClick={onOpenHints} title="내 힌트 보기">
        내 힌트 {hintCount > 0 && <span className="hcount">{hintCount}</span>}
      </button>

      <div className="acct">
        <div className="item">
          <span className="lbl">평가금액</span>
          <span className="val num">₩ {num(account.equity)}</span>
        </div>
        <div className="item">
          <span className="lbl">주문가능</span>
          <span className="val num">₩ {num(account.cash)}</span>
        </div>
        <div className="item">
          <span className="lbl">총 손익</span>
          <span className={'val num ' + dir}>
            {signed(account.pnl)} ({pct(account.pnlPct)})
          </span>
        </div>
      </div>

      <div className="hbtns">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button className="text-btn" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </header>
  )
}
