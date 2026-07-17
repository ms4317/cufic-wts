import { describe, it, expect } from 'vitest'
import {
  stocks,
  initialNews,
  NEWS_SENTINELS,
  ROUNDS,
  FIN_YEARS,
  FIN_METRICS,
  financials,
  PRINCIPAL,
  initialCash,
  initialHistory,
} from './data'

// 더미 데이터의 정합성. 손으로 전수 대조하던 것을 테스트로 고정한다.
// 데이터를 고칠 때 여기가 깨지면 교육 시나리오가 어긋난 것이다.

const names = stocks.map((s) => s.name)
const known = new Set([...names, ...NEWS_SENTINELS])
const nextRound = (n) => ROUNDS.find((r) => r.round === n + 1)

describe('종목', () => {
  it('종목코드가 중복되지 않는다', () => {
    const codes = stocks.map((s) => s.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('종목명이 중복되지 않는다 — 뉴스가 이름으로 종목을 찾는다', () => {
    expect(new Set(names).size).toBe(names.length)
  })

  it('모든 종목에 한 줄 소개가 있다', () => {
    for (const s of stocks) expect(s.desc, s.name).toBeTruthy()
  })

  it('라운드 연도의 주가는 0보다 크거나, 아예 없어야 한다 (거래정지로 처리됨)', () => {
    for (const s of stocks) {
      for (const r of ROUNDS) {
        const p = s.priceByYear[r.year]
        if (p !== undefined) expect(p, `${s.name} ${r.year}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('뉴스', () => {
  it('id가 중복되지 않는다', () => {
    const ids = initialNews.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 관련 종목이 실존한다 (오타·삭제된 종목 없음)', () => {
    const bad = initialNews.flatMap((n) =>
      n.related.filter((r) => !known.has(r)).map((r) => `${n.id}: "${r}"`),
    )
    expect(bad).toEqual([])
  })

  it('impact가 up/down/flat 중 하나다', () => {
    for (const n of initialNews) expect(['up', 'down', 'flat'], n.id).toContain(n.impact)
  })

  it('실제 존재하는 라운드에만 붙어 있다', () => {
    const valid = new Set(ROUNDS.map((r) => r.round))
    for (const n of initialNews) expect(valid.has(n.round), n.id).toBe(true)
  })

  // 이게 이 프로젝트의 교육 계약이다:
  // 학생이 호재를 읽고 사면 다음 라운드에 오르고, 악재를 읽고 팔면 떨어져야 한다.
  // 어긋나면 정직하게 판단한 학생이 손해를 본다.
  it('호재·악재 태그가 다음 라운드 실제 등락 방향과 일치한다', () => {
    const byName = Object.fromEntries(stocks.map((s) => [s.name, s]))
    const mismatches = []

    for (const n of initialNews) {
      const cur = ROUNDS.find((r) => r.round === n.round)
      const next = nextRound(n.round)
      if (!next) continue // 마지막 라운드 뉴스는 예고할 다음 해가 없다
      if (n.impact === 'flat') continue // 중립은 방향을 약속하지 않는다

      for (const name of n.related) {
        const s = byName[name]
        if (!s) continue // 전체 시장 등
        const a = s.priceByYear[cur.year]
        const b = s.priceByYear[next.year]
        if (!a || !b) continue // 미상장·거래정지 구간
        const move = ((b - a) / a) * 100
        const ok = n.impact === 'up' ? move > 3 : move < -3
        if (!ok) mismatches.push(`${n.id} ${name}: ${n.impact} 인데 ${move.toFixed(1)}%`)
      }
    }
    expect(mismatches).toEqual([])
  })
})

describe('재무제표', () => {
  it('모든 종목에 재무 자료가 있다', () => {
    for (const s of stocks) expect(financials[s.code], s.name).toBeDefined()
  })

  it('모든 연도에 5개 지표가 빠짐없이 있다', () => {
    for (const s of stocks) {
      for (const y of FIN_YEARS) {
        const row = financials[s.code][y]
        expect(row, `${s.name} ${y}`).toBeDefined()
        for (const m of FIN_METRICS) {
          expect(typeof row[m.key], `${s.name} ${y} ${m.key}`).toBe('number')
        }
      }
    }
  })

  it('부채비율은 음수가 될 수 없다', () => {
    for (const s of stocks) {
      for (const y of FIN_YEARS) {
        expect(financials[s.code][y].debtRatio, `${s.name} ${y}`).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('라운드', () => {
  it('1부터 1씩 증가한다', () => {
    ROUNDS.forEach((r, i) => expect(r.round).toBe(i + 1))
  })

  it('연도도 1씩 증가한다', () => {
    for (let i = 1; i < ROUNDS.length; i++) {
      expect(ROUNDS[i].year).toBe(ROUNDS[i - 1].year + 1)
    }
  })

  it('첫 라운드의 전년도가 FIN_YEARS에 있다 — R1 등락률의 기준선', () => {
    expect(FIN_YEARS).toContain(ROUNDS[0].year - 1)
  })

  it('모든 라운드 연도의 재무제표가 있다', () => {
    for (const r of ROUNDS) expect(FIN_YEARS).toContain(r.year)
  })
})

describe('시작 상태', () => {
  it('거래 전이므로 예수금이 원금 전액이다', () => {
    expect(initialCash).toBe(PRINCIPAL)
  })

  it('체결내역이 비어 있다', () => {
    expect(initialHistory).toEqual([])
  })
})
