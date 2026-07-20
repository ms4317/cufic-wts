import { useMemo } from 'react'
import { num, signed, pct, dirOf } from '../format'
import { positionPnl } from '../account'
import QtyStepper, { QtyRatios } from './QtyStepper'

/**
 * 주문서 패널. [잠정 설계 — UI 명세 미수령]
 *
 * 즉시 체결이 아니다. 종목별 매수량/매도량을 적어두면 강사가 라운드를 넘길 때
 * 그 라운드 가격으로 일괄 체결된다. 라운드 중에는 언제든 고칠 수 있다.
 *
 * @param {{stock_id, buy_qty, sell_qty}[]} sheet  현재 주문서 (서버에서 온 것)
 * @param {(next) => void} onDraftChange  화면상의 임시 수정
 * @param {() => void} onSave  서버에 저장
 */
export default function OrderSheet({
  stock,
  cash,
  sheet,
  draft,
  onDraftChange,
  onSave,
  onSelectStock,
  saving,
  locked,
  stocks,
  year,
}) {
  const line = draft[stock.code] ?? { buy_qty: 0, sell_qty: 0 }
  const buyQty = line.buy_qty ?? 0
  const sellQty = line.sell_qty ?? 0
  const pos = positionPnl(stock)

  // 지금 보유 중인 종목 — 주문서를 짜려면 무엇을 얼마에 갖고 있는지 봐야 한다.
  const held = useMemo(
    () =>
      stocks
        .filter((s) => s.holding > 0)
        .map((s) => ({ s, p: positionPnl(s) })),
    [stocks],
  )
  const holdingsValue = useMemo(() => held.reduce((sum, { s }) => sum + s.holding * s.price, 0), [held])

  // 주문서 전체의 자금 계산.
  // ⚠ 잠정 규칙: 같은 주문서의 매도 대금을 매수 자금으로 인정한다 (서버 order_funds_ok와 동일).
  const totals = useMemo(() => {
    let buyCost = 0
    let sellProceeds = 0
    let lines = 0
    for (const [code, l] of Object.entries(draft)) {
      const s = stocks.find((x) => x.code === code)
      if (!s || s.halted) continue
      const b = l.buy_qty ?? 0
      const sl = l.sell_qty ?? 0
      if (b === 0 && sl === 0) continue
      lines++
      buyCost += b * s.price
      sellProceeds += sl * s.price
    }
    return { buyCost, sellProceeds, lines, after: cash - buyCost + sellProceeds }
  }, [draft, stocks, cash])

  // 이 종목에 쓸 수 있는 돈 = 예수금 − 다른 종목에 이미 배정한 순매수 금액
  const otherNet = useMemo(() => {
    let net = 0
    for (const [code, l] of Object.entries(draft)) {
      if (code === stock.code) continue
      const s = stocks.find((x) => x.code === code)
      if (!s || s.halted) continue
      net += (l.buy_qty ?? 0) * s.price - (l.sell_qty ?? 0) * s.price
    }
    return net
  }, [draft, stocks, stock.code])

  const availableForThis = Math.max(0, cash - otherNet + sellQty * stock.price)
  const buyable = stock.halted ? 0 : Math.floor(availableForThis / stock.price)
  const sellable = stock.halted ? 0 : stock.holding

  const setLine = (patch) =>
    onDraftChange({ ...draft, [stock.code]: { ...line, ...patch } })

  const dirty = useMemo(() => {
    const cur = Object.fromEntries(
      sheet.map((l) => [l.stock_id, { buy_qty: l.buy_qty, sell_qty: l.sell_qty }]),
    )
    const clean = (o) =>
      Object.fromEntries(
        Object.entries(o)
          .filter(([, l]) => (l.buy_qty ?? 0) > 0 || (l.sell_qty ?? 0) > 0)
          .map(([k, l]) => [k, { buy_qty: l.buy_qty ?? 0, sell_qty: l.sell_qty ?? 0 }]),
      )
    return JSON.stringify(clean(cur)) !== JSON.stringify(clean(draft))
  }, [sheet, draft])

  const overBudget = totals.after < 0

  return (
    <aside className="col order">
      <div className="order-scroll">
        <div>
          {locked && (
            <div className="halted-note">
              <b>정산 중</b>
              <span>지금은 주문서를 고칠 수 없어요.</span>
            </div>
          )}
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
              <span className="avail">최대 {num(buyable)}주</span>
            </div>
            <QtyRatios max={buyable} onPick={(n) => setLine({ buy_qty: n })} maxLabel="최대" />
            <QtyStepper
              value={buyQty}
              onChange={(n) => setLine({ buy_qty: n })}
              max={buyable}
              label="매수 수량"
            />
            <div className="est">
              <span>예상 매수금액</span>
              <span className="num">₩ {num(buyQty * stock.price)}</span>
            </div>
          </div>

          {/* 매도 */}
          <div className="ordsec">
            <div className="cap">
              <span className="t down">매도</span>
              <span className="avail">보유 {num(stock.holding)}주</span>
            </div>

            {stock.holding > 0 && (
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

            <QtyRatios max={sellable} onPick={(n) => setLine({ sell_qty: n })} maxLabel="전량" />
            <QtyStepper
              value={sellQty}
              onChange={(n) => setLine({ sell_qty: n })}
              max={sellable}
              label="매도 수량"
              maxLabel="전량"
            />
            <div className="est">
              <span>예상 매도금액</span>
              <span className="num">₩ {num(sellQty * stock.price)}</span>
            </div>
          </div>

          {/* 보유종목 — 지금 무엇을 얼마에 갖고 있는지 */}
          <div className="ordsec holdings">
            <div className="cap">
              <span className="t">보유종목</span>
              <span className="avail">
                {held.length > 0 ? `평가 ₩ ${num(holdingsValue)}` : `${held.length}개`}
              </span>
            </div>

            {held.length === 0 ? (
              <p className="holdings-empty">
                아직 가진 종목이 없어요. 주문서에 매수를 담고 강사 선생님이 연도를 넘기면 보유하게 돼요.
              </p>
            ) : (
              <div className="hold-list">
                {held.map(({ s, p }) => (
                  <button
                    key={s.code}
                    className={'hold-row' + (s.code === stock.code ? ' on' : '')}
                    onClick={() => onSelectStock?.(s.code)}
                    title={`${s.name} 주문하기`}
                  >
                    <div className="hold-top">
                      <span className="hnm">{s.name}</span>
                      <span className="hval num">₩ {num(s.holding * s.price)}</span>
                    </div>
                    <div className="hold-bot">
                      <span className="hq num">
                        {num(s.holding)}주 · 평단 {num(s.avgPrice)}
                      </span>
                      <span className={'hpl num ' + dirOf(p.pnl)}>
                        {signed(p.pnl)} ({pct(p.pnlPct)})
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 저장 */}
          <div className="ordsec sheet-save">
            {overBudget && <p className="sheet-warn">예수금을 넘었어요. 수량을 줄여 주세요.</p>}

            <button
              className="act-btn buy"
              disabled={!dirty || overBudget || saving || locked}
              onClick={onSave}
            >
              {saving
                ? '저장 중…'
                : dirty
                  ? `주문서 저장${totals.lines ? ` (${totals.lines}종목)` : ''}`
                  : '저장됨'}
            </button>
            <p className="sheet-hint">
              강사 선생님이 다음 연도로 넘기면 이 주문서가 <b>{year}년 가격</b>으로 한꺼번에
              체결돼요. 그 전까지는 몇 번이든 고칠 수 있어요.
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
