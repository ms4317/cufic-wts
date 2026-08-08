import { useState } from 'react'
import { num, pct, dirOf } from '../format'

// 종목 정렬 옵션. '기본'은 등록 순서(display_order)를 그대로 둔다.
const SORTS = [
  { key: 'default', label: '기본순' },
  { key: 'name', label: '이름순' },
  { key: 'price_desc', label: '가격 높은순' },
  { key: 'price_asc', label: '가격 낮은순' },
  { key: 'chg_desc', label: '등락률 높은순' },
  { key: 'chg_asc', label: '등락률 낮은순' },
]

export default function StockList({ stocks, selectedCode, onSelect, onOpenMy }) {
  const [sort, setSort] = useState('default')

  // 상장 예정(preListed) 종목은 아직 목록에 없다 — 상장 라운드에 나타난다
  const rows = stocks.filter((s) => !s.preListed)
  if (sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  else if (sort === 'price_desc') rows.sort((a, b) => b.price - a.price)
  else if (sort === 'price_asc') rows.sort((a, b) => a.price - b.price)
  else if (sort === 'chg_desc') rows.sort((a, b) => b.chg - a.chg)
  else if (sort === 'chg_asc') rows.sort((a, b) => a.chg - b.chg)
  // default → filter가 유지한 등록 순서 그대로

  return (
    <aside className="col stocklist">
      <div className="listhead">
        <span>종목명</span>
        <select
          className="sort-sel"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="종목 정렬"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rows">
        {rows.map((s) => {
          const dir = dirOf(s.chg)
          return (
            <div
              key={s.code}
              className={'row' + (s.code === selectedCode ? ' on' : '')}
              onClick={() => onSelect(s.code)}
            >
              <div>
                <div className="nm">{s.name}</div>
                {s.holding > 0 && <div className="code">{s.holding}주 보유</div>}
              </div>
              <div className="pr">
                {s.halted ? (
                  <div className="halted-tag">거래정지</div>
                ) : (
                  <>
                    <div className={'price num ' + dir}>{num(s.price)}</div>
                    <div className={'chg num ' + dir}>{pct(s.chg)}</div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button className="mybtn" onClick={onOpenMy}>
        MY · 내 계좌 / 보유종목
      </button>
    </aside>
  )
}
