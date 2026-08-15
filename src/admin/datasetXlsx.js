// 데이터셋 엑셀(.xlsx) 왕복 — 공식 양식 v3(CUFIC_WTS_데이터셋_제작양식_v3.xlsx)과 1:1.
//   시트: 읽어주세요(안내) / 게임설정 / 종목 / 재무제표 / 힌트 / 시황
//   · 업로드: 파싱 → 검증(error=차단 / warning·info=허용) → payload(내보내기 JSON과 동일 구조)
//   · 지표 정의는 src/metrics.js 단일 소스를 참조(열 매핑도) — 지표가 바뀌면 파서가 함께 따라간다.
//   · 열 매핑은 위치가 아니라 헤더 이름(키워드)으로 → 열 순서·추가에 강함. 모르는 열은 info로 '무시됨'.
// SheetJS(xlsx)는 무거우므로 이 모듈은 AdminDatasets에서 동적 import 한다(학생 번들 미영향).
import * as XLSX from 'xlsx'
import { FIN_METRICS, MACRO_METRICS } from '../metrics.js'

const GRADES = ['S', 'A', 'B', 'C', 'D']
const IMPACTS = ['up', 'down', 'flat']
const s = (v) => String(v ?? '').trim()
const isNum = (v) => v !== '' && v != null && !Number.isNaN(Number(v))
const isInt = (v) => isNum(v) && Number.isInteger(Number(v))
const won = (n) => Number(n).toLocaleString('en-US')

const rowsOf = (ws) => XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: true, raw: true })
function headerRow(rows, ...anchors) {
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
// 매핑된 열 인덱스 집합에 없는 헤더 셀 → '무시됨' info
function reportUnknown(header, mapped, sheet, kH, INFO) {
  header.forEach((c, idx) => {
    const name = s(c)
    if (name && !mapped.has(idx)) INFO(sheet, kH + 1, `'${name}' 열은 알 수 없어 무시됐어요`)
  })
}

/** @returns {{payload, errors[], warnings[], infos[]}} — 각 항목 {sheet,row,msg} */
export function parseWorkbook(buf) {
  const errors = [],
    warnings = [],
    infos = []
  const E = (sheet, row, msg) => errors.push({ sheet, row, msg })
  const W = (sheet, row, msg) => warnings.push({ sheet, row, msg })
  const INFO = (sheet, row, msg) => infos.push({ sheet, row, msg })
  let wb
  try {
    wb = XLSX.read(buf, { type: 'array' })
  } catch {
    return { payload: null, errors: [{ sheet: '파일', row: 0, msg: '엑셀 파일을 열 수 없어요' }], warnings: [], infos: [] }
  }
  for (const n of ['게임설정', '종목', '재무제표', '힌트', '시황'])
    if (!wb.SheetNames.includes(n)) E(n, 0, '시트가 없어요')
  if (errors.length) return { payload: null, errors, warnings, infos }

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
    game.round_duration_seconds = isInt(game.round_duration_seconds) ? Number(game.round_duration_seconds) : 600
  }
  const gameYears = new Set(Object.values(game.round_year_map).filter(Number.isFinite))
  if (isInt(game.final_year)) gameYears.add(Number(game.final_year))

  // ── ② 종목 (가격 칸: 숫자=가격 / %끝=전년 대비 등락률)
  const stocks = [],
    stockIds = new Set()
  const kRows = rowsOf(wb.Sheets['종목'])
  const kH = headerRow(kRows, 'ID', '종목명')
  if (kH < 0) E('종목', 0, '헤더(ID/종목명)를 못 찾았어요')
  else {
    const H = kRows[kH]
    const ci = { id: colOf(H, 'ID'), name: colOf(H, '종목명'), sector: colOf(H, '업종'), desc: colOf(H, '소개'), listed: colOf(H, '상장') }
    const priceCols = []
    H.forEach((c, idx) => {
      const m = s(c).match(/(\d{4}).*가격/)
      if (m) priceCols.push({ col: idx, year: Number(m[1]) })
    })
    priceCols.sort((a, b) => a.year - b.year)
    const priceYears = new Set(priceCols.map((p) => p.year))
    for (const y of gameYears) if (!priceYears.has(y)) E('종목', kH + 1, `가격 열에 ${y}년이 없어요 (게임 연도와 불일치)`)
    for (const p of priceCols) if (!gameYears.has(p.year)) W('종목', kH + 1, `${p.year}년 가격 열은 게임에 없는 연도예요(무시됨)`)
    const mapped = new Set([ci.id, ci.name, ci.sector, ci.desc, ci.listed, ...priceCols.map((p) => p.col)].filter((x) => x >= 0))
    reportUnknown(H, mapped, '종목', kH, INFO)

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
      // 가격: 연도 오름차순으로 훑으며 %는 전년 대비 환산
      const prices = {}
      let prevPrice = null
      for (const { col, year } of priceCols) {
        if (!gameYears.has(year)) continue
        const cell = s(row[col])
        if (cell === '') {
          prevPrice = null
          continue
        } // 빈칸 = 거래정지·미상장
        if (/%\s*$/.test(cell)) {
          const pct = parseFloat(cell.replace(/[%+\s]/g, ''))
          if (Number.isNaN(pct)) {
            E('종목', ex, `${year}년 등락률이 숫자가 아니에요: "${cell}"`)
            prevPrice = null
            continue
          }
          if (prevPrice == null || prevPrice <= 0) {
            E('종목', ex, `${year}년에 %(${cell})를 썼는데 전년 가격이 없어요 — 첫 등장 연도는 가격(원)으로 넣어주세요`)
            prevPrice = null
            continue
          }
          const p = Math.round(prevPrice * (1 + pct / 100))
          if (p > 0) prices[year] = p
          INFO('종목', ex, `${id} ${year}: ${cell} → ${won(p)}원`)
          prevPrice = p
        } else {
          if (!isNum(cell)) {
            E('종목', ex, `${year}년 가격이 숫자가 아니에요: "${cell}"`)
            prevPrice = null
            continue
          }
          const p = Math.round(Number(cell))
          if (p > 0) prices[year] = p
          prevPrice = p
        }
      }
      stockIds.add(id)
      stocks.push({
        id,
        name: s(row[ci.name]),
        sector: ci.sector >= 0 ? s(row[ci.sector]) : '', // 업종은 선택
        description: s(row[ci.desc]),
        listed_from_round: isInt(row[ci.listed]) ? Number(row[ci.listed]) : 1,
        prices,
        display_order: stocks.length,
      })
    }
    if (!stocks.length) E('종목', 0, '종목이 최소 1개는 필요해요')
  }

  // ── ③ 재무제표 (열은 metrics 설정에서)
  const financials = []
  const fRows = rowsOf(wb.Sheets['재무제표'])
  const fH = headerRow(fRows, '종목ID')
  if (fH < 0) E('재무제표', 0, '헤더(종목ID)를 못 찾았어요')
  else {
    const H = fRows[fH]
    const sidC = colOf(H, '종목ID'),
      yearC = colOf(H, '연도')
    const metCols = FIN_METRICS.map((m) => ({ m, col: colOf(H, ...[].concat(m.xlsx)) }))
    reportUnknown(H, new Set([sidC, yearC, ...metCols.map((x) => x.col)].filter((x) => x >= 0)), '재무제표', fH, INFO)
    for (let i = fH + 1; i < fRows.length; i++) {
      const row = fRows[i],
        ex = i + 1
      const sid = s(row[sidC])
      if (!sid) continue
      if (!stockIds.has(sid)) E('재무제표', ex, `종목ID가 종목 시트에 없어요: ${sid}`)
      if (!isInt(row[yearC])) {
        E('재무제표', ex, `연도가 정수가 아니에요: "${row[yearC]}"`)
        continue
      }
      const rec = { stock_id: sid, year: Number(row[yearC]) }
      for (const { m, col } of metCols) {
        const v = col >= 0 ? row[col] : ''
        if (v !== '' && !isNum(v)) E('재무제표', ex, `${m.label}가 숫자가 아니에요: "${v}"`)
        rec[m.db] = m.unit === '억원' ? Math.round(Number(v) || 0) : Number(v) || 0
      }
      financials.push(rec)
    }
  }

  // ── ⑤ 시황 (열은 metrics 설정에서)
  const macro = []
  const mRows = rowsOf(wb.Sheets['시황'])
  const mH = headerRow(mRows, '연도', '요약')
  if (mH < 0) E('시황', 0, '헤더(연도/요약)를 못 찾았어요')
  else {
    const H = mRows[mH]
    const yearC = colOf(H, '연도'),
      sumC = colOf(H, '요약')
    const metCols = MACRO_METRICS.map((m) => ({ m, col: colOf(H, ...[].concat(m.xlsx)) }))
    reportUnknown(H, new Set([yearC, sumC, ...metCols.map((x) => x.col)].filter((x) => x >= 0)), '시황', mH, INFO)
    for (let i = mH + 1; i < mRows.length; i++) {
      const row = mRows[i],
        ex = i + 1
      if (!isInt(row[yearC])) {
        if (s(row[sumC])) E('시황', ex, `연도가 정수가 아니에요: "${row[yearC]}"`)
        continue
      }
      const rec = { year: Number(row[yearC]), summary: s(row[sumC]) }
      for (const { m, col } of metCols) {
        const v = col >= 0 ? row[col] : ''
        if (v !== '' && !isNum(v)) E('시황', ex, `${m.label}가 숫자가 아니에요: "${v}"`)
        rec[m.key] = m.round ? Math.round(Number(v) || 0) : Number(v) || 0
      }
      macro.push(rec)
    }
  }

  // ── ④ 힌트 (방향·관련종목은 선택)
  const hints = []
  const hRows = rowsOf(wb.Sheets['힌트'])
  const hH = headerRow(hRows, '라운드', '등급')
  if (hH < 0) E('힌트', 0, '헤더(라운드/등급)를 못 찾았어요')
  else {
    const H = hRows[hH]
    const ci = { round: colOf(H, '라운드'), grade: colOf(H, '등급'), head: colOf(H, '문구'), dir: colOf(H, '방향'), rel: colOf(H, '관련') }
    reportUnknown(H, new Set([ci.round, ci.grade, ci.head, ci.dir, ci.rel].filter((x) => x >= 0)), '힌트', hH, INFO)
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
      if (!s(row[ci.head])) E('힌트', ex, '힌트 문구가 비었어요')
      // 방향(선택): 비면 flat. 있으면 up/down/flat만.
      const dirRaw = ci.dir >= 0 ? s(row[ci.dir]).toLowerCase() : ''
      let impact = 'flat'
      if (dirRaw !== '') {
        if (!IMPACTS.includes(dirRaw)) E('힌트', ex, `방향은 up/down/flat만 돼요(비워도 됨): "${row[ci.dir]}"`)
        else impact = dirRaw
      }
      // 관련종목(선택)
      const rel =
        ci.rel >= 0
          ? s(row[ci.rel])
              .split(/[,\s;]+/)
              .map((x) => x.trim())
              .filter(Boolean)
          : []
      rel.forEach((id) => {
        if (!stockIds.has(id)) E('힌트', ex, `관련 종목ID가 종목 시트에 없어요: ${id}`)
      })
      hints.push({ round: Number(row[ci.round]), grade, headline: s(row[ci.head]), impact, related_stock_ids: rel, __row: ex })
    }
  }

  // ── 교차 검증(에러 없을 때만)
  if (!errors.length) {
    const priceOf = (id, y) => stocks.find((x) => x.id === id)?.prices[y]
    for (const h of hints) {
      // 방향·관련종목이 비면 등락 검증 스킵을 info로 표시
      if (h.impact === 'flat' || h.related_stock_ids.length === 0) {
        INFO('힌트', h.__row, `R${h.round} ${h.grade}: 방향/관련종목이 없어 등락 검증을 건너뛰었어요`)
        continue
      }
      const cur = game.round_year_map[h.round]
      const nxt = game.round_year_map[h.round + 1] ?? game.final_year
      for (const id of h.related_stock_ids) {
        const p0 = priceOf(id, cur),
          p1 = priceOf(id, nxt)
        if (p0 == null || p1 == null) continue
        if (h.impact === 'up' && !(p1 > p0)) W('힌트', h.__row, `방향 up인데 ${id} ${cur}→${nxt} 가격이 안 올라요 (호재↔등락 불일치)`)
        if (h.impact === 'down' && !(p1 < p0)) W('힌트', h.__row, `방향 down인데 ${id} ${cur}→${nxt} 가격이 안 내려요 (악재↔등락 불일치)`)
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
  return { payload, errors, warnings, infos }
}

/** payload → 같은 양식(v3)의 .xlsx (Uint8Array). 가격은 절대값(원)으로 내보낸다. */
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
      ['CUFIC WTS 게임 데이터셋 제작 양식 (v3)'],
      [''],
      ['이 파일의 시트 5개를 채우면 게임 한 판이 완성됩니다.'],
      ['노란 칸 = 꼭 채우는 곳 / "(선택)" 칸 = 비워도 됨.'],
      ['종목·힌트 개수는 자유입니다. 행을 추가/삭제하면 그대로 게임 구성이 돼요.'],
      ['관리자 [데이터셋] 탭 → [📊 엑셀 업로드]로 올리면 검사 후 새 데이터셋이 됩니다.'],
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

  const kHead = ['ID', '종목명', '한 줄 소개', '업종 (선택)', '상장라운드', ...years.map((y) => `${y}년 가격`)]
  const kRows = [
    ['② 종목과 연도별 가격', ...Array(kHead.length - 1).fill('')],
    ['한 행 = 종목 하나. 가격 칸: 숫자=가격(원), %붙이면=전년 대비 등락률(예: +80%). 첫 등장 연도는 반드시 가격! 빈칸/0 = 거래정지·미상장.', ...Array(kHead.length - 1).fill('')],
    kHead,
  ]
  stocks
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .forEach((st) => kRows.push([st.id, st.name, st.description || '', st.sector || '', st.listed_from_round ?? 1, ...years.map((y) => st.prices?.[y] ?? '')]))
  XLSX.utils.book_append_sheet(wb, aoa(kRows), '종목')

  const fHead = ['종목ID', '연도', ...FIN_METRICS.map((m) => `${m.label}(${m.unit === '억원' ? '억' : m.unit})`)]
  const fRows = [
    ['③ 재무제표 (종목 × 연도)', ...Array(fHead.length - 1).fill('')],
    ['한 행 = 한 종목의 한 해. 단위: 억원(적자 음수) / %. 미상장·폐지 연도는 행을 빼세요.', ...Array(fHead.length - 1).fill('')],
    fHead,
  ]
  financials.forEach((f) => fRows.push([f.stock_id, f.year, ...FIN_METRICS.map((m) => f[m.db])]))
  XLSX.utils.book_append_sheet(wb, aoa(fRows), '재무제표')

  const hHead = ['라운드', '등급(S~D)', '힌트 문구', '방향(up/down/flat) (선택)', '관련 종목ID (선택)']
  const hRows = [
    ['④ 힌트 (라운드 × 등급)', '', '', '', ''],
    ['R1은 지급 없음. 방향·관련종목은 선택(채우면 자동 검증·종목 링크 작동, 학생에겐 방향 안 보임). 관련종목은 쉼표로.', '', '', '', ''],
    hHead,
  ]
  hints.forEach((h) => hRows.push([h.round, h.grade, h.headline, h.impact === 'flat' ? '' : h.impact, (h.related_stock_ids || []).join(',')]))
  XLSX.utils.book_append_sheet(wb, aoa(hRows), '힌트')

  const mHead = ['연도', '한 줄 요약', ...MACRO_METRICS.map((m) => `${m.label}(${m.unit})`)]
  const mRows = [
    ['⑤ 시황 (연도별 거시경제)', ...Array(mHead.length - 1).fill('')],
    ['한 행 = 한 해. 한 줄 요약은 학생 시황판 맨 위에 크게 보여요.', ...Array(mHead.length - 1).fill('')],
    mHead,
  ]
  macro.forEach((m) => mRows.push([m.year, m.summary, ...MACRO_METRICS.map((mm) => m[mm.key])]))
  XLSX.utils.book_append_sheet(wb, aoa(mRows), '시황')

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
}
