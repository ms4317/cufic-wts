import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'

const IMPACT_LABEL = { up: '호재', down: '악재', flat: '중립' }

/** 관련 종목 목록. 실존 종목이면 눌러서 이동할 수 있게 버튼으로 낸다. */
function Related({ names, knownStocks, onSelectStock }) {
  return (
    <span className="rel-list">
      {names.map((n, i) => {
        const known = knownStocks.includes(n)
        return (
          <span key={n}>
            {i > 0 && <span className="sep"> · </span>}
            {known ? (
              <button
                className="rel-link"
                onClick={(e) => {
                  e.stopPropagation() // 카드 전체 클릭(전문 열기)과 겹치지 않게
                  onSelectStock(n)
                }}
              >
                {n}
              </button>
            ) : (
              <b>{n}</b>
            )}
          </span>
        )
      })}
    </span>
  )
}

/**
 * 시황 뉴스 카드 피드 (가로 스크롤).
 * news[0]이 최신이며 gold 테두리로 강조된다.
 *
 * @param {string|null} focusId  토스트를 눌렀을 때 스크롤해 보여줄 카드
 */
export default function NewsFeed({ news, knownStocks, onSelectStock, focusId, onFocusHandled }) {
  const [open, setOpen] = useState(null)
  const [flash, setFlash] = useState(null)
  const cardRefs = useRef({})

  // 토스트에서 넘어온 카드로 스크롤 + 잠깐 강조
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

  return (
    <section className="col news">
      <div className="nhead">
        <span className="ntitle">시황 뉴스</span>
        <span className="live">
          <span className="pulse" />
          LIVE
        </span>
        <span className="nhint">카드를 누르면 전문을 볼 수 있어요</span>
      </div>

      <div className="ncards">
        {news.map((n, i) => (
          <article
            key={n.id}
            ref={(el) => (cardRefs.current[n.id] = el)}
            className={'ncard' + (i === 0 ? ' latest' : '') + (flash === n.id ? ' flash' : '')}
          >
            {/* 카드 본문만 전문 열기 — 관련 종목 버튼은 따로 동작한다 */}
            <button className="ncard-open" onClick={() => setOpen(n)}>
              <span className="meta">
                <span>
                  R{n.round} · {n.time}
                </span>
                <span className={'itag ' + n.impact}>{IMPACT_LABEL[n.impact]}</span>
              </span>
              <span className="head">{n.headline}</span>
            </button>
            <p className="rel">
              관련 종목:{' '}
              <Related names={n.related} knownStocks={knownStocks} onSelectStock={onSelectStock} />
            </p>
          </article>
        ))}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title="시황 뉴스">
        {open && (
          <div className="ndetail">
            <div className="meta">
              <span>
                ROUND {open.round} · {open.time}
              </span>
              <span className={'itag ' + open.impact}>{IMPACT_LABEL[open.impact]}</span>
            </div>
            <h3>{open.headline}</h3>
            <p className="rel">
              관련 종목:{' '}
              <Related
                names={open.related}
                knownStocks={knownStocks}
                onSelectStock={(n) => {
                  onSelectStock(n)
                  setOpen(null) // 종목으로 이동했으니 모달은 닫는다
                }}
              />
            </p>
          </div>
        )}
      </Modal>
    </section>
  )
}
