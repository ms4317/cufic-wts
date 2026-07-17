import { describe, it, expect } from 'vitest'
import { candleSeries, movingAverage, TIMEFRAMES } from './chart'

const first = (s) => s[0]
const last = (s) => s[s.length - 1]

describe('candleSeries — 차트 방향 [회귀]', () => {
  // 버그: 처음엔 종목코드만 시드로 쓰고 현재가에 배율만 맞췄다. 그래서 삼성전자가
  // 29% 하락한 2022년에도 차트가 강한 우상향으로 그려졌다. 학생이 차트를 보고
  // 정반대로 판단할 수 있어 교육용으로 치명적이었다.
  // 고친 뒤로는 지난 라운드 종가 → 이번 종가를 보간한 추세를 그린다.

  it('하락한 해에는 차트가 내려간다', () => {
    const s = candleSeries('005930', 55_300, 78_300, 'W') // -29%
    expect(last(s).close).toBeLessThan(first(s).open)
  })

  it('상승한 해에는 차트가 올라간다', () => {
    const s = candleSeries('000660', 141_500, 75_000, 'W') // +89%
    expect(last(s).close).toBeGreaterThan(first(s).open)
  })

  it('큰 폭 하락도 방향이 뒤집히지 않는다', () => {
    const s = candleSeries('035420', 177_500, 376_000, 'W') // -53%
    expect(last(s).close).toBeLessThan(first(s).open)
  })

  it('모든 봉 주기에서 방향이 일치한다', () => {
    for (const tf of TIMEFRAMES) {
      const down = candleSeries('005930', 55_300, 78_300, tf.key)
      expect(last(down).close, `${tf.label} 하락`).toBeLessThan(first(down).open)
      const up = candleSeries('000660', 141_500, 75_000, tf.key)
      expect(last(up).close, `${tf.label} 상승`).toBeGreaterThan(first(up).open)
    }
  })

  it('마지막 봉은 정확히 현재가로 닫힌다 — 헤더 숫자와 어긋나면 안 된다', () => {
    for (const tf of TIMEFRAMES) {
      expect(last(candleSeries('005930', 74_200, 78_500, tf.key)).close).toBe(74_200)
    }
  })

  it('첫 봉은 지난 라운드 종가에서 출발한다', () => {
    expect(first(candleSeries('005930', 74_200, 78_500, 'W')).open).toBe(78_500)
  })

  it('같은 종목·주기는 항상 같은 차트다 (결정론적)', () => {
    const a = candleSeries('005930', 74_200, 78_500, 'W')
    const b = candleSeries('005930', 74_200, 78_500, 'W')
    expect(a).toEqual(b)
  })

  it('종목이 다르면 차트도 다르다', () => {
    const a = candleSeries('005930', 74_200, 78_500, 'W')
    const b = candleSeries('000660', 74_200, 78_500, 'W')
    expect(a).not.toEqual(b)
  })

  it('지난 종가가 없으면(신규 상장) 현재가에서 시작해 터지지 않는다', () => {
    const s = candleSeries('373220', 440_000, 0, 'W')
    expect(s).toHaveLength(TIMEFRAMES.find((t) => t.key === 'W').count)
    expect(s.every((c) => Number.isFinite(c.close) && c.close > 0)).toBe(true)
  })

  it('고가·저가가 몸통을 감싼다', () => {
    for (const c of candleSeries('005930', 74_200, 55_300, 'W')) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close))
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close))
    }
  })

  it('up 플래그가 종가·시가 관계와 맞는다', () => {
    for (const c of candleSeries('005930', 74_200, 55_300, 'D')) {
      expect(c.up).toBe(c.close >= c.open)
    }
  })
})

describe('movingAverage', () => {
  it('구간이 채워지기 전에는 있는 것만 평균낸다', () => {
    const s = [10, 20, 30, 40].map((close) => ({ close }))
    expect(movingAverage(s, 3)).toEqual([10, 15, 20, 30])
  })

  it('길이가 원본과 같다', () => {
    const s = candleSeries('005930', 74_200, 78_500, 'W')
    expect(movingAverage(s, 5)).toHaveLength(s.length)
  })
})
