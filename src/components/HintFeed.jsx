import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'

const IMPACT_LABEL = { up: '호재', down: '악재', flat: '중립' }
const GRADE_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4 }

/** 관련 종목. 실존 종목이면 눌러서 이동. */
function Related({ ids, stocks, onSelectStock }) {
  if (!ids?.length) return <b>전체 시장</b>
  return (
    <span className="rel-list">
      {ids.map((id, i) => {
        const s = stocks.find((x) => x.code === id)
        return (
          <span key={id}>
            {i > 0 && <span className="sep"> · </span>}
            {s ? (
              <button
                className="rel-link"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectStock(s.code)
                }}
              >
                {s.name}
              </button>
            ) : (
              <b>{id}</b>
            )}
          </span>
        )
      })}
    </span>
  )
}

/**
 * 힌트 피드. [잠정 설계 — UI 명세 미수령]
 *
 * 뉴스와 다르다: 강사가 조별로 차등 지급하므로 조마다 보이는 게 다르다.
 * 지급받은 게 없으면 그 사실을 알린다 — 빈 화면은 고장으로 읽힌다.
 */
export default function HintFeed({ hints, stocks, onSelectStock, focusId, onFocusHandled }) {
  const [open, setOpen] = useState(null)
  const [flash, setFlash] = useState(null)
  const cardRefs = useRef({})

  useEffect(() => {
    if (!focusId) return
    cardRefs.current[focusId]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
    setFlash(focusId)
    const t = setTimeout(() => {
      setFlash(null)
      onFocusHandled?.()
    }, 1400)
    return () => clearTimeout(t)
  }, [focusId, onFocusHandled])

  // 등급 높은 순 → 최근 순
  const sorted = [...hints].sort(
    (a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || b.id - a.id,
  )

  return (
    <section className="col news">
      <div className="nhead">
        <span className="ntitle">내 힌트</span>
        <span className="live">
          <span className="pulse" />
          LIVE
        </span>
        <span className="nhint">
          {hints.length > 0 ? '카드를 누르면 전문을 볼 수 있어요' : ''}
        </span>
      </div>

      <div className="ncards">
        {sorted.length === 0 && (
          <div className="hint-empty">
            아직 받은 힌트가 없어요. 강사 선생님이 힌트를 나눠주면 여기에 나타나요.
          </div>
        )}
        {sorted.map((h) => (
          <article
            key={h.id}
            ref={(el) => (cardRefs.current[h.id] = el)}
            className={'ncard' + (flash === h.id ? ' flash' : '')}
          >
            <button className="ncard-open" onClick={() => setOpen(h)}>
              <span className="meta">
                <span className={'grade g' + h.grade}>{h.grade}</span>
                <span>R{h.round}</span>
                <span className={'itag ' + h.impact}>{IMPACT_LABEL[h.impact]}</span>
              </span>
              <span className="head">{h.headline}</span>
            </button>
            <p className="rel">
              관련 종목:{' '}
              <Related ids={h.related_stock_ids} stocks={stocks} onSelectStock={onSelectStock} />
            </p>
          </article>
        ))}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title="힌트">
        {open && (
          <div className="ndetail">
            <div className="meta">
              <span className={'grade g' + open.grade}>{open.grade}</span>
              <span>ROUND {open.round}</span>
              <span className={'itag ' + open.impact}>{IMPACT_LABEL[open.impact]}</span>
            </div>
            <h3>{open.headline}</h3>
            <p className="rel">
              관련 종목:{' '}
              <Related
                ids={open.related_stock_ids}
                stocks={stocks}
                onSelectStock={(c) => {
                  onSelectStock(c)
                  setOpen(null)
                }}
              />
            </p>
          </div>
        )}
      </Modal>
    </section>
  )
}
