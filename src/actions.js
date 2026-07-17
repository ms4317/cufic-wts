// 상태를 바꾸는 동작을 한곳에 모은다.
//
// 화면(App.jsx)은 여기 있는 함수만 호출하고 setState를 직접 부르지 않는다.
// 나중에 Supabase(Postgres + Realtime)로 넘어갈 때 이 파일 '내부'만 갈아끼우면 된다:
//   - executeOrder → supabase.rpc('place_order', ...) 후 Realtime으로 상태 수신
//   - advanceRound → 운영자만 호출, 모든 조에 Realtime 브로드캐스트
//   - pushNews     → news 테이블 insert
//
// 그래서 지금부터 전부 async다. 지금은 즉시 resolve하지만, 서버가 붙어도
// 호출부(await)를 고칠 필요가 없다. 반환값은 {ok, error?} 형태로 통일해
// 서버가 거부하는 경우(잔고 부족·라운드 마감 등)를 나중에 그대로 표현할 수 있게 한다.

import { ROUNDS } from './data'
import { nowTime } from './format'

let newsSeq = 0
const nextNewsId = () => `ev${++newsSeq}`

const roundAt = (n) => ROUNDS.find((r) => r.round === n) ?? null

/**
 * @param {object} deps  상태 접근자. 서버 전환 시 이 안이 네트워크 호출로 바뀐다.
 * @param {() => object} deps.getState  { positions, cash, round, equity }
 * @param {object} deps.set  { positions, cash, history, news, round, roundLog }  각 setState
 * @param {(msg: string, tone?: string, onClick?: Function) => void} [deps.notify]
 * @param {(newsId: string) => void} [deps.focusNews]
 */
export function makeActions({ getState, set, notify, focusNews }) {
  /**
   * 주문 체결. 서버가 붙으면 여기서 검증도 서버가 한다.
   * @returns {Promise<{ok:true} | {ok:false, error:string}>}
   */
  async function executeOrder({ code, name, side, qty, price }) {
    const { positions, cash } = getState()
    const cur = positions[code] ?? { holding: 0, avgPrice: 0 }
    const amount = qty * price

    // 클라이언트 선검증. 서버가 붙어도 남긴다 — 왕복 전에 막는 게 빠르다.
    if (qty <= 0) return { ok: false, error: '수량을 입력해 주세요.' }
    if (price <= 0) return { ok: false, error: '거래가 정지된 종목입니다.' }
    if (side === 'buy' && amount > cash) return { ok: false, error: '주문가능 금액을 넘었습니다.' }
    if (side === 'sell' && qty > cur.holding) return { ok: false, error: '보유 수량을 넘었습니다.' }

    // 실현손익은 파는 순간에만 확정된다 — 그때의 평균단가가 필요하므로 여기서 기록한다.
    const realized = side === 'sell' ? Math.round((price - cur.avgPrice) * qty) : 0

    set.positions((prev) => {
      const p = prev[code] ?? { holding: 0, avgPrice: 0 }
      if (side === 'buy') {
        const holding = p.holding + qty
        // 평균단가 = 총 매수금액 / 총 매수수량
        const avgPrice = Math.round((p.holding * p.avgPrice + amount) / holding)
        return { ...prev, [code]: { holding, avgPrice } }
      }
      const holding = Math.max(0, p.holding - qty)
      return { ...prev, [code]: { holding, avgPrice: holding === 0 ? 0 : p.avgPrice } }
    })
    set.cash((c) => (side === 'buy' ? c - amount : c + amount))
    set.history((h) => [{ time: nowTime(), name, side, price, qty, amount, realized }, ...h])

    notify?.(
      side === 'buy' ? '매수 주문이 체결되었습니다' : '매도 주문이 체결되었습니다',
      side === 'buy' ? 'up' : 'down',
    )
    return { ok: true }
  }

  /** 라운드를 target으로 옮기며, 떠나는 라운드의 평가금액을 기록한다. */
  function goTo(target) {
    const { round, equity } = getState()
    set.roundLog((log) => ({ ...log, [round.round]: equity }))
    set.round(target)
  }

  /**
   * 다음 라운드로 진행 (운영자 전용).
   * 서버가 붙으면 여기가 모든 조에 브로드캐스트하는 지점이 된다.
   */
  async function advanceRound() {
    const next = roundAt(getState().round.round + 1)
    if (!next) {
      notify?.('마지막 라운드입니다', 'gold')
      return { ok: false, error: '마지막 라운드입니다.' }
    }
    goTo(next)
    return { ok: true }
  }

  /** 특정 라운드로 이동 (운영자 전용) */
  async function setRoundTo(round) {
    const target = roundAt(round)
    if (!target) return { ok: false, error: `ROUND ${round}은 없습니다.` }
    goTo(target)
    return { ok: true }
  }

  /**
   * 시황 뉴스 발동 (운영자 전용).
   * @param {{headline:string, impact?:'up'|'down'|'flat', related?:string[], time?:string, round?:number}} card
   */
  async function pushNews(card) {
    const id = nextNewsId()
    set.news((list) => [
      {
        id,
        round: card.round ?? getState().round.round,
        time:
          card.time ??
          new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        impact: card.impact ?? 'flat',
        headline: card.headline,
        related: card.related ?? ['전체 시장'],
      },
      ...list,
    ])
    // 차트를 보고 있는 학생은 하단 카드가 조용히 늘어난 걸 알아채지 못한다
    notify?.('새로운 시황 뉴스가 도착했어요', 'gold', () => focusNews?.(id))
    return { ok: true, id }
  }

  return { executeOrder, advanceRound, setRoundTo, pushNews, rounds: () => ROUNDS }
}
