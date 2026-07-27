import { num, pct, dirOf } from '../format'

export default function StockList({ stocks, selectedCode, onSelect, onOpenMy }) {
  return (
    <aside className="col stocklist">
      <div className="listhead">
        <span>종목명</span>
        <span>현재가 / 등락률</span>
      </div>

      <div className="rows">
        {/* 상장 예정(preListed) 종목은 아직 목록에 없다 — 상장 라운드에 나타난다 */}
        {stocks.filter((s) => !s.preListed).map((s) => {
          const dir = dirOf(s.chg)
          return (
            <div
              key={s.code}
              className={'row' + (s.code === selectedCode ? ' on' : '')}
              onClick={() => onSelect(s.code)}
            >
              <div>
                <div className="nm">{s.name}</div>
                <div className="code">
                  {s.code}
                  {s.holding > 0 && ` · ${s.holding}주 보유`}
                </div>
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
