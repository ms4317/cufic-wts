import { useMemo } from 'react'
import Modal from './Modal'
import { num, signed, pct, dirOf } from '../format'

/**
 * 라운드 전환 요약. 라운드제 게임의 하이라이트 순간이므로 반드시 알린다 —
 * 조용히 12종목 가격만 바뀌면 학생은 무슨 일이 일어났는지 알 수 없다.
 *
 * @param {{round:number, year:number}|null} round  null이면 닫힘
 * @param {number|null} prevEquity  직전 라운드를 떠날 때의 평가금액. 이번 전환으로
 *   내 자산이 얼마나 움직였는지 보여주는 기준. 없으면(첫 전환 등) 원금 대비로 대체.
 */
export default function RoundModal({ round, account, stocks, prevEquity, ended = false, onClose }) {
  // 시장 전체가 아니라 '내가 들고 있는' 종목의 등락을 보여준다 —
  // 안 산 종목이 올랐다는 정보는 이 순간 학생에게 의미가 없다.
  const { best, worst } = useMemo(() => {
    const mine = stocks.filter((s) => s.holding > 0 && !s.halted)
    if (!mine.length) return { best: null, worst: null }
    const sorted = [...mine].sort((a, b) => b.chg - a.chg)
    return { best: sorted[0], worst: sorted.length > 1 ? sorted[sorted.length - 1] : null }
  }, [stocks])

  if (!round) return null

  // 종료 시엔 원금 대비 총 수익률을 헤드라인으로 (최종 성적). 라운드 전환은 그 라운드 변동을.
  const changed = prevEquity != null && !ended
  const delta = ended ? account.pnl : changed ? account.equity - prevEquity : account.pnl
  const deltaPct = ended
    ? account.pnlPct
    : changed
      ? prevEquity
        ? (delta / prevEquity) * 100
        : 0
      : account.pnlPct

  return (
    <Modal open onClose={onClose} title={ended ? '🏁 최종 정산' : `ROUND ${round.round}`}>
      <div className="rsum">
        <p className="year">
          {ended ? `${round.year}년 가격으로 최종 정산했어요` : `${round.year}년이 되었습니다`}
        </p>
        <p className="sub">
          {ended
            ? '대회가 끝났어요! 상단 순위 배지를 눌러 최종 순위를 확인하세요.'
            : '주가가 새로 바뀌었어요. 내 자산이 어떻게 됐는지 확인해 보세요.'}
        </p>

        <div className="eqbox">
          <span className="k">{ended ? '내 최종 자산' : '내 평가금액'}</span>
          <span className="v num">₩ {num(account.equity)}</span>
          <span className={'d num ' + dirOf(delta)}>
            {ended ? '원금 대비 ' : changed ? '이번 라운드 ' : '원금 대비 '}
            {signed(delta)} ({pct(deltaPct)})
          </span>
        </div>

        {best ? (
          <div className="movers">
            <div className="mover">
              <span className="cap">내 종목 중 최고 상승</span>
              <span className="nm">{best.name}</span>
              <span className={'ch num ' + dirOf(best.chg)}>{pct(best.chg)}</span>
            </div>
            {worst && (
              <div className="mover">
                <span className="cap">내 종목 중 최대 하락</span>
                <span className="nm">{worst.name}</span>
                <span className={'ch num ' + dirOf(worst.chg)}>{pct(worst.chg)}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="nohold">
            아직 보유한 종목이 없어요. 뉴스와 재무제표를 보고 종목을 골라보세요.
          </p>
        )}
      </div>

      <div className="mfoot">
        <button className="act-btn buy" onClick={onClose} autoFocus>
          확인
        </button>
      </div>
    </Modal>
  )
}
