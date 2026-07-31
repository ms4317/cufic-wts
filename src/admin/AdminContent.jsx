import { useMemo, useState } from 'react'
import { errorText } from '../supabase'
import { FIN_METRICS, MACRO_METRICS } from '../data'

// 게임에 등장하는 연도 = 라운드 연도 + 최종 연도
const yearsOf = (game) => {
  if (!game) return []
  const ys = new Set(Object.values(game.round_year_map ?? {}).map(Number))
  if (game.final_year != null) ys.add(Number(game.final_year))
  return [...ys].sort((a, b) => a - b)
}

function MacroRow({ year, row, onSave, busy }) {
  const [d, setD] = useState({
    summary: row?.summary ?? '',
    rate: row?.rate ?? '',
    gdp: row?.gdp ?? '',
    unemployment: row?.unemployment ?? '',
    fx: row?.fx ?? '',
    cpi: row?.cpi ?? '',
    oil: row?.oil ?? '',
  })
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }))
  return (
    <div className="content-row">
      <span className="cr-year">{year}년</span>
      <input
        className="cr-summary"
        value={d.summary}
        onChange={(e) => set('summary', e.target.value)}
        placeholder="한 줄 시황"
      />
      {MACRO_METRICS.map((m) => (
        <input
          key={m.key}
          className="cr-num num"
          type="number"
          step="any"
          value={d[m.key]}
          onChange={(e) => set(m.key, e.target.value)}
          title={`${m.label} (${m.unit})`}
          placeholder={m.label}
        />
      ))}
      <button className="act-btn buy sm" disabled={busy} onClick={() => onSave(year, d)}>
        저장
      </button>
    </div>
  )
}

function FinRow({ stockId, year, row, onSave, onDelete, busy }) {
  const [d, setD] = useState({
    revenue: row?.revenue ?? '',
    opIncome: row?.op_income ?? '',
    netIncome: row?.net_income ?? '',
    debtRatio: row?.debt_ratio ?? '',
    roe: row?.roe ?? '',
  })
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }))
  const empty = Object.values(d).every((v) => v === '' || v == null)
  return (
    <div className="content-row">
      <span className="cr-year">{year}년</span>
      {FIN_METRICS.map((m) => (
        <input
          key={m.key}
          className="cr-num num"
          type="number"
          step="any"
          value={d[m.key]}
          onChange={(e) => set(m.key, e.target.value)}
          title={`${m.label} (${m.unit})`}
          placeholder={m.label}
        />
      ))}
      <button className="act-btn buy sm" disabled={busy || empty} onClick={() => onSave(stockId, year, d)}>
        저장
      </button>
      <button
        className="text-btn danger tiny"
        disabled={busy || !row}
        onClick={() => onDelete(stockId, year)}
        title="이 해를 미상장/폐지로(행 삭제)"
      >
        비움
      </button>
    </div>
  )
}

/**
 * 재무제표·시황 편집 (콘텐츠 B, Phase 1b).
 * DB의 financials·macro를 관리자 화면에서 직접 고친다. 저장하면 content_changed 신호로
 * 학생 화면이 새 값을 받는다.
 */
export default function AdminContent({ actions, game, stocks, financials, macro, refresh, notify }) {
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState('')

  const years = useMemo(() => yearsOf(game), [game])
  const macroByYear = useMemo(
    () => Object.fromEntries((macro ?? []).map((r) => [Number(r.year), r])),
    [macro],
  )
  const finByKey = useMemo(
    () => Object.fromEntries((financials ?? []).map((r) => [`${r.stock_id}_${r.year}`, r])),
    [financials],
  )
  const stockId = sel || stocks[0]?.id || ''

  const saveMacro = async (year, d) => {
    setBusy(true)
    const r = await actions.upsertMacro({
      year,
      summary: d.summary,
      rate: Number(d.rate),
      gdp: Number(d.gdp),
      unemployment: Number(d.unemployment),
      fx: Math.round(Number(d.fx)),
      cpi: Number(d.cpi),
      oil: Math.round(Number(d.oil)),
    })
    setBusy(false)
    if (!r.ok) return notify(errorText(r.error), 'down')
    notify(`${year}년 시황 저장했어요`, 'gold')
    await refresh()
  }

  const saveFin = async (sid, year, d) => {
    setBusy(true)
    const r = await actions.upsertFinancial({
      stockId: sid,
      year,
      revenue: Math.round(Number(d.revenue)),
      opIncome: Math.round(Number(d.opIncome)),
      netIncome: Math.round(Number(d.netIncome)),
      debtRatio: Number(d.debtRatio),
      roe: Number(d.roe),
    })
    setBusy(false)
    if (!r.ok) return notify(errorText(r.error), 'down')
    notify(`${year}년 재무 저장했어요`, 'gold')
    await refresh()
  }

  const delFin = async (sid, year) => {
    setBusy(true)
    const r = await actions.deleteFinancial(sid, year)
    setBusy(false)
    if (!r.ok) return notify(errorText(r.error), 'down')
    notify(`${year}년 재무를 비웠어요`, 'gold')
    await refresh()
  }

  if (!game) return null

  return (
    <div className="apanel">
      <p className="anote">
        재무제표·시황은 이제 DB에 있어요. 여기서 고치면 <b>재배포 없이</b> 학생 화면에 바로 반영됩니다.
        (⚠ 힌트의 호재·악재가 실제 등락과 맞는지 검증은 아직 자동으로 안 걸려요 — 신중히.)
      </p>

      {/* ── 시황 */}
      <section className="acard">
        <span className="acap">시황 (거시경제) · 연도별</span>
        <div className="content-head">
          <span className="cr-year">연도</span>
          <span className="cr-summary">한 줄 시황</span>
          {MACRO_METRICS.map((m) => (
            <span key={m.key} className="cr-num">
              {m.label}
            </span>
          ))}
          <span className="sm-sp" />
        </div>
        {years.map((y) => (
          <MacroRow key={y} year={y} row={macroByYear[y]} onSave={saveMacro} busy={busy} />
        ))}
      </section>

      {/* ── 재무제표 */}
      <section className="acard">
        <span className="acap">재무제표 · 종목별</span>
        <div className="fin-pick">
          <label>
            종목{' '}
            <select value={stockId} onChange={(e) => setSel(e.target.value)}>
              {stocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </label>
          <span className="anote">단위: 매출·영업이익·순이익 = 억원(적자 음수) / 부채비율·ROE = %</span>
        </div>
        <div className="content-head">
          <span className="cr-year">연도</span>
          {FIN_METRICS.map((m) => (
            <span key={m.key} className="cr-num">
              {m.label}
            </span>
          ))}
          <span className="sm-sp" />
        </div>
        {years.map((y) => (
          <FinRow
            key={`${stockId}_${y}`}
            stockId={stockId}
            year={y}
            row={finByKey[`${stockId}_${y}`]}
            onSave={saveFin}
            onDelete={delFin}
            busy={busy}
          />
        ))}
      </section>
    </div>
  )
}
