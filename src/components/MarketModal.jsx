import { Fragment, useState } from 'react'
import Modal from './Modal'
import { num } from '../format'
import { MACRO, MACRO_METRICS, FIN_YEARS } from '../data'

/**
 * 시황판 — 연도별 거시경제 지표(금리·GDP·실업률·환율·물가·유가).
 * 재무제표처럼 현재 라운드 연도까지만 공개한다(미래 스포일러 차단).
 * 가격을 직접 움직이진 않지만, 학생이 재무제표·힌트와 함께 판단하는 '배경'이다.
 */
export default function MarketModal({ open, onClose, round }) {
  const [openMetric, setOpenMetric] = useState(null)

  const years = FIN_YEARS.filter((y) => y <= round.year)
  const cur = MACRO[round.year]
  const fmt = (m, v) => (v == null ? '-' : m.unit === '%' ? v.toFixed(1) : num(v))

  return (
    <Modal open={open} onClose={onClose} title="시황판 · 거시경제" wide>
      {cur?.summary && (
        <p className="fin-desc">
          <b>{round.year}년</b> — {cur.summary}
        </p>
      )}

      <p className="fin-note">
        금리·GDP·실업률·물가 = % / 환율 = 원/$ / 유가 = $ · {round.year}년까지 공개돼요. 지표는 종목
        판단의 <b>배경</b>이에요 — 재무제표·힌트와 함께 살펴보세요.
      </p>

      <table>
        <thead>
          <tr>
            <th>지표 (눌러서 설명 보기)</th>
            {years.map((y) => (
              <th key={y}>{y}년</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MACRO_METRICS.map((m) => {
            const expanded = openMetric === m.key
            return (
              <Fragment key={m.key}>
                <tr>
                  <td>
                    <button
                      className="metric-btn"
                      aria-expanded={expanded}
                      onClick={() => setOpenMetric(expanded ? null : m.key)}
                    >
                      {m.label}
                      <span className="help" aria-hidden="true">
                        ?
                      </span>
                    </button>
                    <div className="sub">{m.unit}</div>
                  </td>
                  {years.map((y) => (
                    <td key={y} className="num">
                      {fmt(m, MACRO[y]?.[m.key])}
                    </td>
                  ))}
                </tr>
                {expanded && (
                  <tr className="desc-row">
                    <td colSpan={years.length + 1}>{m.desc}</td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>

      <div className="glossary">
        <h3>용어 설명</h3>
        <dl>
          {MACRO_METRICS.map((m) => (
            <div className="g" key={m.key}>
              <b>{m.label}</b> — {m.desc}
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  )
}
