import { Fragment, useState } from 'react'
import Modal from './Modal'
import { eok } from '../format'
import { FIN_YEARS } from '../data'
import { FIN_METRICS } from '../metrics'

export default function FinancialModal({ open, onClose, stock, round, financials }) {
  // 열려 있는 지표 설명. hover가 아니라 탭으로 여닫는다(터치 기기 대응).
  const [openMetric, setOpenMetric] = useState(null)

  if (!stock) return null

  const data = financials?.[stock.code]
  // 스포일러 방지: 현재 라운드 연도보다 미래 데이터는 노출하지 않는다
  const years = FIN_YEARS.filter((y) => y <= round.year)

  return (
    <Modal open={open} onClose={onClose} title={`${stock.name} 재무제표`} wide>
      {/* 숫자를 보기 전에 어떤 회사인지부터 */}
      {stock.desc && (
        <p className="fin-desc">
          <b>{stock.name}</b> — {stock.desc}
        </p>
      )}

      <p className="fin-note">
        단위: 매출액 · 영업이익 · 당기순이익 = 억원 / 부채비율 · ROE = % · {round.year}년까지 공시된 자료예요
        <br />
        <span className="down">파란 숫자(−)</span>는 적자(손해 본 것)예요.
      </p>

      {!data ? (
        <p className="fin-note">아직 등록된 재무 자료가 없어요.</p>
      ) : (
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
            {FIN_METRICS.map((m) => {
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
                    {years.map((y) => {
                      const v = data[y]?.[m.key]
                      if (v == null)
                        return (
                          <td key={y} className="num">
                            -
                          </td>
                        )
                      // 실적은 등락이 아니라 사실이므로 기본 텍스트색. 적자(음수)만 파랑으로 표시한다.
                      return (
                        <td key={y} className={'num' + (v < 0 ? ' down' : '')}>
                          {m.unit === '%' ? v.toFixed(1) : eok(v)}
                        </td>
                      )
                    })}
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
      )}

      <div className="glossary">
        <h3>용어 설명</h3>
        <dl>
          {FIN_METRICS.map((m) => (
            <div className="g" key={m.key}>
              <b>{m.label}</b> — {m.desc}
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  )
}
