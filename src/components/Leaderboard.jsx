import { pct, dirOf } from '../format'
import { IS_MOCK } from '../leaderboard'

/**
 * 하단 상시 순위 현황판. 뉴스 피드 옆에 붙는다.
 * @param {{rank:number, name:string, pnlPct:number, me:boolean}[]} rows
 */
export default function Leaderboard({ rows }) {
  return (
    <section className="col board">
      <div className="bhead">
        <span className="btitle">조별 순위</span>
        <span className="bcount">{rows.length}조</span>
        {/* 서버가 붙기 전까지 다른 조는 가짜다. 숨기지 않고 드러낸다. */}
        {IS_MOCK && <span className="mock" title="서버 연결 전이라 다른 조는 예시 데이터입니다">예시</span>}
      </div>

      <div className="brows">
        {rows.map((t) => (
          <div key={t.name} className={'brow' + (t.me ? ' me' : '')}>
            <span className="rk">{t.rank}</span>
            <span className="tm">{t.name}</span>
            <span className={'rt num ' + dirOf(t.pnlPct)}>{pct(t.pnlPct)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
