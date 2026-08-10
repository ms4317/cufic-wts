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
  ended = false,
  rank,
  teamCount,
  hintCount = 0,
  tradingOpen = false,
  remainingMs = 0,
  durationMs = 0,
  started = false,
  bellTotal = 0,
  bellCount = 0,
  onOpenBroadcasts,
  onOpenRanking,
  onOpenHints,
  onOpenMarket,
  theme,
  onToggleTheme,
  onLogout,
}) {
  const dir = dirOf(account.pnl)
  // 남은 시간 비율 (로딩바). 매초 remainingMs가 줄며 바가 함께 줄어든다.
  const fillPct = durationMs > 0 ? Math.max(0, Math.min(100, (remainingMs / durationMs) * 100)) : 0

  return (
    <header>
      <div className="logo">
        <span className="brand-logo" role="img" aria-label="CUFIC WTS" />
      </div>

      {/* 로그인한 팀 */}
      <span className="badge">
        <span className="pulse" />
        {team}
      </span>

      {/* 현재 라운드 (종료 후엔 최종 정산) */}
      <span className="badge round">
        <span className="pulse" />
        {ended
          ? `🏁 최종 · ${round.year}년`
          : round.round === 0
            ? '시작 전 · 대기 중'
            : `ROUND ${round.round} · ${round.year}년`}
      </span>

      {/* 거래 타이머 — 열려 있으면 카운트다운, 아니면 대기 (종료 후엔 숨김) */}
      {started && !ended && (
        <span
          className={
            'badge timer' +
            (tradingOpen ? ' live' : ' idle') +
            (tradingOpen && remainingMs <= 30000 ? ' urgent' : tradingOpen && remainingMs <= 60000 ? ' warn' : '')
          }
        >
          {tradingOpen ? (
            <>
              <span className="trow">
                <span className="pulse" />
                거래 <b className="tclock num">{mmss(remainingMs)}</b>
              </span>
              <span className="tbar">
                <i style={{ width: fillPct + '%' }} />
              </span>
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

      {/* 시황판 — 거시경제 지표 (게임 시작 후) */}
      {started && (
        <button className="badge market-badge" onClick={onOpenMarket} title="시황판 보기">
          📈 시황
        </button>
      )}

      {/* 속보 — 강사가 전체에 보낸 공통 힌트. 새 게 오면 종이 깜빡인다 */}
      {bellTotal > 0 && (
        <button
          className={'badge bell' + (bellCount > 0 ? ' ring' : '')}
          onClick={onOpenBroadcasts}
          title="속보 보기"
          aria-label={bellCount > 0 ? `속보 ${bellCount}건` : '속보'}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path
              d="M12 2.4a5.2 5.2 0 0 0-5.2 5.2v2.9L5.3 13.4a1 1 0 0 0 .9 1.5h11.6a1 1 0 0 0 .9-1.5l-1.5-2.9V7.6A5.2 5.2 0 0 0 12 2.4Z"
              fill="currentColor"
            />
            <path d="M9.7 18a2.3 2.3 0 0 0 4.6 0Z" fill="currentColor" />
          </svg>
          {bellCount > 0 && <span className="bcount">{bellCount}</span>}
        </button>
      )}

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
