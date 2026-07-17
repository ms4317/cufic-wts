import { useCallback, useEffect, useRef, useState } from 'react'
import { num, signed, pct, dirOf } from '../format'
import { positionPnl } from '../account'
import QtyStepper, { QtyRatios } from './QtyStepper'

export default function OrderPanel({
  stock,
  cash,
  buyQty,
  setBuyQty,
  sellQty,
  setSellQty,
  onRequestOrder,
}) {
  const holding = stock.holding
  const pos = positionPnl(stock)

  // 거래정지 종목은 가격이 0이라 나눌 수 없다 — 주문가능 수량을 0으로 못박는다
  const buyable = stock.halted ? 0 : Math.floor(cash / stock.price)

  const canBuy = !stock.halted && buyQty > 0 && buyQty <= buyable
  const canSell = !stock.halted && sellQty > 0 && sellQty <= holding

  // 아래에 내용이 더 있을 때만 하단 페이드를 띄운다
  const scrollRef = useRef(null)
  const contentRef = useRef(null)
  const [showFade, setShowFade] = useState(false)

  const update = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollable = el.scrollHeight > el.clientHeight + 1
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2
    setShowFade(scrollable && !atBottom)
  }, [])

  // 패널 크기(창 높이)와 내용 높이(평단 박스 노출 등) 둘 다 감시해야 한다
  useEffect(() => {
    const el = scrollRef.current
    const content = contentRef.current
    if (!el || !content) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    ro.observe(content)
    return () => ro.disconnect()
  }, [update])

  return (
    <aside className="col order">
      <div className="order-scroll" ref={scrollRef} onScroll={update}>
        <div ref={contentRef}>
          {stock.halted && (
            <div className="halted-note">
              <b>거래정지</b>
              <span>이 종목은 지금 사고팔 수 없어요.</span>
            </div>
          )}

          {/* 매수 */}
          <div className="ordsec">
            <div className="cap">
              <span className="t up">매수</span>
              <span className="avail">주문가능 {num(buyable)}주</span>
            </div>

            <QtyRatios max={buyable} onPick={setBuyQty} maxLabel="최대" />
            <QtyStepper value={buyQty} onChange={setBuyQty} max={buyable} label="매수 수량" />

            <div className="est">
              <span>예상 체결금액</span>
              <span className="num">₩ {num(buyQty * stock.price)}</span>
            </div>
            <button
              className="act-btn buy"
              disabled={!canBuy}
              onClick={() => onRequestOrder('buy', buyQty)}
            >
              BUY
            </button>
          </div>

          {/* 매도 */}
          <div className="ordsec">
            <div className="cap">
              <span className="t down">매도</span>
              <span className="avail">보유 {num(holding)}주</span>
            </div>

            {/* 보유 중일 때만 평단·평가손익 노출 */}
            {holding > 0 && (
              <div className="posbox">
                <div className="r">
                  <span className="k">평균단가</span>
                  <span className="v num">₩ {num(stock.avgPrice)}</span>
                </div>
                <div className="r">
                  <span className="k">평가손익</span>
                  <span className={'v num ' + dirOf(pos.pnl)}>
                    {signed(pos.pnl)} ({pct(pos.pnlPct)})
                  </span>
                </div>
              </div>
            )}

            <QtyRatios max={stock.halted ? 0 : holding} onPick={setSellQty} maxLabel="전량" />
            <QtyStepper
              value={sellQty}
              onChange={setSellQty}
              max={stock.halted ? 0 : holding}
              label="매도 수량"
              maxLabel="전량"
            />

            <div className="est">
              <span>예상 체결금액</span>
              <span className="num">₩ {num(sellQty * stock.price)}</span>
            </div>
            <button
              className="act-btn sell"
              disabled={!canSell}
              onClick={() => onRequestOrder('sell', sellQty)}
            >
              SELL
            </button>
          </div>
        </div>
      </div>

      {showFade && (
        <div className="scroll-fade" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      )}
    </aside>
  )
}
