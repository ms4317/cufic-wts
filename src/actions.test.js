import { describe, it, expect, beforeEach } from 'vitest'
import { makeActions } from './actions'

// 주문 체결과 한도. 서버(Supabase)로 옮겨도 이 규칙은 그대로 지켜져야 한다.

const PRICE = 50_000

/** setState 대신 평범한 객체를 물려 actions를 돌린다 */
function harness(initial = {}) {
  const state = {
    positions: {},
    cash: 1_000_000,
    history: [],
    news: [],
    round: { round: 1, year: 2022 },
    roundLog: {},
    ...initial,
  }
  const apply = (key) => (updater) => {
    state[key] = typeof updater === 'function' ? updater(state[key]) : updater
  }
  const toasts = []
  const actions = makeActions({
    getState: () => ({ ...state, equity: state.cash }),
    set: {
      positions: apply('positions'),
      cash: apply('cash'),
      history: apply('history'),
      news: apply('news'),
      round: apply('round'),
      roundLog: apply('roundLog'),
    },
    notify: (m, tone) => toasts.push({ m, tone }),
  })
  const buy = (qty, price = PRICE) =>
    actions.executeOrder({ code: 'A', name: '가나전자', side: 'buy', qty, price })
  const sell = (qty, price = PRICE) =>
    actions.executeOrder({ code: 'A', name: '가나전자', side: 'sell', qty, price })
  return { state, actions, toasts, buy, sell, pos: () => state.positions.A ?? { holding: 0, avgPrice: 0 } }
}

describe('매수 한도', () => {
  it('예수금으로 살 수 있는 최대치까지는 통과한다', async () => {
    const h = harness({ cash: 1_000_000 })
    // floor(1,000,000 / 50,000) = 20주
    expect((await h.buy(20)).ok).toBe(true)
    expect(h.state.cash).toBe(0)
  })

  it('예수금을 넘는 매수는 거부한다', async () => {
    const h = harness({ cash: 1_000_000 })
    const r = await h.buy(21)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/주문가능/)
    expect(h.state.cash).toBe(1_000_000) // 상태가 바뀌지 않아야 한다
    expect(h.pos().holding).toBe(0)
  })

  it('수량 0은 거부한다', async () => {
    const h = harness()
    expect((await h.buy(0)).ok).toBe(false)
  })
})

describe('매도 한도 — 공매도 차단', () => {
  it('보유 수량까지는 팔 수 있다', async () => {
    const h = harness()
    await h.buy(10)
    expect((await h.sell(10)).ok).toBe(true)
    expect(h.pos().holding).toBe(0)
  })

  it('보유보다 많이 파는 것은 거부한다 (공매도 불가)', async () => {
    const h = harness()
    await h.buy(10)
    const r = await h.sell(11)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/보유 수량/)
    expect(h.pos().holding).toBe(10)
  })

  it('보유가 없으면 아무것도 팔 수 없다', async () => {
    const h = harness()
    expect((await h.sell(1)).ok).toBe(false)
  })
})

describe('거래정지(가격 0) 종목', () => {
  it('매수를 차단한다 — 0으로 나누는 계산이 생기지 않는다', async () => {
    const h = harness()
    const r = await h.buy(10, 0)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/거래가 정지/)
    expect(h.state.cash).toBe(1_000_000)
  })

  it('매도도 차단한다', async () => {
    const h = harness({ positions: { A: { holding: 10, avgPrice: 50_000 } } })
    expect((await h.sell(5, 0)).ok).toBe(false)
  })
})

describe('평균단가 재계산', () => {
  it('추가 매수하면 가중평균으로 다시 잡힌다', async () => {
    const h = harness({ cash: 100_000_000 })
    await h.buy(35, 66_800)
    expect(h.pos().avgPrice).toBe(66_800)
    await h.buy(10, 74_450)
    // (35×66,800 + 10×74,450) / 45 = 68,500
    expect(h.pos()).toEqual({ holding: 45, avgPrice: 68_500 })
  })

  it('일부만 팔면 평균단가는 그대로다', async () => {
    const h = harness({ cash: 100_000_000 })
    await h.buy(100, 55_300)
    await h.sell(40, 78_500)
    expect(h.pos()).toEqual({ holding: 60, avgPrice: 55_300 })
  })

  it('전량 매도하면 평균단가가 0으로 리셋된다', async () => {
    const h = harness({ cash: 100_000_000 })
    await h.buy(100, 55_300)
    await h.sell(100, 78_500)
    expect(h.pos()).toEqual({ holding: 0, avgPrice: 0 })
  })
})

describe('실현손익', () => {
  it('매도 시점의 평균단가로 확정해 체결내역에 남긴다', async () => {
    const h = harness({ cash: 100_000_000 })
    await h.buy(100, 55_300)
    await h.sell(100, 78_500)
    expect(h.state.history[0].realized).toBe(100 * (78_500 - 55_300))
  })

  it('매수에는 실현손익이 없다 (아직 확정되지 않음)', async () => {
    const h = harness({ cash: 100_000_000 })
    await h.buy(10, 55_300)
    expect(h.state.history[0].realized).toBe(0)
  })

  it('손해를 보고 팔면 음수다', async () => {
    const h = harness({ cash: 100_000_000 })
    await h.buy(10, 60_000)
    await h.sell(10, 50_000)
    expect(h.state.history[0].realized).toBe(-100_000)
  })

  it('추가 매수 후 팔면 가중평균 기준으로 계산된다', async () => {
    const h = harness({ cash: 100_000_000 })
    await h.buy(35, 66_800)
    await h.buy(10, 74_450) // 평단 68,500
    await h.sell(45, 70_000)
    expect(h.state.history[0].realized).toBe(45 * (70_000 - 68_500))
  })
})

describe('예수금 정합성', () => {
  it('예수금 = 원금 - 매수합 + 매도합', async () => {
    const PRINCIPAL = 100_000_000
    const h = harness({ cash: PRINCIPAL })
    await h.buy(300, 74_200)
    await h.buy(200, 74_200)
    await h.sell(100, 74_200)

    const buySum = h.state.history.filter((x) => x.side === 'buy').reduce((s, x) => s + x.amount, 0)
    const sellSum = h.state.history.filter((x) => x.side === 'sell').reduce((s, x) => s + x.amount, 0)
    expect(h.state.cash).toBe(PRINCIPAL - buySum + sellSum)
  })

  it('보유수량 = 매수수량합 - 매도수량합', async () => {
    const h = harness({ cash: 100_000_000 })
    await h.buy(300, 74_200)
    await h.buy(200, 74_200)
    await h.sell(100, 74_200)
    expect(h.pos().holding).toBe(300 + 200 - 100)
  })
})

describe('라운드 진행', () => {
  it('다음 라운드로 넘어가며 떠나는 라운드의 평가금액을 기록한다', async () => {
    const h = harness({ round: { round: 1, year: 2022 }, cash: 12_345 })
    expect((await h.actions.advanceRound()).ok).toBe(true)
    expect(h.state.round).toEqual({ round: 2, year: 2023 })
    expect(h.state.roundLog[1]).toBe(12_345)
  })

  it('마지막 라운드에서는 더 나아가지 않는다', async () => {
    const h = harness({ round: { round: 3, year: 2024 } })
    const r = await h.actions.advanceRound()
    expect(r.ok).toBe(false)
    expect(h.state.round.round).toBe(3)
  })

  it('없는 라운드로는 이동하지 않는다', async () => {
    const h = harness()
    expect((await h.actions.setRoundTo(99)).ok).toBe(false)
    expect(h.state.round.round).toBe(1)
  })
})

describe('뉴스 발동', () => {
  let h
  beforeEach(() => {
    h = harness({ round: { round: 2, year: 2023 } })
  })

  it('카드가 맨 앞에 붙고 현재 라운드가 찍힌다', async () => {
    await h.actions.pushNews({ headline: '속보', impact: 'up', related: ['가나전자'] })
    expect(h.state.news[0]).toMatchObject({ headline: '속보', impact: 'up', round: 2 })
  })

  it('알림을 띄운다', async () => {
    await h.actions.pushNews({ headline: '속보' })
    expect(h.toasts.at(-1).m).toMatch(/새로운 시황 뉴스/)
  })

  it('관련 종목을 안 주면 전체 시장으로 잡힌다', async () => {
    await h.actions.pushNews({ headline: '속보' })
    expect(h.state.news[0].related).toEqual(['전체 시장'])
  })
})
