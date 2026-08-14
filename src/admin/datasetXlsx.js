// 데이터셋 엑셀(.xlsx) 왕복 — 공식 양식(CUFIC_WTS_데이터셋_제작양식.xlsx)과 1:1.
//   시트: 읽어주세요(안내) / 게임설정 / 종목 / 재무제표 / 힌트 / 시황
//   · 업로드: 5개 시트 파싱 → 검증(errors=차단 / warnings=허용) → payload(내보내기 JSON과 동일 구조)
//   · 내보내기: payload → 같은 양식으로. (수정 → 재업로드 왕복)
// SheetJS(xlsx)는 무거우므로 이 모듈은 AdminDatasets에서 동적 import 한다(학생 번들 미영향).
import * as XLSX from 'xlsx'

const GRADES = ['S', 'A', 'B', 'C', 'D']
const IMPACTS = ['up', 'down', 'flat']
const s = (v) => String(v ?? '').trim()
const isNum = (v) => v !== '' && v != null && !Number.isNaN(Number(v))
const isInt = (v) => isNum(v) && Number.isInteger(Number(v))

const rowsOf = (ws) => XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: true, raw: true })
function headerRow(rows, ...anchors) {
  // 헤더 행은 열 이름이 여러 칸(≥3) 있다. 제목/안내 행은 긴 문장이 한 칸뿐이라
  // 앵커 단어를 포함해도(예: 제목 "④ 힌트 (라운드 × 등급)") 걸러진다.
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => s(c))
    const nonEmpty = cells.filter((c) => c !== '').length
    if (nonEmpty >= 3 && anchors.every((a) => cells.some((c) => c.includes(a)))) return i
  }
  return -1
}
function colOf(header, ...keys) {
  const cells = header.map((c) => s(c))
  for (let i = 0; i < cells.length; i++) for (const k of keys) if (cells[i].includes(k)) return i
  return -1
}

/** @returns {{payload:object|null, errors:{sheet,row,msg}[], warnings:{sheet,row,msg}[]}} */
export function parseWorkbook(buf) {
  const errors = [],
    warnings = []
  const E = (sheet, row, msg) => errors.push({ sheet, row, msg })
  const W = (sheet, row, msg) => warnings.push({ sheet, row, msg })
  let wb
  try {
    wb = XLSX.read(buf, { type: 'array' })
  } catch {
    return { payload: null, errors: [{ sheet: '파일', row: 0, msg: '엑셀 파일을 열 수 없어요' }], warnings: [] }
  }
  for (const n of ['게임설정', '종목', '재무제표', '힌트', '시황'])
    if (!wb.SheetNames.includes(n)) E(n, 0, '시트가 없어요')
  if (errors.length) return { payload: null, errors, warnings }

  // ── ① 게임설정
  const gRows = rowsOf(wb.Sheets['게임설정'])
  const gH = headerRow(gRows, '항목', '값')
  const game = { round_year_map: {} }
  if (gH < 0) E('게임설정', 0, '헤더(항목/값)를 못 찾았어요')
  else {
    for (let i = gH + 1; i < gRows.length; i++) {
      const k = s(gRows[i][0]),
        v = gRows[i][1]
      if (!k) continue
      if (k.includes('총 라운드')) game.total_rounds = Number(v)
      else if (k.includes('시드')) game.default_seed = Number(v)
      else if (k.includes('타이머')) game.round_duration_seconds = Number(v)
      else if (k.includes('최종')) game.final_year = Number(v)
      else {
        const m = k.match(/R\s*(\d+)\s*연도/)
        if (m && isInt(v)) game.round_year_map[Number(m[1])] = Number(v)
        else if (m) E('게임설정', i + 1, `${k} 값이 연도(정수)가 아니에요: "${v}"`)
      }
    }
    if (!isInt(game.total_rounds) || game.total_rounds < 1) E('게임설정', 0, '총 라운드 수가 올바르지 않아요')
    if (!isInt(game.default_seed)) E('게임설정', 0, '시작 시드머니(정수)가 필요해요')
    if (!isInt(game.final_year)) E('게임설정', 0, '최종 정산 연도(정수)가 필요해요')
    for (let r = 1; r <= (game.total_rounds || 0); r++)
      if (!isInt(game.round_year_map[r])) E('게임설정', 0, `R${r} 연도가 없어요`)
    game.round_duration_seconds = isInt(game.round_duration_seconds)
      ? Number(game.round_duration_seconds)
      : 600
  }
  const gameYears = new Set(Object.values(game.round_year_map).filter(Number.isFinite))
  if (isInt(game.final_year)) gameYears.add(Number(game.final_year))

  // ── ② 종목
  const stocks = [],
    stockIds = new Set()
  const kRows = rowsOf(wb.Sheets['종목'])
  const kH = headerRow(kRows, 'ID', '종목명')
  if (kH < 0) E('종목', 0, '헤더(ID/종목명)를 못 찾았어요')
  else {
    const H = kRows[kH]
    const ci = {
      id: colOf(H, 'ID'),
      name: colOf(H, '종목명'),
      sector: colOf(H, '업종'),
      desc: colOf(H, '소개'),
      listed: colOf(H, '상장'),
    }
    const priceCols = []
    H.forEach((c, idx) => {
      const m = s(c).match(/(\d{4}).*가격/)
      if (m) priceCols.push({ col: idx, year: Number(m[1]) })
    })
    const priceYears = new Set(priceCols.map((p) => p.year))
    for (const y of gameYears)
      if (!priceYears.has(y)) E('종목', kH + 1, `가격 열에 ${y}년이 없어요 (게임 연도와 불일치)`)
    for (const p of priceCols)
      if (!gameYears.has(p.year)) W('종목', kH + 1, `${p.year}년 가격 열은 게임에 없는 연도예요(무시됨)`)
    for (let i = kH + 1; i < kRows.length; i++) {
      const row = kRows[i],
        ex = i + 1
      const id = s(row[ci.id])
      if (!id && !s(row[ci.name])) continue
      if (!id) {
        E('종목', ex, 'ID가 비었어요')
        continue
      }
      if (stockIds.has(id)) {
        E('종목', ex, `ID가 중복돼요: ${id}`)
        continue
      }
      if (!s(row[ci.name])) E('종목', ex, `종목명이 비었어요 (ID ${id})`)
      const prices = {}
      for (const p of priceCols) {
        if (!gameYears.has(p.year)) continue
        const v = row[p.col]
        if (v === '' || v == null) continue
        if (!isNum(v)) E('종목', ex, `${p.year}년 가격이 숫자가 아니에요: "${v}"`)
        else if (Number(v) > 0) prices[p.year] = Math.round(Number(v))
      }
      stockIds.add(id)
      stocks.push({
        id,
        name: s(row[ci.name]),
        sector: s(row[ci.sector]),
        description: s(row[ci.desc]),
        listed_from_round: isInt(row[ci.listed]) ? Number(row[ci.listed]) : 1,
        prices,
        display_order: stocks.length,
      })
    }
    if (!stocks.length) E('종목', 0, '종목이 최소 1개는 필요해요')
  }

  // ── ③ 재무제표
  const financials = []
  const fRows = rowsOf(wb.Sheets['재무제표'])
  const fH = headerRow(fRows, '종목ID')
  if (fH < 0) E('재무제표', 0, '헤더(종목ID)를 못 찾았어요')
  else {
    const H = fRows[fH]
    const ci = {
      sid: colOf(H, '종목ID'),
      year: colOf(H, '연도'),
      rev: colOf(H, '매출'),
      op: colOf(H, '영업이익'),
      net: colOf(H, '당기순이익', '순이익'),
      debt: colOf(H, '부채비율'),
      roe: colOf(H, 'ROE'),
    }
    for (let i = fH + 1; i < fRows.length; i++) {
      const row = fRows[i],
        ex = i + 1
      const sid = s(row[ci.sid])
      if (!sid) continue
      if (!stockIds.has(sid)) E('재무제표', ex, `종목ID가 종목 시트에 없어요: ${sid}`)
      if (!isInt(row[ci.year])) {
        E('재무제표', ex, `연도가 정수가 아니에요: "${row[ci.year]}"`)
        continue
      }
      ;[['매출', ci.rev], ['영업이익', ci.op], ['순이익', ci.net], ['부채비율', ci.debt], ['ROE', ci.roe]].forEach(
        ([lbl, idx]) => {
          if (row[idx] !== '' && !isNum(row[idx])) E('재무제표', ex, `${lbl}가 숫자가 아니에요: "${row[idx]}"`)
        },
      )
      financials.push({
        stock_id: sid,
        year: Number(row[ci.year]),
        revenue: Math.round(Number(row[ci.rev]) || 0),
        op_income: Math.round(Number(row[ci.op]) || 0),
        net_income: Math.round(Number(row[ci.net]) || 0),
        debt_ratio: Number(row[ci.debt]) || 0,
        roe: Number(row[ci.roe]) || 0,
      })
    }
  }

  // ── ⑤ 시황
  const macro = []
  const mRows = rowsOf(wb.Sheets['시황'])
  const mH = headerRow(mRows, '연도', '요약')
  if (mH < 0) E('시황', 0, '헤더(연도/요약)를 못 찾았어요')
  else {
    const H = mRows[mH]
    const ci = {
      year: colOf(H, '연도'),
      sum: colOf(H, '요약'),
      rate: colOf(H, '금리'),
      gdp: colOf(H, 'GDP'),
      un: colOf(H, '실업'),
      fx: colOf(H, '환율'),
      cpi: colOf(H, '물가'),
      oil: colOf(H, '유가'),
    }
    for (let i = mH + 1; i < mRows.length; i++) {
      const row = mRows[i],
        ex = i + 1
      if (!isInt(row[ci.year])) {
        if (s(row[ci.sum])) E('시황', ex, `연도가 정수가 아니에요: "${row[ci.year]}"`)
        continue
      }
      ;[['기준금리', ci.rate], ['GDP', ci.gdp], ['실업률', ci.un], ['환율', ci.fx], ['물가', ci.cpi], ['유가', ci.oil]].forEach(
        ([lbl, idx]) => {
          if (row[idx] !== '' && !isNum(row[idx])) E('시황', ex, `${lbl}가 숫자가 아니에요: "${row[idx]}"`)
        },
      )
      macro.push({
        year: Number(row[ci.year]),
        summary: s(row[ci.sum]),
        rate: Number(row[ci.rate]) || 0,
        gdp: Number(row[ci.gdp]) || 0,
        unemployment: Number(row[ci.un]) || 0,
        fx: Math.round(Number(row[ci.fx]) || 0),
        cpi: Number(row[ci.cpi]) || 0,
        oil: Math.round(Number(row[ci.oil]) || 0),
      })
    }
  }

  // ── ④ 힌트
  const hints = []
  const hRows = rowsOf(wb.Sheets['힌트'])
  const hH = headerRow(hRows, '라운드', '등급')
  if (hH < 0) E('힌트', 0, '헤더(라운드/등급)를 못 찾았어요')
  else {
    const H = hRows[hH]
    const ci = {
      round: colOf(H, '라운드'),
      grade: colOf(H, '등급'),
      head: colOf(H, '문구'),
      dir: colOf(H, '방향'),
      rel: colOf(H, '관련'),
    }
    for (let i = hH + 1; i < hRows.length; i++) {
      const row = hRows[i],
        ex = i + 1
      if (!isInt(row[ci.round]) && !s(row[ci.head])) continue
      if (!isInt(row[ci.round])) {
        E('힌트', ex, `라운드가 정수가 아니에요: "${row[ci.round]}"`)
        continue
      }
      const grade = s(row[ci.grade]).toUpperCase()
      if (!GRADES.includes(grade)) E('힌트', ex, `등급은 S/A/B/C/D만 돼요: "${row[ci.grade]}"`)
      const impact = s(row[ci.dir]).toLowerCase()
      if (!IMPACTS.includes(impact)) E('힌트', ex, `방향은 up/down/flat만 돼요: "${row[ci.dir]}"`)
      if (!s(row[ci.head])) E('힌트', ex, '힌트 문구가 비었어요')
      const rel = s(row[ci.rel])
        .split(/[,\s;]+/)
        .map((x) => x.trim())
        .filter(Boolean)
      rel.forEach((id) => {
        if (!stockIds.has(id)) E('힌트', ex, `관련 종목ID가 종목 시트에 없어요: ${id}`)
      })
      hints.push({ round: Number(row[ci.round]), grade, headline: s(row[ci.head]), impact, related_stock_ids: rel, __row: ex })
    }
  }

  // ── 교차 검증(에러 없을 때만): 힌트 방향↔가격 등락 / 등급 커버리지 (모두 경고)
  if (!errors.length) {
    const priceOf = (id, y) => stocks.find((x) => x.id === id)?.prices[y]
    for (const h of hints) {
      if (h.impact === 'flat') continue
      const cur = game.round_year_map[h.round]
      const nxt = game.round_year_map[h.round + 1] ?? game.final_year
      for (const id of h.related_stock_ids) {
        const p0 = priceOf(id, cur),
          p1 = priceOf(id, nxt)
        if (p0 == null || p1 == null) continue
        if (h.impact === 'up' && !(p1 > p0))
          W('힌트', h.__row, `방향 up인데 ${id} ${cur}→${nxt} 가격이 안 올라요 (호재↔등락 불일치)`)
        if (h.impact === 'down' && !(p1 < p0))
          W('힌트', h.__row, `방향 down인데 ${id} ${cur}→${nxt} 가격이 안 내려요 (악재↔등락 불일치)`)
      }
    }
    for (let r = 2; r <= (game.total_rounds || 0); r++)
      for (const g of GRADES)
        if (!hints.some((h) => h.round === r && h.grade === g))
          W('힌트', 0, `R${r} ${g}등급 힌트가 없어요 (자동배분 때 인접 등급으로 대체돼요)`)
  }
  hints.forEach((h) => delete h.__row)

  const payload = errors.length
    ? null
    : {
        game: {
          total_rounds: game.total_rounds,
          round_year_map: game.round_year_map,
          default_seed: game.default_seed,
          final_year: game.final_year,
          round_duration_seconds: game.round_duration_seconds,
        },
        stocks,
        financials,
        macro,
        hints,
      }
  return { payload, errors, warnings }
}

/** payload → 같은 양식의 .xlsx (Uint8Array). */
export function buildWorkbook(payload) {
  const { game, stocks, financials, macro, hints } = payload
  const years = [...new Set([...Object.values(game.round_year_map || {}).map(Number), Number(game.final_year)])]
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  const roundNums = Object.keys(game.round_year_map || {})
    .map(Number)
    .sort((a, b) => a - b)
  const aoa = (rows) => XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    wb,
    aoa([
      ['CUFIC WTS 게임 데이터셋 제작 양식'],
      [''],
      ['시트 5개(게임설정/종목/재무제표/힌트/시황)를 채우면 게임 한 판이 완성됩니다.'],
      ['관리자 [데이터셋] 탭 → [엑셀 업로드]로 올리면 검사 후 새 데이터셋으로 만들어져요.'],
      [''],
      ['작성 순서: ① 게임설정 → ② 종목(가격 먼저!) → ③ 재무제표 → ⑤ 시황 → ④ 힌트'],
      ['힌트 방향(up/down)은 관련 종목의 다음 해 실제 가격 등락과 맞아야 해요(검사에서 경고).'],
    ]),
    '읽어주세요',
  )

  const gRows = [
    ['① 게임설정', '', ''],
    ['항목 이름(A열)은 그대로 두고 값(B열)만 수정하세요. 라운드 연도는 ②종목 시트 가격 열과 일치해야 해요.', '', ''],
    ['항목', '값', '설명'],
    ['총 라운드 수', game.total_rounds, '보통 5'],
    ['시작 시드머니(원)', game.default_seed, '전 조 동일'],
    ['타이머(초)', game.round_duration_seconds ?? 600, '600 = 10분'],
    ['최종 정산 연도', game.final_year, '대회 종료 시 이 연도 가격으로 최종 평가'],
  ]
  roundNums.forEach((r) => gRows.push([`R${r} 연도`, game.round_year_map[r], `${r}라운드에서 거래하는 연도`]))
  XLSX.utils.book_append_sheet(wb, aoa(gRows), '게임설정')

  const kHead = ['ID', '종목명', '업종', '한 줄 소개', '상장라운드', ...years.map((y) => `${y}년 가격`)]
  const kRows = [
    ['② 종목과 연도별 가격', ...Array(kHead.length - 1).fill('')],
    ['한 행 = 종목 하나. ID는 S01,S02… 순서로. 가격 빈칸/0 = 거래정지·미상장. 상장라운드 = 이 라운드부터 등장.', ...Array(kHead.length - 1).fill('')],
    kHead,
  ]
  stocks
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .forEach((st) =>
      kRows.push([st.id, st.name, st.sector || '', st.description || '', st.listed_from_round ?? 1, ...years.map((y) => st.prices?.[y] ?? '')]),
    )
  XLSX.utils.book_append_sheet(wb, aoa(kRows), '종목')

  const fHead = ['종목ID', '연도', '매출액(억)', '영업이익(억)', '당기순이익(억)', '부채비율(%)', 'ROE(%)']
  const fRows = [
    ['③ 재무제표 (종목 × 연도)', '', '', '', '', '', ''],
    ['한 행 = 한 종목의 한 해. 단위: 매출·영업이익·순이익 = 억원(적자 음수), 부채비율·ROE = %. 미상장·폐지 연도는 행을 빼세요.', '', '', '', '', '', ''],
    fHead,
  ]
  financials.forEach((f) => fRows.push([f.stock_id, f.year, f.revenue, f.op_income, f.net_income, f.debt_ratio, f.roe]))
  XLSX.utils.book_append_sheet(wb, aoa(fRows), '재무제표')

  const hHead = ['라운드', '등급(S~D)', '힌트 문구', '방향(up/down/flat)', '관련 종목ID']
  const hRows = [
    ['④ 힌트 (라운드 × 등급)', '', '', '', ''],
    ['R1은 지급 없음(작성 불필요). 방향: up=호재, down=악재, flat=중립. 관련종목은 종목ID를 쉼표로 (예: S04,S02).', '', '', '', ''],
    hHead,
  ]
  hints.forEach((h) => hRows.push([h.round, h.grade, h.headline, h.impact, (h.related_stock_ids || []).join(',')]))
  XLSX.utils.book_append_sheet(wb, aoa(hRows), '힌트')

  const mHead = ['연도', '한 줄 요약', '기준금리(%)', 'GDP성장률(%)', '실업률(%)', '환율(원/$)', '물가상승률(%)', '국제유가($)']
  const mRows = [
    ['⑤ 시황 (연도별 거시경제)', '', '', '', '', '', '', ''],
    ['한 행 = 한 해. 한 줄 요약은 학생 시황판 맨 위에 크게 보여요.', '', '', '', '', '', '', ''],
    mHead,
  ]
  macro.forEach((m) => mRows.push([m.year, m.summary, m.rate, m.gdp, m.unemployment, m.fx, m.cpi, m.oil]))
  XLSX.utils.book_append_sheet(wb, aoa(mRows), '시황')

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
}
