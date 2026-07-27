# 현황 스냅샷 (STATUS)

> **갱신: 2026-07-27** · 게임 모델 **v3**(즉시 체결 + 라운드 타이머) 기준.
> 이 문서는 "지금 이 순간 무엇이 있고 무엇이 없나"의 완전한 스냅샷이다. 외부 검수·내년 인수인계용.
> 판단의 *이유*는 [DECISIONS.md](DECISIONS.md), 게임 *규칙*은 [GAME_RULES.md](GAME_RULES.md),
> *화면*은 [SCREENS.md](SCREENS.md), *데이터 교체*는 [DATA_GUIDE.md](DATA_GUIDE.md),
> *대회 운영*은 [OPERATIONS.md](OPERATIONS.md)를 본다.

한 줄 요약: **프로토타입이 전 과정(로그인→매매→라운드 전환→자동 힌트→최종 정산) 실측으로 돈다.
콘텐츠(주가·재무·힌트 문구)는 아직 초안이고, 배포·실기기·대회 전 초기화는 미착수다.**

---

## 1. 전체 진행률

### ✅ 완료 (동작 확인됨)

**백엔드 (Supabase, 프로젝트 `cufic_wts` / `zhwidhvoxcoljffvqhol`, 서울)**
- 마이그레이션 **17개**(0001~0017) 전부 remote 적용. 스키마 재현 가능(대시보드 수동 편집 없음).
- **즉시 체결 + 라운드 타이머** — `place_order`가 그 자리에서 체결, `now() < round_ends_at`을 서버가 강제.
- **게임 루프** — `advance_round`(연도 넘기기) → `start_round_timer`(거래 창 열기, 분 단위) → 자동 마감.
- **자동 힌트 차등 지급** — R2부터 `distribute_round_hints`가 순위 기반 배분(꼴찌=S). 수동 지급 보조.
- **최종 정산** — `admin_end_game`이 `final_year`(2025) 가격을 공개하고 스냅샷. R5·최종 두 지점 모두 기록(0017).
- **공통 속보** — `broadcasts` 전원 공개, 실시간 신호.
- **실시간** — `signals` 테이블 + Realtime. 신호 수신 → 각자 RPC 재조회.
- **관리자 보호** — 관리자 RPC 전부 `p_admin_secret` + `private.verify_admin`. 비밀은 `private` 스키마, fail-closed.

**학생 화면**
- 참가 코드 로그인(서버 검증) · 새로고침 자동 재로그인 · 로딩/실패/오프라인 처리.
- 즉시 매수·매도(비율 버튼·수량 스테퍼) · 거래 타이머 카운트다운 · 타이머 밖 버튼 잠금.
- 힌트(헤더 버튼 → 팝업, 등급 S~D, 내 조 것만, 도착 토스트).
- 차트(결정론적 캔들·추세선 그리기) · 재무제표(연도 스포일러 차단) · MY 계좌(보유/체결/**수익률 차트**).
- 조별 순위 팝업 · 라운드 전환 요약 모달 · **대회 종료 모달**(전체 순위) · 속보 팝업.
- 다크/라이트 · 태블릿 대응(44px 터치·세로 회전 안내).

**관리자 화면 (`/?admin=1`)**
- 진행(연도 넘기기·타이머 시작·대회 종료·리셋·속보·거래 현황) · 힌트(풀 CRUD·수동 지급·**자동 배분 미리보기**)
  · 조 관리(추가/삭제·시드) · 종목·가격(연도별 인라인 편집) · 리더보드(큰 글씨 모드).

**데이터 / 품질**
- 2025 기반 초안 데이터 이식(**18종목 · 5라운드 2020~2024 · 최종 2025**). `src/data.js`는 생성물.
- **Vitest 68개 전부 통과**(5파일). `verify_game.mjs`로 5라운드 실 DB 시뮬레이션 11건 통과.

### 🟡 진행 중 / 확정 대기

- **콘텐츠 검토** — 종목 소개·힌트 문구·재무 수치는 **팀 검토 전 초안**. 구조는 확정, 값은 미확정.
- **힌트 자동 배분 매핑 공식 `[잠정]`** — `floor((순위−1)÷조수×5)` D→S, 꼴찌=S. **팀 컨펌 대기**(→ GAME_RULES).
- **관리자 비밀번호 강화** — 현재 개발 기본값(약함). 실전용 강한 값으로 교체 대기(값은 사용자 지정 필요).
- **순위 상시 노출 여부** — 팀 결정 대기(현재는 팝업 + 리더보드 탭).

### ⬜ 미착수

- **배포/호스팅** — 어디에 올릴지 미정(Vercel 등). 교육장 와이파이 Supabase 접속 확인 필요.
- **실기기 테스트** — 실제 태블릿 터치·그리기·회전(지금은 헤드리스 브라우저 검증만).
- **대회 전 초기화** — `reset_game` 리허설 + 검증용 조(`TEST-01`·`TIGER-03`) 삭제.
- **봉 주기 실데이터화** — 일/주/월/년이 전부 같은 1년 구간(알려진 껍데기).
- **파일 정리** — `index.css` 분리(리팩터, 후순위).

---

## 2. 파일 지도

> 전 파일 1줄 설명. 자동 생성 파일(`src/data.js`·`supabase/seed.sql`)은 직접 편집 금지.

### `src/` — 진입점·유틸
| 파일 | 역할 |
|---|---|
| `main.jsx` | React 진입점. `App`을 `#root`에 마운트, `index.css`·`admin.css` 로드 |
| `App.jsx` | 최상위. `?admin`이면 관리자, 아니면 학생 화면. 학생 상태·데이터 로드·실시간 신호·모달 오케스트레이션 |
| `account.js` | 계좌 파생 순수함수. `deriveAccount`(평가금액=예수금+보유평가, 총손익), `positionPnl` |
| `chart.js` | 종목별 결정론적 캔들 생성(`candleSeries`), 봉주기(`TIMEFRAMES`), 이동평균(`movingAverage`) |
| `draw.js` | 차트 낙서 기하 순수함수. 점-선분 거리(`distToSegment`), 지우개 판정(`strokeHit`) |
| `format.js` | 숫자·부호·방향 포맷(`num`,`signed`,`pct`,`dirOf`,`arrowOf`,`eok`,`nowTime`). 한국 증시 색 관례 |
| `gameData.js` | 서버 상태→화면 가공. `yearOf`,`buildStocks`,`loadAll`,`refetchMine`,`subscribeSignals` |
| `supabase.js` | Supabase 클라이언트 + `rpc`/`select` 래퍼(`{ok,error}`) + 거부 사유→한국어(`errorText`) |
| `auth.js` | 참가 코드 로그인(`login_team`), localStorage 저장, 자동 재로그인(`restore`), `logout` |
| `theme.js` | 다크/라이트 테마 훅(`useTheme`). `<html data-theme>` + localStorage |
| `useSize.js` | `ResizeObserver`로 엘리먼트 실측 크기 추적(SVG viewBox 정합) |
| `actions.js` | 상태 변경 동작. 학생 `makeActions`(placeOrder), 관리자 `makeAdminActions`(매 호출 `p_admin_secret`) |
| `data.js` | **자동 생성**. 시드·재무제표 모달·정합성 테스트의 공통 원천(종목·가격·힌트·재무·상수) |
| `index.css` | 학생 화면 스타일 + 테마 CSS 변수(다크/라이트). 색 하드코딩 금지 |
| `admin.css` | 관리자 화면·부팅/로딩/에러 스타일 |

### `src/` — 테스트
| 파일 | 커버 |
|---|---|
| `account.test.js` | `deriveAccount`·`positionPnl`(평가금액 파생, 거래정지 −100%) |
| `chart.test.js` | `candleSeries`·`movingAverage`(차트 방향 = 실제 등락, 회귀) |
| `draw.test.js` | `distToSegment`·`strokeHit`(지우개 선분 판정, 회귀) |
| `data.test.js` | 데이터 정합성(종목·힌트·재무·라운드 전수, **호재/악재 태그↔다음 해 등락**) |
| `components/QtyStepper.test.jsx` | 수량 입력(클램프·Esc·전체선택 타이밍, 회귀) |

### `src/components/` — 학생 화면
| 파일 | 역할 |
|---|---|
| `Modal.jsx` | 공통 모달(딤·X·ESC·포커스 트랩·배경 스크롤 잠금, `wide` 옵션) |
| `Toast.jsx` | 토스트 훅(`useToasts`)·렌더러(2.6초 자동 소멸, 클릭형 지원) |
| `ThemeToggle.jsx` | 다크/라이트 토글 버튼(해·달 SVG) |
| `RotateNotice.jsx` | 세로 화면(1023px↓) CSS 회전 안내 오버레이(JS 감지 없음) |
| `DrawLayer.jsx` | 차트 위 그리기 SVG(펜·추세선·지우개, 좌표 0~1 정규화) |
| `QtyStepper.jsx` | 주문 수량 입력(−/+·직접입력·방향키·클램프)과 비율 버튼(`QtyRatios`) |
| `Login.jsx` | 참가 코드 입장 화면 |
| `Header.jsx` | 상단 헤더(팀·라운드·거래 타이머·순위·내 힌트·속보 종·계좌 요약·테마·로그아웃) |
| `StockList.jsx` | 좌측 종목 목록(현재가·등락률·거래정지·상장예정 숨김·보유주)과 MY 열기 |
| `Chart.jsx` | 가운데 차트 패널(종목 정보·재무 버튼·그리기·봉주기·캔들/MA/현재가선) |
| `OrderSheet.jsx` | 우측 주문 패널(즉시 체결 매수/매도·비율·예상금액·거래 안내·보유종목) |
| `FinancialModal.jsx` | 재무제표 모달(소개 + 연도별 5지표, 현재 라운드 초과 연도 스포일러 차단) |
| `HintModal.jsx` | 내 힌트 팝업(등급·라운드·헤드라인·관련 종목. 호재/악재는 **의도적 미표시**) |
| `BroadcastModal.jsx` | 속보(공통) 팝업, 최신순 |
| `MyModal.jsx` | MY 계좌(요약 바 + 보유종목/체결내역/**수익률 차트** 탭. 로그 곡선·라운드별 % 막대) |
| `RoundModal.jsx` | 라운드 전환 요약(새 연도·내 평가금액 변동·보유 최고/최저 등락) |
| `FinalModal.jsx` | 대회 종료 모달(내 최종 순위·자산·수익률 + 전체 조 순위표) |
| `RankingModal.jsx` | 전체 조 순위 팝업(내 조 강조) |

### `src/admin/` — 관리자 5탭
| 파일 | 역할 |
|---|---|
| `Admin.jsx` | 관리자 셸(비밀번호 로그인·sessionStorage·실시간 구독·탭 네비게이션) |
| `AdminProgress.jsx` | 진행 탭(연도 넘기기·타이머 시작·대회 종료·리셋·속보·거래 현황) |
| `AdminHints.jsx` | 힌트 탭(풀 CRUD·조별 수동 지급/취소·**자동 배분 미리보기**·힌트 편집기) |
| `AdminTeams.jsx` | 조 관리 탭(추가/삭제·시드 설정[시작 전만]·예수금/평가/수익률/거래·힌트 현황) |
| `AdminStocks.jsx` | 종목·가격 탭(연도별 인라인 편집·0=거래정지·종목 CRUD·소급 안 됨 경고) |
| `AdminBoard.jsx` | 리더보드 탭(순위·등락 ▲▼·수익률·프로젝터용 큰 글씨) |

### `scripts/`
| 파일 | 역할 |
|---|---|
| `build-data.mjs` | JSON(주가·재무) + 내장 소개·힌트(DESC/HINTS) → `src/data.js` 생성 |
| `gen-seed.mjs` | `src/data.js` → `supabase/seed.sql` 생성(재적용 가능 DELETE+INSERT) |
| `verify_game.mjs` | Management API로 실 DB 5라운드 풀 시뮬레이션(`--yes` 필수, `reset_game` 하므로 대회 중 금지) |

### `supabase/`
| 파일 | 역할 |
|---|---|
| `migrations/*.sql` | 스키마·RPC 이력 17개(아래 §3, DATA_GUIDE 참조) |
| `seed.sql` | **자동 생성**. game_state·stocks(18)·hints·검증용 조(TEST-01·TIGER-03) 재삽입 |
| `config.toml` | Supabase CLI 설정(project_id, 포트, seed 지정) |

### 루트 / 문서
| 파일 | 역할 |
|---|---|
| `package.json` | npm(dev/build/test), React 18·@supabase/supabase-js, Vite 5·Vitest |
| `vite.config.js` | Vite(react) + Vitest(jsdom·globals·setup) |
| `index.html` | HTML 진입점(ko, data-theme, 첫 페인트 전 테마 적용) |
| `test/setup.js` | Vitest 셋업(@testing-library/jest-dom) |
| `.env.example` | 환경변수 템플릿(`.env`는 커밋 금지, 실제 비밀) |
| `seed_stocks_2025.json` | 종목·연도별 가격·상장 라운드·round_year_map·final_year 원천(build-data 입력) |
| `seed_financials_2025.json` | 종목별 연도별 재무제표 원천(build-data 입력) |
| `재무제표_초안.md` · `콘텐츠_초안_종목소개_힌트.md` | 사람이 읽는 콘텐츠 초안(팀 검토용) |
| `CLAUDE.md` | 개발 규칙·아키텍처·게임 규칙(리뷰 기준) |
| `README.md` | 개요·실행·세팅·당일 절차 |
| `docs/DECISIONS.md` · `ROADMAP.md` · `function_btn.md` | 결정 기록 · 로드맵 · 기능/버튼 참조 |

---

## 3. DB 현황

### 3.1 테이블 (17개 마이그레이션 적용 후 현재)

| 테이블 | 핵심 컬럼(의미) |
|---|---|
| `game_state` (단일 행 id=1) | `current_round`(0=시작전, total+1=종료), `total_rounds`(5), `round_year_map`(라운드→연도), `default_seed`(기본 시드), `is_locked`, `round_ends_at`(거래 마감 시각), `round_duration_seconds`(기본 600), `final_year`(2025), `is_ended` |
| `stocks` | `id`(PK), `name`(unique), `description`, `sector`, `listed_from_round`(신규상장), `prices`(연도→가격, 0/없음=거래정지), `display_order` |
| `teams` | `id`(uuid), `code`(unique, 로그인 신원), `name`, `seed`(초기자본), `cash`(예수금) |
| `positions` (PK team+stock) | `quantity`(보유), `avg_price`(가중평균단가). 전량 매도 시 행 삭제 |
| `trades` | `side`(buy/sell), `price`, `quantity`, `round`, `realized_pnl`(매도만), `created_at` |
| `round_snapshots` (PK team+round) | `equity`(그 라운드 떠날 때 평가금액). 종료 스냅샷 round=total+1 |
| `hints` | `round`, `grade`(S~D), `headline`, `impact`(up/down/flat), `related_stock_ids[]` |
| `hint_grants` (PK hint+team) | 누가 어떤 힌트를 받았나 + `granted_at` |
| `signals` | `kind`, `payload`(jsonb), `created_at`. Realtime publication 등록 |
| `broadcasts` | `round`, `headline`, `created_at`. 전원 공개 |
| `private.config` | `key`(admin_secret)/`value`. PostgREST 노출 경로 없음 |
| `public_teams` (뷰) | teams에서 `code` 제외 공개(id·name·seed·created_at) |

**삭제됨** — `news`(0001 생성 → 0005 drop, 힌트로 대체), `order_sheets`(0004 생성 → **0016 drop**, 즉시 체결 확정).

### 3.2 RPC (최종 정의 기준)

**학생용 (anon 호출, 비밀 불필요)**
| 함수 | 파라미터 | 반환 | 설명 |
|---|---|---|---|
| `login_team` | `(p_code)` | `{ok, team_id, code, name}` / `unknown_code` | 참가 코드 검증(upper/trim). 목록은 안 줌 |
| `place_order` | `(p_team_code, p_stock_id, p_side, p_quantity)` | `{ok, new_cash, new_quantity, new_avg_price, price, realized_pnl}` | **즉시 체결.** 타이머 안에서만, 밖이면 `round_closed`. 예수금·보유 검증 |
| `current_price` | `(p_stock_id)` | bigint | 현재 라운드 가격. 없으면 `final_year` 폴백. 0=거래정지 |
| `team_equity` | `(p_team_id)` | bigint | 예수금 + Σ(보유×현재가) |
| `team_cash` | `(p_team_id)` | bigint | 예수금 |
| `leaderboard` | `()` | table(rank,team_id,name,equity,pnl,pnl_pct,prev_rank) | 현재 순위 + 직전 스냅샷 대비 등락 |
| `get_my_hints` | `(p_team_code)` | table(id,round,grade,headline,impact,related_stock_ids,granted_at) | 내 조 지급 힌트만 |

**관리자용 (`p_admin_secret` 필수 → `verify_admin` 실패 시 `unauthorized`)**
| 함수 | 파라미터 | 설명 |
|---|---|---|
| `advance_round` | `(secret)` | 연도 넘기기. 떠나는 라운드 스냅샷 → 새 가격 공개 → `distribute_round_hints` 자동 배분 |
| `start_round_timer` | `(secret, p_minutes=null)` | 거래 창 열기. 분 지정 시 `round_duration_seconds`도 갱신 |
| `admin_end_game` | `(secret)` | 대회 종료. 떠나는 라운드 + 최종(2025) 스냅샷, `is_ended=true` |
| `reset_game` | `(secret)` | snapshots/trades/positions/hint_grants/broadcasts 삭제, cash=seed, round=0 |
| `admin_teams_status` | `(secret)` | 조별 seed/cash/equity/pnl + 이번 라운드 거래 수 + 힌트 수 |
| `admin_create_team`/`admin_delete_team`/`admin_set_team_seed` | `(secret, p_code, …)` | 조 CRUD(시드 변경은 `current_round>0`이면 거부) |
| `admin_list_hints`/`admin_upsert_hint`/`admin_delete_hint` | `(secret, …)` | 힌트 풀 관리 |
| `admin_grant_hints`/`grant_hint`/`revoke_hint` | `(…, secret)` | 조별 지급/단건 지급/취소 |
| `admin_upsert_stock`/`admin_delete_stock` | `(secret, …)` | 종목 CRUD (⚠ `listed_from_round`·`sector`는 파라미터에 없음 → 시드/직접 SQL로만) |
| `admin_send_broadcast`/`admin_delete_broadcast` | `(secret, …)` | 속보 발송/회수 |
| `admin_login` | `(secret)` | 비밀번호 검증만 |

**내부용 (anon에서 execute revoke — 다른 RPC 안에서만)**
| 함수 | 설명 |
|---|---|
| `emit_signal(kind, payload)` | signals 삽입 |
| `distribute_round_hints(round)` | 순위 기반 자동 차등 지급(꼴찌=S). `advance_round`가 호출 |
| `private.set_admin_secret(secret)` | admin_secret 설정(SQL Editor/Management API로만) |
| `private.verify_admin(secret)` | 비밀 검증. fail-closed(미설정=false) |

**drop된 함수** — `save_order_sheet`·`get_my_order_sheet`·`order_funds_ok`(0016), 무인자 `advance_round`/`reset_game`·2인자 `grant_hint`/`revoke_hint`(0009), `start_round_timer(text)`(0016).

### 3.3 보안 상태

- **쓰기 정책이 하나도 없다.** RLS 활성 테이블은 정책 없는 insert/update/delete가 기본 거부 →
  **모든 쓰기는 `security definer` RPC로만.** 클라이언트가 `teams.cash`를 직접 못 고친다.
- **읽기 정책** — `game_state`·`stocks`·`positions`·`trades`·`round_snapshots`·`signals`·`broadcasts`는
  `using(true)`(공개). **`teams`·`hints`·`hint_grants`는 읽기 정책 없음** — REST로 못 긁고 RPC로만.
  `teams`는 `public_teams` 뷰(code 제외)만 공개.
- **관리자 비밀** — `private.config`에 저장. Supabase는 PostgREST에 `public`만 노출하므로 `private`는
  REST 경로 자체가 없다. `set_admin_secret`으로 부트스트랩(git에 값 없음), `verify_admin`이 fail-closed.
- **`current_price` 권한 (복원됨, 0018)** — 0008의 `security definer`가 0016 재정의에서 유실됐던 것을
  **0018에서 복원**했다(`security definer` + `set search_path=public`, `team_equity`와 일치. `prosecdef=true` 확인).
  재정의 시 두 속성을 유지하라는 코멘트를 함수에 달아 회귀를 막았다.

---

## 4. 검증 현황

### 자동 테스트 — **Vitest 68개 / 5파일 전부 통과** (`npm test`, 2026-07-27 확인)
- `account.test.js`(10) — 평가금액 파생, 거래정지 −100%, 0 나눗셈 방지.
- `chart.test.js`(13) — 차트 방향 = 실제 등락(회귀), 신규상장 시작점, 결정론성.
- `draw.test.js`(10) — 지우개 선분 판정(회귀).
- `data.test.js`(20) — 종목·힌트·재무·라운드 전수 대조, **호재/악재↔다음 해 등락 일치**.
- `QtyStepper.test.jsx`(15) — 수량 입력 클램프·Esc·전체선택 타이밍(회귀).

### 수동 / 실 DB 검증 이력
- `verify_game.mjs --yes` — 5라운드 풀 시뮬(신규상장 R1 거부→R3 매수·상장폐지 평가액 0·R2~R5 자동 힌트·2025 최종 정산) **11건 통과**.
- 브라우저(playwright-core + 시스템 Chrome) — 즉시 체결·타이머 게이트·힌트 팝업·재무 스포일러·
  최종 정산 모달·수익률 차트(로그 곡선/막대) 스크린샷 확인.

### 아직 커버 안 된 영역
- **실기기 태블릿**(터치·그리기·회전) — 헤드리스만 봄.
- **동시 다접속 부하** — 여러 조 동시 매매 실측 없음.
- **관리자 화면 컴포넌트 단위 테스트** — 없음(로직은 RPC에 있어 서버에서 검증).
- **콘텐츠 정확성** — 테스트는 *내부 정합*(태그↔등락)만 본다. *현실 사실*(실제 재무 수치)은 검증 대상 아님(초안).
- **`current_price` definer** — 0018에서 복원, `prosecdef=true` 수동 확인. 속성 유지는 함수 코멘트로 안내(자동 테스트는 없음).

---

## 5. 미커밋 변경 / git ↔ DB 정합

- **작업 트리: 깨끗함** — `git status` 미커밋 변경 없음. 최신 커밋 `420e9de`.
- **마이그레이션 0001~0017 전부 remote 적용됨** — git과 스키마 일치(0017은 이번에 push, 성공).
- **⚠ 라이브 DB 데이터는 `seed.sql`과 다르다** — 검증 플레이(`verify_game.mjs`·수동 테스트)로 변형돼,
  현재 DB는 **테스트 조의 플레이 흔적**을 담고 있고 직전 세션 기준 **종료(is_ended) 상태**일 수 있다.
  *(현재 DB의 정확한 조·라운드 상태는 라이브 조회 없이는 `[미확인]`.)*
  대회 전 반드시 `reset_game` + 필요 시 시드 재적용 → OPERATIONS 참조.
- **관리자 비밀** — DB `private.config`와 `.env`가 현재 개발 기본값으로 일치(약함, 강화 대기).
