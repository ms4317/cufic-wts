# CUFIC WTS

청소년 교육용 **라운드제 모의투자 WTS**. 학생이 조를 이뤄 참가하고, 강사(관리자)가 라운드(연도)를
넘기면 주가가 바뀌며 손익이 난다. 재무제표와 힌트를 근거로 판단하는 법을 가르치는 게 목적.

- **즉시 체결 + 라운드 타이머.** 매수·매도를 누르면 서버가 그 자리에서 체결한다. 단 거래는 관리자가
  [타이머 시작]으로 연 동안에만 가능하다(기본 10분). 관리자가 [연도 넘기기]를 누르면 다음 해 가격이
  공개돼 순위가 바뀐다.
- **학생 화면** `/` — 참가 코드로 입장, 즉시 매매, 차트·재무제표·힌트, 조별 순위.
- **관리자 화면** `/?admin=1` — 라운드 진행, 타이머, 힌트, 조·종목 관리, 리더보드(프로젝터).

React 18 + Vite 5 · Supabase(Postgres + Realtime + RPC) · Vitest.

문서: 규칙 [docs/GAME_RULES.md](docs/GAME_RULES.md) · 현황 [docs/STATUS.md](docs/STATUS.md) ·
화면 [docs/SCREENS.md](docs/SCREENS.md) · 데이터 교체 [docs/DATA_GUIDE.md](docs/DATA_GUIDE.md) ·
운영 [docs/OPERATIONS.md](docs/OPERATIONS.md) · 결정 [docs/DECISIONS.md](docs/DECISIONS.md) ·
개발 규칙 [CLAUDE.md](CLAUDE.md).

## 로컬 실행

```bash
npm install
cp .env.example .env      # 값을 채운다 (아래 참고)
npm run dev               # http://localhost:5173
npm test                  # Vitest
npm run build
```

### .env

| 키 | 설명 | 비밀 | 배포에 필요? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL | 아니오 | **예** |
| `VITE_SUPABASE_ANON_KEY` | anon public key — 브라우저 노출이 정상 | 아니오 | **예** |
| `VITE_ADMIN_PASSWORD` | 관리자 비밀번호. DB의 admin_secret과 같게. 관리자 로그인 때 입력하며 **번들엔 안 들어간다**(코드가 참조 안 함) | **예** | 아니오 |
| `SUPABASE_ACCESS_TOKEN` | CLI 전용 (마이그레이션 push) | **예** | 아니오 |
| `SUPABASE_DB_PASSWORD` | CLI 전용 | **예** | 아니오 |

anon key는 RLS와 RPC 검증이 보호하므로 공개돼도 된다. `.env`는 커밋되지 않는다(‌`.gitignore`).

## Supabase 세팅

대시보드에서 스키마를 손으로 만들지 않는다 — 재현 가능해야 한다.

```bash
npx supabase link --project-ref <ref>
npx supabase db push          # supabase/migrations/ 전체 적용
```

**시드** — 종목·힌트는 `src/data.js`에서 생성한다(원천이 하나여야 정합성 테스트와 DB가 안 어긋난다).

```bash
node scripts/build-data.mjs   # JSON(주가·재무)+소개·힌트 → src/data.js
node scripts/gen-seed.mjs     # src/data.js → supabase/seed.sql
```

> `db push --include-seed`는 **새 마이그레이션이 없으면 시드를 건너뛴다.** 시드만 다시 넣으려면
> Supabase SQL Editor에서 `supabase/seed.sql`을 붙여넣어 실행한다. 자세한 절차는 [DATA_GUIDE](docs/DATA_GUIDE.md).

**관리자 비밀번호** — 마이그레이션에 없다(git에 남으면 안 되므로). SQL Editor에서 한 번 실행하고
`.env`의 `VITE_ADMIN_PASSWORD`와 맞춘다:

```sql
select private.set_admin_secret('원하는_비밀');
```

이걸 안 하면 관리자 기능이 전부 `unauthorized`로 잠긴 채 시작한다(의도된 기본값).

## 배포 (원격 플레이)

백엔드는 이미 클라우드(Supabase)라, **프론트만 정적 호스팅**하면 어디서든 접속된다. Vite SPA이므로
Vercel/Netlify/Cloudflare Pages 무엇이든 된다.

1. GitHub public 저장소에 push.
2. Vercel에서 저장소를 Import — Framework는 **Vite** 자동 인식(`npm run build` → `dist`).
3. 환경변수 **두 개만** 등록: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   (관리자 비밀번호는 번들에 안 들어가므로 등록 불필요 — 관리자가 화면에서 입력한다.)
4. 배포된 주소로 접속. 관리자는 `배포주소/?admin=1`.

## 게임 진행 (관리자)

1. **조 관리** — 조를 만들고 참가 코드를 배부한다(시드머니는 시작 전에만 수정 가능).
2. **종목·가격 / 힌트** — 데이터를 확인한다.
3. **진행** → **[연도 넘기기]**로 R1을 연다 → **[타이머 시작]**(분 지정)으로 거래 창을 연다.
4. 학생이 즉시 매매 → 타이머 만료로 자동 마감.
5. **[연도 넘기기]** → 다음 해 가격 공개 + 순위 변동 + (R2부터) 힌트 자동 배분 → 다시 [타이머 시작]. R5까지 반복.
6. 마지막에 **[대회 종료]** → 최종 연도(2025) 최종 정산 + 전 학생 종료 모달.

**시작 전 반드시** — 테스트 조(`TEST-01`·`TIGER-03`)를 지우고, [게임 리셋]으로 초기화한다.
(개발 DB가 곧 실서비스 DB다.) 당일 운영 순서는 [OPERATIONS](docs/OPERATIONS.md).

## 구조

```
src/
  supabase.js     Supabase 클라이언트 + RPC 래퍼 + 에러 문구
  gameData.js     서버 상태를 화면용으로 가공, 실시간 신호 구독
  actions.js      상태를 바꾸는 동작 (학생·관리자). 전부 async {ok, error}
  auth.js         참가 코드 로그인 (login_team RPC)
  account.js      평가금액·손익 계산
  chart.js        캔들 생성기 (종목코드 시드, 결정론적)
  data.js         자동 생성. 시드·재무제표 모달·정합성 테스트의 공통 원천
  components/     학생 화면
  admin/          관리자 화면 (5탭)
supabase/
  migrations/     스키마·RPC. 순서대로 적용된다
  seed.sql        자동 생성 — 직접 고치지 말 것
scripts/
  build-data.mjs  JSON + 소개·힌트 → src/data.js
  gen-seed.mjs    src/data.js → supabase/seed.sql
  verify_game.mjs 5라운드 실 DB 시뮬 검증 (--yes, reset 포함)
```
