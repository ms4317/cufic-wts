// 종목별 캔들 시리즈 생성기.
// 종목코드 + 봉주기를 시드로 쓰는 결정론적 난수라서, 같은 종목은 항상 같은 차트가 나온다.
// (추후 실제 시세 API로 교체할 자리)

function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 봉 주기별: 캔들 개수와 봉당 변동폭
export const TIMEFRAMES = [
  { key: 'D', label: '일', count: 40, vol: 0.012 },
  { key: 'W', label: '주', count: 32, vol: 0.028 },
  { key: 'M', label: '월', count: 24, vol: 0.055 },
  { key: 'Y', label: '년', count: 12, vol: 0.13 },
]

/**
 * 지난 라운드 종가(prevPrice)에서 이번 라운드 종가(price)까지의 경로를 그린다.
 *
 * 추세를 데이터에서 가져오는 게 핵심이다. 예전엔 종목코드만 시드로 쓰고 현재가에
 * 배율만 맞춰서, 29% 하락한 해에도 차트가 우상향으로 보였다 — 학생이 차트를 보고
 * 정반대로 판단하게 되므로 교육용으로 치명적이었다.
 *
 * @param {string} code       시드용 종목코드 (같은 종목·주기는 항상 같은 모양)
 * @param {number} price      이번 라운드 종가 — 마지막 봉이 정확히 여기서 끝난다
 * @param {number} prevPrice  지난 라운드 종가 — 첫 봉이 여기서 시작한다
 * @returns {{open:number,close:number,high:number,low:number,up:boolean}[]}
 */
export function candleSeries(code, price, prevPrice, timeframe = 'W') {
  const tf = TIMEFRAMES.find((t) => t.key === timeframe) ?? TIMEFRAMES[1]
  const rand = mulberry32(hashSeed(code + tf.key))
  const start = prevPrice > 0 ? prevPrice : price

  // start → price를 로그(복리) 보간한 추세선에 노이즈를 얹는다.
  // 마지막 봉은 노이즈 없이 정확히 price로 닫아 현재가와 어긋나지 않게 한다.
  const closes = []
  for (let i = 0; i < tf.count; i++) {
    if (i === tf.count - 1) {
      closes.push(price)
      continue
    }
    const t = i / (tf.count - 1)
    const trend = start * Math.pow(price / start, t)
    closes.push(trend * (1 + (rand() - 0.5) * 2 * tf.vol))
  }

  return closes.map((close, i) => {
    const open = i === 0 ? start : closes[i - 1]
    const wick = close * tf.vol * (0.35 + rand() * 0.7)
    return {
      open,
      close,
      high: Math.max(open, close) + wick * rand(),
      low: Math.min(open, close) - wick * rand(),
      up: close >= open,
    }
  })
}

// 단순이동평균
export function movingAverage(series, period = 5) {
  return series.map((_, i) => {
    const from = Math.max(0, i - period + 1)
    const slice = series.slice(from, i + 1)
    return slice.reduce((sum, c) => sum + c.close, 0) / slice.length
  })
}
