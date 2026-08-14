import { useState } from 'react'
import { num, signed, pct, dirOf } from '../format'

/** 리더보드 탭. 프로젝터로 띄우는 화면이라 큰 글씨 모드가 필요하다. */
export default function AdminBoard({ game, board }) {
  const [big, setBig] = useState(false)

  // 단독 1위일 때만 골드 강조. 공동 1위(동률)면 아무도 강조하지 않는다.
  const soleFirst = board.filter((t) => Number(t.rank) === 1).length === 1

  const rankMove = (t) => {
    if (t.prev_rank == null) return null
    const d = Number(t.prev_rank) - Number(t.rank)
    if (d === 0) return { txt: '—', cls: 'flat' }
    return d > 0 ? { txt: `▲${d}`, cls: 'up' } : { txt: `▼${-d}`, cls: 'down' }
  }

  return (
    <div className={'apanel board-panel' + (big ? ' big' : '')}>
      <section className="acard">
        <div className="acard-head">
          <span className="acap">
            조별 순위
            {game && game.current_round > 0 && (
              <> · ROUND {game.current_round} · {game.round_year_map?.[String(game.current_round)]}년</>
            )}
          </span>
          <button className="text-btn" onClick={() => setBig((b) => !b)}>
            {big ? '보통 글씨' : '큰 글씨 (프로젝터)'}
          </button>
        </div>

        <p className="anote">순위는 라운드를 넘길 때만 바뀝니다.</p>

        {board.length === 0 ? (
          <p className="aempty">등록된 조가 없습니다.</p>
        ) : (
          <div className="lb">
            {board.map((t) => {
              const mv = rankMove(t)
              return (
                <div
                  key={t.team_id}
                  className={'lb-row' + (Number(t.rank) === 1 && soleFirst ? ' rank1' : '')}
                >
                  <span className="lb-rank">{t.rank}</span>
                  <span className="lb-name">{t.name}</span>
                  {mv && <span className={'lb-move ' + mv.cls}>{mv.txt}</span>}
                  <span className="lb-eq num">₩ {num(t.equity)}</span>
                  <span className={'lb-pct num ' + dirOf(Number(t.pnl))}>
                    {pct(Number(t.pnl_pct))}
                    <span className="lb-pnl">{signed(Number(t.pnl))}</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
