import { useState } from 'react'
import Modal from './Modal'
import { num, signed, pct, dirOf } from '../format'
import { positionPnl } from '../account'

const TABS = [
  { key: 'holdings', label: '보유종목' },
  { key: 'history', label: '체결내역' },
  { key: 'returns', label: '수익률' },
]

/** 라운드별 자산 추이 라인 차트. points: [{label, equity}] */
function EquityChart({ points }) {
  const W = 660
  const H = 240
  // r: 마지막 "R3 · 2024" 라벨이 가운데 정렬로 밀려나도 잘리지 않을 만큼 확보
  const PAD = { t: 18, r: 40, b: 34, l: 76 }

  const values = points.map((p) => p.equity)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  // 전 구간이 같은 값이면(거래 전) 폭이 0이라 선이 바닥에 붙는다 — 최소 폭을 준다
  const pad = (hi - lo) * 0.25 || hi * 0.02
  const min = lo - pad
  const max = hi + pad

  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const x = (i) => PAD.l + (plotW * i) / Math.max(1, points.length - 1)
  const y = (v) => PAD.t + (1 - (v - min) / (max - min)) * plotH

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.equity).toFixed(1)}`).join(' ')
  const area = `${PAD.l},${PAD.t + plotH} ${line} ${PAD.l + plotW},${PAD.t + plotH}`
  const ticks = Array.from({ length: 4 }, (_, i) => min + ((max - min) * i) / 3)

  return (
    <div className="eqchart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="라운드별 자산 변화">
        {ticks.map((v, i) => (
          <g key={i}>
            <line className="eq-grid" x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} />
            <text className="eq-label" x={PAD.l - 8} y={y(v) + 3.5} textAnchor="end">
              {num(v / 10000)}만
            </text>
          </g>
        ))}

        <polygon className="eq-area" points={area} />
        <polyline className="eq-line" points={line} />

        {points.map((p, i) => (
          <g key={p.label}>
            <circle className="eq-dot" cx={x(i)} cy={y(p.equity)} r="4.5" />
            <text className="eq-label" x={x(i)} y={H - 12} textAnchor="middle">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function MyModal({ open, onClose, account, realized, stocks, history, rounds }) {
  const [tab, setTab] = useState('holdings')
  const held = stocks.filter((s) => s.holding > 0)
  const dir = dirOf(account.pnl)

  return (
    <Modal open={open} onClose={onClose} title="MY · 내 계좌" wide>
      <div className="sumbar">
        <div className="cell">
          <span className="k">평가금액</span>
          <span className="v num">₩ {num(account.equity)}</span>
        </div>
        <div className="cell">
          <span className="k">주문가능</span>
          <span className="v num">₩ {num(account.cash)}</span>
        </div>
        <div className="cell">
          <span className="k">총 손익</span>
          <span className={'v num ' + dir}>
            {signed(account.pnl)}
            <span style={{ fontSize: 12, marginLeft: 4 }}>({pct(account.pnlPct)})</span>
          </span>
        </div>
        {/* 아직 갖고 있는 것의 평가손익과 달리, 팔아서 확정된 돈 */}
        <div className="cell">
          <span className="k">실현손익 · 판 것에서 번 돈</span>
          <span className={'v num ' + dirOf(realized)}>{signed(realized)}</span>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'holdings' && (
        <table>
          <thead>
            <tr>
              <th>종목</th>
              <th>보유수량</th>
              <th>평균단가</th>
              <th>현재가</th>
              <th>평가손익</th>
            </tr>
          </thead>
          <tbody>
            {held.length === 0 && (
              <tr>
                <td colSpan="5" className="tbl-empty">
                  아직 보유한 종목이 없어요
                </td>
              </tr>
            )}
            {held.map((s) => {
              const p = positionPnl(s)
              const d = dirOf(p.pnl)
              return (
                <tr key={s.code}>
                  <td>
                    {s.name}
                    <div className="sub">{s.code}</div>
                  </td>
                  <td className="num">{num(s.holding)}</td>
                  <td className="num">{num(s.avgPrice)}</td>
                  <td className="num">{num(s.price)}</td>
                  <td className={'num ' + d}>
                    {signed(p.pnl)}
                    <div className="sub" style={{ color: 'inherit' }}>
                      {pct(p.pnlPct)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {tab === 'history' && (
        <table>
          <thead>
            <tr>
              <th>시간</th>
              <th>종목</th>
              <th>구분</th>
              <th>체결가</th>
              <th>수량</th>
              <th>체결금액</th>
              <th>실현손익</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan="7" className="tbl-empty">
                  아직 거래 내역이 없어요
                </td>
              </tr>
            )}
            {history.map((h, i) => (
              <tr key={i}>
                <td className="num">{h.time}</td>
                <td>{h.name}</td>
                <td>
                  <span className={'tag ' + (h.side === 'buy' ? 'b' : 's')}>
                    {h.side === 'buy' ? '매수' : '매도'}
                  </span>
                </td>
                <td className="num">{num(h.price)}</td>
                <td className="num">{num(h.qty)}</td>
                <td className="num">{num(h.amount)}</td>
                {/* 매수는 아직 손익이 확정되지 않았다 */}
                <td className={'num ' + (h.side === 'sell' ? dirOf(h.realized ?? 0) : '')}>
                  {h.side === 'sell' ? signed(h.realized ?? 0) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'returns' && <EquityChart points={rounds} />}
    </Modal>
  )
}
