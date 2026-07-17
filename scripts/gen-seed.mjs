// src/data.js → supabase/seed.sql 생성기
//
// 시드를 손으로 쓰지 않고 data.js에서 뽑는 이유:
// Vitest의 뉴스↔주가 정합성 테스트가 data.js를 검사하는데, 시드를 따로 관리하면
// DB와 테스트가 서로 다른 데이터를 보게 된다. 원천을 하나로 묶어 어긋날 수 없게 한다.
//
//   node scripts/gen-seed.mjs
//
// 종목 데이터를 교체할 땐 data.js만 고치고 이걸 다시 돌린 뒤 db push 하면 된다.

import { writeFileSync } from 'fs'
import { PRINCIPAL, ROUNDS, stocks, initialNews } from '../src/data.js'

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const jsonb = (o) => `${q(JSON.stringify(o))}::jsonb`

// 뉴스가 종목을 이름으로 참조하므로 id로 바꿔준다. '전체 시장' 같은 값은 버린다.
const idByName = Object.fromEntries(stocks.map((s) => [s.name, s.code]))

const roundYearMap = Object.fromEntries(ROUNDS.map((r) => [r.round, r.year]))

const lines = []
const w = (s = '') => lines.push(s)

w('-- 자동 생성 파일 — 직접 고치지 말 것.')
w('-- 원천은 src/data.js. 고치려면 거기서 고치고 `node scripts/gen-seed.mjs` 실행.')
w('--')
w('-- 이 시드는 대회용 데이터가 아니라 개발·검증용 더미다.')
w('-- 실제 종목명에 검증되지 않은 주가·재무가 들어 있으므로 수업 전 반드시 교체할 것.')
w()
w('begin;')
w()
w('-- 재적용 가능하게: 기존 데이터를 지우고 다시 넣는다')
w('-- (where true는 Supabase의 safeupdate 가드 때문 — WHERE 없는 DELETE는 거부된다)')
w('delete from round_snapshots where true;')
w('delete from trades where true;')
w('delete from order_sheets where true;')
w('delete from positions where true;')
w('delete from hint_grants where true;')
w('delete from hints where true;')
w('delete from teams where true;')
w('delete from stocks where true;')
w('delete from game_state where true;')
w()
w('-- 시드는 몇 번을 돌려도 같은 상태여야 한다.')
w('-- identity 시퀀스를 되돌리지 않으면 재시드할 때마다 id가 밀려서,')
w('-- "1번 힌트"를 참조하는 테스트나 문서가 조용히 어긋난다.')
w('alter sequence hints_id_seq restart with 1;')
w('alter sequence trades_id_seq restart with 1;')
w()

// ── game_state
w('-- 게임 설정. current_round=0 = 시작 전.')
w('-- 관리자가 [다음 연도로]를 누르면 R1이 열린다. 그 뒤부터는 누를 때마다')
w('-- 전 조 주문서가 그 라운드 가격으로 일괄 체결되고 다음 연도가 공개된다.')
w(
  `insert into game_state (id, current_round, total_rounds, round_year_map, default_seed, is_locked)\n` +
    `values (1, 0, ${ROUNDS.length}, ${jsonb(roundYearMap)}, ${PRINCIPAL}, false);`,
)
w()

// ── stocks
w('-- 종목. prices의 값이 없거나 0이면 거래정지로 동작한다.')
w("-- LG에너지솔루션은 2022년 상장이라 2021년 값이 없다 — R1 등락률이 보합으로 잡힌다.")
w('insert into stocks (id, name, description, listed_from_round, prices, display_order) values')
w(
  stocks
    .map(
      (s, i) =>
        `  (${q(s.code)}, ${q(s.name)}, ${q(s.desc ?? '')}, 1, ${jsonb(s.priceByYear)}, ${i})`,
    )
    .join(',\n') + ';',
)
w()

// ── hints
// 등급은 그 힌트가 예고하는 다음 라운드 등락폭의 크기로 매긴다.
// 큰 움직임을 알려주는 힌트일수록 가치가 높다 = S. 강사가 조별 차등 지급에 쓴다.
const roundOf = (r) => ROUNDS.find((x) => x.round === r)
const gradeOf = (n) => {
  const cur = roundOf(n.round)
  const next = roundOf(n.round + 1)
  if (!next || n.impact === 'flat') return 'D' // 예고할 다음 해가 없거나 방향을 약속하지 않음
  const moves = n.related
    .map((name) => stocks.find((s) => s.name === name))
    .filter(Boolean)
    .map((s) => {
      const a = s.priceByYear[cur.year]
      const b = s.priceByYear[next.year]
      return a && b ? Math.abs(((b - a) / a) * 100) : 0
    })
  const m = Math.max(0, ...moves)
  if (m >= 50) return 'S'
  if (m >= 30) return 'A'
  if (m >= 15) return 'B'
  if (m >= 5) return 'C'
  return 'D'
}

w('-- 힌트. 강사가 조별로 차등 지급한다 (hint_grants).')
w('-- 등급은 예고하는 등락폭 크기로 매겼다 — S가 가장 큰 움직임을 알려준다.')
w('-- 지급 기록(hint_grants)은 비워둔다. 지급은 관리자가 grant_hint로 한다.')
w('-- 지급되지 않은 힌트는 RPC(get_my_hints)로도 REST로도 안 보인다.')
w('insert into hints (round, grade, headline, impact, related_stock_ids) values')
w(
  initialNews
    .map((n) => {
      const ids = n.related.map((r) => idByName[r]).filter(Boolean)
      const arr = `array[${ids.map(q).join(',')}]::text[]`
      return `  (${n.round}, ${q(gradeOf(n))}, ${q(n.headline)}, ${q(n.impact)}, ${ids.length ? arr : `'{}'::text[]`})`
    })
    .join(',\n') + ';',
)
w()

// ── teams
w('-- 검증용 조. 대회 전에 반드시 지우고 실제 조로 교체할 것.')
w('--   TEST-01 : place_order 대조 검증 전용 (예수금을 일부러 작게)')
w('--   TIGER-03: 화면 확인용')
w('insert into teams (code, name, seed, cash) values')
w(`  ('TEST-01', '검증용', 100000, 100000),`)
w(`  ('TIGER-03', '호랑이 3조', ${PRINCIPAL}, ${PRINCIPAL});`)
w()
w('commit;')
w()

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), lines.join('\n'), 'utf8')
console.log(`seed.sql 생성 완료 — 종목 ${stocks.length}, 뉴스 ${initialNews.length}, 라운드 ${ROUNDS.length}`)
