import { num, signed, pct, dirOf } from '../format'
import ThemeToggle from './ThemeToggle'

export default function Header({ account, team, round, rank, teamCount, theme, onToggleTheme, onLogout }) {
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

      {/* 조별 순위 — 항상 보여야 경쟁 동기가 산다 */}
      {rank != null && (
        <span className="badge rank">
          {rank}위 <span className="of">/ {teamCount}조</span>
        </span>
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
