import { useMemo, useState } from 'react'
import { num, pct, dirOf, arrowOf } from '../format'
import { candleSeries, movingAverage, TIMEFRAMES } from '../chart'
import { useSize } from '../useSize'
import DrawLayer from './DrawLayer'

const PAD = { t: 18, r: 66, b: 18, l: 14 }

// y축 눈금을 깔끔한 라운드 숫자로 (1,511 대신 1,500·2,000 …). 자릿수에 맞춰 간격을 고른다.
const niceTicks = (min, max, count = 5) => {
  const range = max - min || 1
  const raw = range / (count - 1)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / mag
  const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag
  const out = []
  for (let v = Math.ceil(min / step) * step; v <= max + step * 0.001; v += step) out.push(v)
  return out
}

// 그림판 도구: 커서 · 펜 · 추세선 · 지우개
const TOOLS = [
  { key: 'cursor', title: '커서', icon: <path d="M4 2l7 18 2.5-7L20 11z" fill="currentColor" /> },
  {
    key: 'pen',
    title: '펜 (자유 그리기)',
    icon: (
      <>
        <path d="M12 19l7-7-4-4-7 7z" />
        <path d="M18 13l-1.5-6.5L21 5z" />
      </>
    ),
  },
  {
    key: 'line',
    title: '추세선 (시작점·끝점 두 번 누르기)',
    icon: (
      <>
        <path d="M4 20 20 4" />
        <circle cx="4" cy="20" r="2" fill="currentColor" stroke="none" />
        <circle cx="20" cy="4" r="2" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    key: 'eraser',
    title: '지우개',
    icon: (
      <>
        <path d="M4 15l6 6h8" />
        <path d="M14 5l5 5-9 9-5-5z" />
      </>
    ),
  },
]

export default function Chart({ stock, onOpenFinancial, onOpenMarket, strokes, onStrokesChange }) {
  const [tool, setTool] = useState('cursor')
  const [tf, setTf] = useState('W')
  const [plotRef, { w, h }] = useSize()

  const dir = dirOf(stock.chg)

  // 종목·시세·봉주기가 바뀔 때만 다시 생성.
  // 지난 라운드 종가(= 현재가 - 등락폭)에서 출발해야 차트가 실제 등락과 같은 방향을 가리킨다.
  const { candles, ma } = useMemo(() => {
    const list = candleSeries(stock.code, stock.price, stock.price - stock.delta, tf)
    return { candles: list, ma: movingAverage(list, 5) }
  }, [stock.code, stock.price, stock.delta, tf])

  // 데이터 범위에서 y 스케일을 잡는다 (좌표 하드코딩 없음)
  const geom = useMemo(() => {
    const lo = Math.min(...candles.map((c) => c.low))
    const hi = Math.max(...candles.map((c) => c.high))
    const pad = (hi - lo) * 0.08 || hi * 0.02
    const min = lo - pad
    const max = hi + pad

    const plotW = Math.max(1, w - PAD.l - PAD.r)
    const plotH = Math.max(1, h - PAD.t - PAD.b)
    const step = plotW / candles.length

    return {
      x: (i) => PAD.l + step * (i + 0.5),
      y: (v) => PAD.t + (1 - (v - min) / (max - min)) * plotH,
      bodyW: Math.max(3, step * 0.58),
      ticks: niceTicks(min, max, 5),
    }
  }, [candles, w, h])

  const { x, y, bodyW, ticks } = geom
  const ready = w > 0 && h > 0
  const maPoints = ma.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  return (
    <main className="col chart">
      <div className="top">
        <span className="name">{stock.name}</span>
        <span className="code2">{stock.market}</span>
        {stock.halted ? (
          <span className="halted-tag big">거래정지</span>
        ) : (
          <>
            <span className={'now num ' + dir}>{num(stock.price)}</span>
            <span className={'delta num ' + dir}>
              {arrowOf(stock.chg)} {num(Math.abs(stock.delta))}
              <br />
              {pct(stock.chg)}
            </span>
          </>
        )}
        <div className="chart-tools">
          {onOpenMarket && (
            <button className="fin" onClick={onOpenMarket} title="시황판 보기">
              📈 시황
            </button>
          )}
          <button className="fin" onClick={onOpenFinancial}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <rect x="7" y="10" width="3" height="7" />
              <rect x="12" y="6" width="3" height="11" />
              <rect x="17" y="13" width="3" height="4" />
            </svg>
            재무제표
          </button>
        </div>
      </div>

      <div className="draw">
        <div className="grp">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              className={'tool' + (tool === t.key ? ' act' : '')}
              title={t.title}
              aria-label={t.title}
              aria-pressed={tool === t.key}
              onClick={() => setTool(t.key)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {t.icon}
              </svg>
            </button>
          ))}
        </div>

        <div className="tf">
          {TIMEFRAMES.map((t) => (
            <button key={t.key} className={tf === t.key ? 'on' : ''} onClick={() => setTf(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* viewBox를 실측 픽셀에 1:1로 맞춰 글자 왜곡을 막는다 */}
      <div className="plot" ref={plotRef}>
        {stock.halted && <div className="plot-empty">거래가 정지된 종목이라 차트가 없어요</div>}
        {ready && !stock.halted && (
          <svg viewBox={`0 0 ${w} ${h}`}>
            <g className="grid">
              {ticks.map((v, i) => (
                <line key={i} x1={PAD.l} y1={y(v)} x2={w - PAD.r} y2={y(v)} />
              ))}
            </g>
            <g className="axis">
              {ticks.map((v, i) => (
                <text key={i} x={w - PAD.r + 8} y={y(v) + 3.5}>
                  {num(v)}
                </text>
              ))}
            </g>

            <polyline className="ma" points={maPoints} />

            {candles.map((c, i) => {
              const cx = x(i)
              const top = y(Math.max(c.open, c.close))
              const bottom = y(Math.min(c.open, c.close))
              return (
                <g key={i} className={'candle ' + (c.up ? 'up' : 'down')}>
                  <line x1={cx} y1={y(c.high)} x2={cx} y2={y(c.low)} />
                  <rect x={cx - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bottom - top)} />
                </g>
              )
            })}

            <line
              className={'nowline ' + dir}
              x1={PAD.l}
              y1={y(stock.price)}
              x2={w - PAD.r}
              y2={y(stock.price)}
            />
          </svg>
        )}

        {ready && (
          <DrawLayer tool={tool} strokes={strokes} onChange={onStrokesChange} w={w} h={h} />
        )}
      </div>
    </main>
  )
}
