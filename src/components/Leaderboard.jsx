import { pct, dirOf } from '../format'

/**
 * 하단 상시 순위 현황판. 서버 leaderboard() RPC 결과를 그린다.
 * 순위는 라운드를 넘길 때만 바뀐다 — 거래별 실시간 갱신 개념은 없다.
 */
export default function Leaderboard({ rows }) {
  return (
    <section className="col board">
      <div className="bhead">
        <span className="btitle">조별 순위</span>
        <span className="bcount">{rows.length}조</span>
      </div>

      <div className="brows">
        {rows.length === 0 && <div className="hint-empty">아직 참가한 조가 없어요.</div>}
        {rows.map((t) => (
          <div key={t.team_id ?? t.name} className={'brow' + (t.me ? ' me' : '')}>
            <span className="rk">{t.rank}</span>
            <span className="tm">{t.name}</span>
            <span className={'rt num ' + dirOf(t.pnlPct)}>{pct(t.pnlPct)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
