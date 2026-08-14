// 데이터셋 CSV 왕복 — 내보내기 JSON의 5개 섹션(game/stocks/financials/hints/macro)과 1:1.
//   · 템플릿 다운로드: 5개 CSV(각 헤더 1행 + 예시 2행)를 zip으로. UTF-8 BOM(엑셀에서 바로 열림).
//   · 업로드: zip 또는 CSV 5개 → 검증(파일·행·사유) → 통과 시 payload 생성 → 새 데이터셋으로.
//   · 업로드 인코딩: UTF-8(BOM 유무 무관) / CP949 모두 수용.
import { zipSync, unzipSync } from 'fflate'

export const CSV_FILES = ['game.csv', 'stocks.csv', 'financials.csv', 'macro.csv', 'hints.csv']

// ── CSV 직렬화/파싱 (RFC 4180: 큰따옴표·쉼표·줄바꿈 처리)
function csvCell(v) {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
function toCsv(rows) {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}
function parseCsv(text) {
  const rows = []
  let row = [],
    cell = '',
    q = false
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"'
          i++
        } else q = false
      } else cell += c
    } else if (c === '"') q = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  // 완전 빈 줄 제거
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}
// 헤더 + 객체 배열(행 번호 포함: 데이터 첫 행 = 2행)
function parseTable(text) {
  const rows = parseCsv(text)
  if (!rows.length) return { headers: [], items: [] }
  const headers = rows[0].map((h) => h.trim())
  const items = rows.slice(1).map((r, i) => {
    const o = { __line: i + 2 }
    headers.forEach((h, j) => (o[h] = (r[j] ?? '').trim()))
    return o
  })
  return { headers, items }
}

// ── 인코딩
export function decodeBytes(u8) {
  if (u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf)
    return new TextDecoder('utf-8').decode(u8.subarray(3)) // UTF-8 BOM
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(u8)
  } catch {
    return new TextDecoder('euc-kr').decode(u8) // CP949 폴백
  }
}
function csvBytesBOM(text) {
  const body = new TextEncoder().encode(text)
  const out = new Uint8Array(body.length + 3)
  out.set([0xef, 0xbb, 0xbf])
  out.set(body, 3)
  return out
}

// ── 템플릿 (헤더 + 예시 2행)
const TEMPLATE = {
  'game.csv': [
    ['설정', '값'],
    ['total_rounds', '5'],
    ['final_year', '2025'],
    ['default_seed', '100000000'],
    ['round_duration_seconds', '600'],
    ['round_1_year', '2020'],
    ['round_2_year', '2021'],
    ['round_3_year', '2022'],
    ['round_4_year', '2023'],
    ['round_5_year', '2024'],
  ],
  'stocks.csv': [
    ['id', 'name', 'description', 'sector', 'listed_from_round', 'display_order', 'price_2020', 'price_2021', 'price_2022', 'price_2023', 'price_2024', 'price_2025'],
    ['A001', '한빛반도체', '반도체를 만드는 회사예요', '반도체', '1', '0', '10000', '12000', '9000', '15000', '18000', '20000'],
    ['A002', '미래바이오', '신약을 개발하는 바이오 회사예요', '바이오', '3', '1', '', '', '5000', '8000', '12000', '15000'],
  ],
  'financials.csv': [
    ['stock_id', 'year', 'revenue', 'op_income', 'net_income', 'debt_ratio', 'roe'],
    ['A001', '2020', '5000', '800', '600', '45.2', '12.3'],
    ['A001', '2021', '7000', '1200', '900', '40.1', '15'],
  ],
  'macro.csv': [
    ['year', 'summary', 'rate', 'gdp', 'unemployment', 'fx', 'cpi', 'oil'],
    ['2020', '코로나 충격으로 경기 급랭', '0.5', '-0.7', '4', '1180', '0.5', '42'],
    ['2021', '경기 반등·유동성 장세', '0.75', '4.1', '3.7', '1150', '2.5', '68'],
  ],
  'hints.csv': [
    ['round', 'grade', 'headline', 'impact', 'related_stock_ids'],
    ['2', 'S', '메모리 감산 효과로 반도체 업황 바닥 통과 전망', 'up', 'A001'],
    ['2', 'D', '경기 둔화로 소비 위축 우려', 'down', 'A001;A002'],
  ],
}

/** 템플릿 zip(Uint8Array). UTF-8 BOM CSV 5개. */
export function buildTemplateZip() {
  const entries = {}
  for (const name of CSV_FILES) entries[name] = csvBytesBOM(toCsv(TEMPLATE[name]))
  return zipSync(entries, { level: 0 })
}

/** 업로드된 File[] → { 'game.csv': text, ... }. zip 하나 또는 CSV 여러 개 수용. */
export async function readUploadFiles(fileList) {
  const files = Array.from(fileList)
  const out = {}
  const zip = files.find((f) => /\.zip$/i.test(f.name))
  if (zip) {
    const u8 = new Uint8Array(await zip.arrayBuffer())
    const unz = unzipSync(u8)
    for (const [path, bytes] of Object.entries(unz)) {
      const base = path.split('/').pop().toLowerCase()
      if (CSV_FILES.includes(base)) out[base] = decodeBytes(bytes)
    }
  } else {
    for (const f of files) {
      const base = f.name.toLowerCase()
      if (CSV_FILES.includes(base)) out[base] = decodeBytes(new Uint8Array(await f.arrayBuffer()))
    }
  }
  return out
}

// ── 검증 헬퍼
const isInt = (v) => v !== '' && Number.isInteger(Number(v))
const isNum = (v) => v !== '' && !Number.isNaN(Number(v))

/**
 * CSV 텍스트 5종 → { payload, errors }.
 * errors: [{ file, line, msg }] (line은 CSV 행 번호, 헤더=1)
 */
export function csvFilesToPayload(files) {
  const errors = []
  const err = (file, line, msg) => errors.push({ file, line, msg })
  for (const name of CSV_FILES) if (files[name] == null) err(name, 0, '파일이 없어요')
  if (errors.length) return { payload: null, errors }

  // ── game
  const gameKv = {}
  parseTable(files['game.csv']).items.forEach((r) => {
    const k = (r['설정'] ?? r['key'] ?? '').trim()
    const v = (r['값'] ?? r['value'] ?? '').trim()
    if (k) gameKv[k] = v
  })
  const roundYearMap = {}
  let maxRound = 0
  Object.keys(gameKv).forEach((k) => {
    const m = k.match(/^round_(\d+)_year$/)
    if (m) {
      const rn = Number(m[1])
      if (!isInt(gameKv[k])) err('game.csv', 0, `${k} 값이 연도(정수)가 아니에요: "${gameKv[k]}"`)
      else {
        roundYearMap[rn] = Number(gameKv[k])
        maxRound = Math.max(maxRound, rn)
      }
    }
  })
  const totalRounds = isInt(gameKv.total_rounds) ? Number(gameKv.total_rounds) : maxRound
  if (!totalRounds) err('game.csv', 0, 'total_rounds 또는 round_N_year가 필요해요')
  for (let r = 1; r <= totalRounds; r++)
    if (roundYearMap[r] == null) err('game.csv', 0, `round_${r}_year가 없어요`)
  if (!isInt(gameKv.final_year)) err('game.csv', 0, 'final_year(정수)가 필요해요')
  if (!isInt(gameKv.default_seed)) err('game.csv', 0, 'default_seed(정수)가 필요해요')
  const game = {
    total_rounds: totalRounds,
    round_year_map: roundYearMap,
    final_year: Number(gameKv.final_year),
    default_seed: Number(gameKv.default_seed),
    round_duration_seconds: isInt(gameKv.round_duration_seconds)
      ? Number(gameKv.round_duration_seconds)
      : 600,
  }

  // ── stocks
  const stocks = []
  const stockIds = new Set()
  const stkT = parseTable(files['stocks.csv'])
  const priceCols = stkT.headers.filter((h) => /^price_\d{4}$/.test(h))
  stkT.items.forEach((r) => {
    const id = (r.id ?? '').trim()
    if (!id) return err('stocks.csv', r.__line, 'id가 비어 있어요')
    if (stockIds.has(id)) return err('stocks.csv', r.__line, `id가 중복돼요: ${id}`)
    if (!(r.name ?? '').trim()) err('stocks.csv', r.__line, `name이 비어 있어요 (id ${id})`)
    if (r.listed_from_round && !isInt(r.listed_from_round))
      err('stocks.csv', r.__line, `listed_from_round가 정수가 아니에요: "${r.listed_from_round}"`)
    const prices = {}
    priceCols.forEach((c) => {
      const y = c.slice(6)
      const val = (r[c] ?? '').trim()
      if (val !== '') {
        if (!isInt(val)) err('stocks.csv', r.__line, `${c}가 정수가 아니에요: "${val}"`)
        else if (Number(val) > 0) prices[y] = Number(val) // 0/빈칸 = 거래정지(미포함)
      }
    })
    stockIds.add(id)
    stocks.push({
      id,
      name: (r.name ?? '').trim(),
      description: (r.description ?? '').trim(),
      sector: (r.sector ?? '').trim(),
      listed_from_round: isInt(r.listed_from_round) ? Number(r.listed_from_round) : 1,
      prices,
      display_order: isInt(r.display_order) ? Number(r.display_order) : stocks.length,
    })
  })
  if (!stocks.length) err('stocks.csv', 0, '종목이 최소 1개는 필요해요')

  // ── financials
  const financials = []
  parseTable(files['financials.csv']).items.forEach((r) => {
    const sid = (r.stock_id ?? '').trim()
    if (!sid) return err('financials.csv', r.__line, 'stock_id가 비어 있어요')
    if (!stockIds.has(sid)) err('financials.csv', r.__line, `stock_id가 종목목록에 없어요: ${sid}`)
    if (!isInt(r.year)) return err('financials.csv', r.__line, `year가 정수가 아니에요: "${r.year}"`)
    ;['revenue', 'op_income', 'net_income', 'debt_ratio', 'roe'].forEach((k) => {
      if (r[k] !== '' && !isNum(r[k])) err('financials.csv', r.__line, `${k}가 숫자가 아니에요: "${r[k]}"`)
    })
    financials.push({
      stock_id: sid,
      year: Number(r.year),
      revenue: Math.round(Number(r.revenue) || 0),
      op_income: Math.round(Number(r.op_income) || 0),
      net_income: Math.round(Number(r.net_income) || 0),
      debt_ratio: Number(r.debt_ratio) || 0,
      roe: Number(r.roe) || 0,
    })
  })

  // ── macro
  const macro = []
  parseTable(files['macro.csv']).items.forEach((r) => {
    if (!isInt(r.year)) return err('macro.csv', r.__line, `year가 정수가 아니에요: "${r.year}"`)
    ;['rate', 'gdp', 'unemployment', 'fx', 'cpi', 'oil'].forEach((k) => {
      if (r[k] !== '' && !isNum(r[k])) err('macro.csv', r.__line, `${k}가 숫자가 아니에요: "${r[k]}"`)
    })
    macro.push({
      year: Number(r.year),
      summary: (r.summary ?? '').trim(),
      rate: Number(r.rate) || 0,
      gdp: Number(r.gdp) || 0,
      unemployment: Number(r.unemployment) || 0,
      fx: Math.round(Number(r.fx) || 0),
      cpi: Number(r.cpi) || 0,
      oil: Math.round(Number(r.oil) || 0),
    })
  })

  // ── hints
  const hints = []
  const GRADES = ['S', 'A', 'B', 'C', 'D']
  const IMPACTS = ['up', 'down', 'flat']
  parseTable(files['hints.csv']).items.forEach((r) => {
    if (!isInt(r.round)) return err('hints.csv', r.__line, `round가 정수가 아니에요: "${r.round}"`)
    const grade = (r.grade ?? '').trim().toUpperCase()
    if (!GRADES.includes(grade)) err('hints.csv', r.__line, `grade는 S/A/B/C/D만 돼요: "${r.grade}"`)
    const impact = (r.impact ?? '').trim().toLowerCase()
    if (!IMPACTS.includes(impact)) err('hints.csv', r.__line, `impact는 up/down/flat만 돼요: "${r.impact}"`)
    if (!(r.headline ?? '').trim()) err('hints.csv', r.__line, 'headline이 비어 있어요')
    const rel = (r.related_stock_ids ?? '')
      .split(/[;|]/)
      .map((x) => x.trim())
      .filter(Boolean)
    rel.forEach((id) => {
      if (!stockIds.has(id)) err('hints.csv', r.__line, `related_stock_ids에 없는 종목: ${id}`)
    })
    hints.push({ round: Number(r.round), grade, headline: (r.headline ?? '').trim(), impact, related_stock_ids: rel })
  })

  return { payload: errors.length ? null : { game, stocks, financials, macro, hints }, errors }
}
