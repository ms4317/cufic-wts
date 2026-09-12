import Modal from './Modal'
import { ROUNDS } from '../data'

const GRADE_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4 }
// 라운드 → 연도. 힌트 카드에 "R2 · 2021년"으로 언제 것인지 보여준다.
const YEAR_OF = Object.fromEntries(ROUNDS.map((r) => [r.round, r.year]))
// 호재/악재(방향)도, 관련 종목도 일부러 표시하지 않는다 —
// 힌트 글과 재무제표·시황을 보고 "어느 종목인지 · 오를지 내릴지"를 학생이 직접 판단하는 게 학습 목표.
// (related_stock_ids는 데이터에 남아 호재/악재↔가격 정합 검증에만 쓰인다.)

/**
 * 힌트 팝업. 헤더의 힌트 버튼으로 연다.
 * 강사가 조별로 차등 지급하므로 조마다 보이는 게 다르다. 지급받은 게 없으면 그 사실을 알린다.
 */
export default function HintModal({ open, onClose, hints }) {
  // 정렬 우선순위: 라운드(연도) 최신 먼저 → 같은 라운드 안에서 등급 S→D → id.
  const sorted = [...hints].sort(
    (a, b) => b.round - a.round || GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || b.id - a.id,
  )

  return (
    <Modal open={open} onClose={onClose} title="내 힌트" wide>
      {sorted.length === 0 ? (
        <p className="hint-empty">
          아직 받은 힌트가 없어요. 강사 선생님이 힌트를 나눠주면 여기에 나타나요.
        </p>
      ) : (
        <div className="hint-cards">
          {sorted.map((h) => (
            <article key={h.id} className="hint-card">
              <div className="meta">
                <span className={'grade g' + h.grade}>{h.grade}</span>
                <span className="rnd">R{h.round}{YEAR_OF[h.round] ? ` · ${YEAR_OF[h.round]}년` : ''}</span>
              </div>
              <p className="head">{h.headline}</p>
            </article>
          ))}
        </div>
      )}
    </Modal>
  )
}
