# CUFIC WTS

청소년 교육용 **라운드제 모의투자 WTS**. 조를 이뤄 참가하고, 강사가 라운드(연도)를 넘기면
주문서가 일괄 체결되면서 주가가 바뀐다. 재무제표와 힌트를 근거로 판단하는 법을 가르치는 게 목적.

- **학생 화면** `/` — 참가 코드로 입장, 주문서 작성, 차트·재무제표·힌트, 조별 순위
- **관리자 화면** `/?admin=1` — 라운드 진행, 힌트 지급, 조·종목 관리, 리더보드(프로젝터)

개발 규칙과 아키텍처는 [CLAUDE.md](CLAUDE.md), 결정 기록은
[docs/DECISIONS.md](docs/DECISIONS.md), 진행 상황은 [docs/ROADMAP.md](docs/ROADMAP.md).

## 로컬 실행

```bash
npm install
cp .env.example .env      # 값을 채운다 (아래 참고)
npm run dev               # http://localhost:5173
npm test                  # Vitest
npm run build
```

### .env

| 키 | 설명 | 비밀 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL | 아니오 |
| `VITE_SUPABASE_ANON_KEY` | anon public key — 브라우저에 노출되는 게 정상 | 아니오 |
| `VITE_ADMIN_PASSWORD` | 관리자 화면 비밀번호. DB의 admin_secret과 같아야 한다 | **예** |
| `SUPABASE_ACCESS_TOKEN` | CLI 전용 (마이그레이션 push) | **예** |
| `SUPABASE_DB_PASSWORD` | CLI 전용 | **예** |

anon key는 RLS와 RPC 검증이 보호하므로 공개돼도 된다. `.env`는 커밋되지 않는다.

## Supabase 세팅

대시보드에서 스키마를 손으로 만들지 않는다 — 재현 가능해야 한다.

```bash
npx supabase link --project-ref <ref>
npx supabase db push          # supabase/migrations/ 전체 적용
```

**시드** — 더미 종목·힌트는 `src/data.js`에서 생성한다. 원천이 하나여야 정합성 테스트와 DB가 어긋나지 않는다.

```bash
node scripts/gen-seed.mjs     # src/data.js → supabase/seed.sql
npx supabase db push --include-seed
```

> `db push --include-seed`는 **새 마이그레이션이 없으면 시드를 건너뛴다.**
> 시드만 다시 넣으려면 Supabase SQL Editor에서 `supabase/seed.sql`을 붙여넣어 실행한다.

**관리자 비밀번호** — 마이그레이션에 없다(git에 남으면 안 되므로). SQL Editor에서 한 번 실행하고
`.env`의 `VITE_ADMIN_PASSWORD`와 맞춘다:

```sql
select private.set_admin_secret('원하는_비밀');
```

이걸 안 하면 관리자 기능이 전부 `unauthorized`로 잠긴 채 시작한다(의도된 기본값).

## 대회 당일 절차

1. 관리자 화면 → **조 관리**에서 조를 만들고 시드머니를 정한다 (시작 전에만 수정 가능)
2. **종목·가격**에서 종목과 연도별 가격을 확인한다
3. **힌트**에서 라운드별 힌트를 작성한다 (등급 S~D)
4. **진행** → [대회 시작]으로 ROUND 1을 연다
5. 라운드 중 힌트를 조별로 지급한다. 학생이 주문서를 낸다
6. **진행**에서 제출 현황을 확인하고 [다음 연도로 넘어가기]
   → 전 조 주문서가 그 라운드 가격으로 일괄 체결되고 다음 연도가 공개된다
7. 마지막 라운드에서 [대회 종료] → 최종 순위 기록

**시작 전 반드시** — 테스트 조(`TEST-01`, `TIGER-03`)를 지우고, [게임 리셋]으로 초기화한다.

## ⚠ 실제 수업 전 반드시

- **종목 데이터 교체.** 지금은 실제 종목명에 **검증되지 않은** 주가·재무가 들어 있다.
  학생이 지어낸 수치를 사실로 배운다. 가상 종목으로 바꿀 예정 — `src/data.js`를 고치고 시드를 다시 만든다.
- **관리자 비밀번호 변경.** 개발용 값이 그대로면 안 된다.
- **테스트 흔적 제거.** 개발 DB가 곧 대회 DB다.

## 구조

```
src/
  supabase.js     Supabase 클라이언트 + RPC 래퍼 + 에러 문구
  gameData.js     서버에서 게임 상태를 읽어 화면용으로 가공, 실시간 신호 구독
  actions.js      상태를 바꾸는 동작 (학생·관리자). 전부 async {ok, error}
  auth.js         참가 코드 로그인 (login_team RPC)
  account.js      평가금액·손익 계산
  chart.js        캔들 생성기 (종목코드 시드, 결정론적)
  data.js         시드 생성용 더미 (화면은 쓰지 않는다)
  components/     학생 화면
  admin/          관리자 화면 (5탭)
supabase/
  migrations/     스키마·RPC. 순서대로 적용된다
  seed.sql        자동 생성 — 직접 고치지 말 것
scripts/
  gen-seed.mjs    src/data.js → supabase/seed.sql
```
