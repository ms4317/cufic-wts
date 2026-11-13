import { useMemo, useState } from 'react'
import { num, pct, dirOf, arrowOf } from '../format'
import { movingAverage } from '../chart'
import { useSize } from '../useSize'
import DrawLayer from './DrawLayer'

const PAD = { t: 18, r: 66, b: 26, l: 14 }

// y축 눈금을 깔끔한 라운드 숫자로
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
  { key: 'pen', title: '펜 (자유 그리기)', icon: (<><path d="M12 19l7-7-4-4-7 7z" /><path d="M18 13l-1.5-6.5L21 5z" /></>) },
  { key: 'line', title: '추세선 (시작점·끝점 두 번 누르기)', icon: (<><path d="M4 20 20 4" /><circle cx="4" cy="20" r="2" fill="currentColor" stroke="none" /><circle cx="20" cy="4" r="2" fill="currentColor" stroke="none" /></>) },
  { key: 'eraser', title: '지우개', icon: (<><path d="M4 15l6 6h8" /><path d="M14 5l5 5-9 9-5-5z" /></>) },
]

// 기간: 월 / 년 두 가지만 (일·주 제거). 월봉 데이터 없으면 년만.
const TFS = [{ key: 'M', label: '월' }, { key: 'Y', label: '년' }]

export default function Chart({ stock, bars = [], year, onOpenFinancial, onOpenMarket, strokes, onStrokesChange }) {
  const [tool, setTool] = useState('cursor')
  const [tfWanted, setTfWanted] = useState('M')
  const [hover, setHover] = useState(null)
  const [plotRef, { w, h }] = useSize()

  const hasMonthly = bars.length > 0
  const tf = hasMonthly ? tfWanted : 'Y' // 월봉 없으면 항상 년(계단)
  const dir = dirOf(stock.chg)

  // 년 뷰: 공개된 연도(≤ 현재 라운드 연도)의 종가. 미래 연도는 절대 안 그린다.
  const yearPts = useMemo(() => {
    const ys = Object.keys(stock.prices || {})
      .map(Number)
      .filter((y) => Number.isFinite(y) && (year == null || y <= year))
      .sort((a, b) => a - b)
    return ys.map((y) => ({ year: y, c: Number(stock.prices[y]) || 0, label: `${y}년` }))
  }, [stock.prices, year])

  const isCandle = tf === 'M'
  const isStep = !hasMonthly // 월봉 없는 종목(예: 예금) = 연도 계단형 라인

  // 렌더 시리즈
  const series = useMemo(() => {
    if (isCandle)
      return bars.map((b) => ({
        o: b.open, h: b.high, l: b.low, c: b.close, up: b.close >= b.open,
        label: `${b.year}년 ${b.month}월`, yearStart: b.month === 1 ? b.year : null,
      }))
    return yearPts.map((p) => ({ c: p.c, label: p.label, yearStart: p.year }))
  }, [isCandle, bars, yearPts])

  // 12개월 이동평균 (월봉만)
  const ma = useMemo(
    () => (isCandle && bars.length ? movingAverage(bars.map((b) => ({ close: b.close })), 12) : []),
    [isCandle, bars],
  )

  const geom = useMemo(() => {
    if (!series.length) return null
    const vals = isCandle ? series.flatMap((c) => [c.h, c.l]) : series.map((c) => c.c)
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    if (stock.price > 0) { lo = Math.min(lo, stock.price); hi = Math.max(hi, stock.price) }
    const pad = (hi - lo) * 0.08 || hi * 0.02 || 1
    const min = lo - pad
    const max = hi + pad
    const plotW = Math.max(1, w - PAD.l - PAD.r)
    const plotH = Math.max(1, h - PAD.t - PAD.b)
    const step = plotW / series.length
    return {
      x: (i) => PAD.l + step * (i + 0.5),
      y: (v) => PAD.t + (1 - (v - min) / (max - min || 1)) * plotH,
      bodyW: Math.max(2, step * 0.6),
      ticks: niceTicks(min, max, 5),
    }
  }, [series, isCandle, w, h, stock.price])

  const ready = w > 0 && h > 0 && geom
  const tipData = hover != null ? series[hover] : null

  // 년 라인/계단 points
  const linePoints = !isCandle && geom
    ? isStep
      ? series
          .flatMap((c, i) => {
            const yv = geom.y(c.c).toFixed(1)
            const xa = geom.x(i).toFixed(1)
            const xb = (i < series.length - 1 ? geom.x(i + 1) : w - PAD.r).toFixed(1)
            return [`${xa},${yv}`, `${xb},${yv}`]
          })
          .join(' ')
      : series.map((c, i) => `${geom.x(i).toFixed(1)},${geom.y(c.c).toFixed(1)}`).join(' ')
    : ''

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
            <button className="fin" onClick={onOpenMarket} title="시황판 보기">📈 시황</button>
          )}
          <button className="fin" onClick={onOpenFinancial}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="7" /><rect x="12" y="6" width="3" height="11" /><rect x="17" y="13" width="3" height="4" />
            </svg>
            재무제표
          </button>
        </div>
      </div>

      <div className="draw">
        <div className="grp">
          {TOOLS.map((t) => (
            <button key={t.key} className={'tool' + (tool === t.key ? ' act' : '')} title={t.title} aria-label={t.title} aria-pressed={tool === t.key} onClick={() => setTool(t.key)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{t.icon}</svg>
            </button>
          ))}
        </div>
        <div className="tf">
          {TFS.filter((t) => hasMonthly || t.key === 'Y').map((t) => (
            <button key={t.key} className={tf === t.key ? 'on' : ''} onClick={() => setTfWanted(t.key)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="plot" ref={plotRef} onPointerLeave={() => setHover(null)}>
        {stock.preListed && <div className="plot-empty">아직 상장 전 종목이에요</div>}
        {!stock.preListed && (!series.length) && <div className="plot-empty">아직 공개된 시세가 없어요</div>}
        {stock.halted && series.length > 0 && <div className="halt-note">상장폐지 — 마지막 봉에서 정지</div>}

        {ready && !stock.preListed && series.length > 0 && (
          <svg viewBox={`0 0 ${w} ${h}`}>
            <g className="grid">
              {geom.ticks.map((v, i) => (<line key={i} x1={PAD.l} y1={geom.y(v)} x2={w - PAD.r} y2={geom.y(v)} />))}
            </g>
            <g className="axis">
              {geom.ticks.map((v, i) => (<text key={i} x={w - PAD.r + 8} y={geom.y(v) + 3.5}>{num(v)}</text>))}
            </g>
            <g className="xaxis">
              {series.map((c, i) => (c.yearStart != null ? (<text key={i} x={geom.x(i)} y={h - 8} textAnchor="middle">{c.yearStart}</text>) : null))}
            </g>

            {isCandle ? (
              <>
                {ma.length > 0 && (
                  <polyline className="ma" points={ma.map((v, i) => `${geom.x(i).toFixed(1)},${geom.y(v).toFixed(1)}`).join(' ')} />
                )}
                {series.map((c, i) => {
                  const cx = geom.x(i)
                  const top = geom.y(Math.max(c.o, c.c))
                  const bot = geom.y(Math.min(c.o, c.c))
                  return (
                    <g key={i} className={'candle ' + (c.up ? 'up' : 'down') + (hover === i ? ' hl' : '')} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
                      <line x1={cx} y1={geom.y(c.h)} x2={cx} y2={geom.y(c.l)} />
                      <rect x={cx - geom.bodyW / 2} y={top} width={geom.bodyW} height={Math.max(1, bot - top)} />
                    </g>
                  )
                })}
              </>
            ) : (
              <>
                <polyline className={'yline' + (isStep ? ' step' : '')} fill="none" points={linePoints} />
                {series.map((c, i) => (
                  <circle key={i} className={'ypt' + (hover === i ? ' hl' : '')} cx={geom.x(i)} cy={geom.y(c.c)} r={hover === i ? 4 : 2.6} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
                ))}
              </>
            )}

            {stock.price > 0 && (
              <line className={'nowline ' + dir} x1={PAD.l} y1={geom.y(stock.price)} x2={w - PAD.r} y2={geom.y(stock.price)} />
            )}
          </svg>
        )}

        {ready && tipData && (
          <div className="chart-tip" style={{ left: Math.max(4, Math.min(w - 172, geom.x(hover) + 8)), top: PAD.t + 2 }}>
            <b>{tipData.label}</b>
            {isCandle ? (
              <span>시 {num(tipData.o)} · 고 {num(tipData.h)} · 저 {num(tipData.l)} · 종 {num(tipData.c)}</span>
            ) : (
              <span>종가 {num(tipData.c)}</span>
            )}
          </div>
        )}

        {ready && <DrawLayer tool={tool} strokes={strokes} onChange={onStrokesChange} w={w} h={h} />}
      </div>
    </main>
  )
}
