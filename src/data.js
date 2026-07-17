// 모의투자용 목업 데이터 (추후 API 연동 예정)

// 금액은 전부 보유종목에서 파생 계산한다 (src/account.js deriveAccount)
//   평가금액 = 예수금 + Σ(보유수량 × 현재가)
//   총 손익  = 평가금액 - 원금
//
// 정합성 규칙 — 데이터를 고칠 땐 이 등식을 깨지 말 것:
//   예수금 = 원금 - Σ(매수 체결금액) + Σ(매도 체결금액)
//   보유수량 = Σ(매수 수량) - Σ(매도 수량)          (종목별)
//   평균단가 = Σ(매수 체결금액) / Σ(매수 수량)      (종목별)
//
// 시작은 학생 시작 상태다: 거래 없음 → 예수금 = 원금, 보유 없음, 손익 0.
export const PRINCIPAL = 100000000 // 조별 시드머니(원금) 1억원
export const initialCash = PRINCIPAL // 거래 전이므로 원금 전액이 예수금

// ===== 라운드 =====
// 라운드는 연도에 매핑된다. 라운드가 넘어가면 그 해의 시세로 바뀌고,
// 보유 종목의 평가액이 움직이면서 비로소 손익이 생긴다. 이게 수업의 핵심 루프다.
//   재무제표·뉴스로 판단 → 매수 → 라운드 진행 → 주가 변동 → 손익 확인
export const ROUNDS = [
  { round: 1, year: 2022 },
  { round: 2, year: 2023 },
  { round: 3, year: 2024 },
]
export const initialRound = ROUNDS[0]

// 재무제표에 노출할 연도 (현재 라운드 연도 초과분은 화면에서 가림 — 스포일러 방지)
export const FIN_YEARS = [2021, 2022, 2023, 2024]

// ===== 종목 =====
// priceByYear: 연도별 주가. 2021은 게임 시작 전 기준선으로, R1(2022)의 등락률 계산에만 쓴다.
// 현재가·등락은 여기서 파생한다 (App.jsx) — 종목 객체에 price를 박아두지 않는다.
//
// 가격이 0이거나 그 해 값이 없으면 '거래정지'로 처리된다 (상장폐지 등).
// 매수 불가 + 평가액 0으로 잡히므로, 그런 시나리오를 넣어도 계산이 깨지지 않는다.
//
// desc: 청소년 대상 한 줄 소개. 재무제표 모달에 표시된다.
export const stocks = [
  { name: '삼성전자',        code: '005930', market: 'KOSPI', desc: '반도체와 스마트폰·가전을 만드는 회사예요. 우리나라에서 가장 큰 기업이에요.',        priceByYear: { 2021: 78300,  2022: 55300,  2023: 78500,  2024: 74200 } },
  { name: 'SK하이닉스',      code: '000660', market: 'KOSPI', desc: '컴퓨터와 AI 서버에 들어가는 메모리 반도체를 만들어요.',                          priceByYear: { 2021: 131000, 2022: 75000,  2023: 141500, 2024: 183500 } },
  { name: 'NAVER',          code: '035420', market: 'KOSPI', desc: '검색 포털을 운영하고 웹툰·쇼핑 같은 인터넷 서비스를 해요.',                      priceByYear: { 2021: 376000, 2022: 177500, 2023: 223000, 2024: 218000 } },
  { name: '카카오',          code: '035720', market: 'KOSPI', desc: '카카오톡을 만든 회사예요. 메신저·택시·결제 서비스를 함께 해요.',                 priceByYear: { 2021: 112500, 2022: 53100,  2023: 57300,  2024: 41850 } },
  { name: '현대차',          code: '005380', market: 'KOSPI', desc: '자동차를 만들어 전 세계에 파는 회사예요.',                                     priceByYear: { 2021: 209000, 2022: 151500, 2023: 202000, 2024: 245500 } },
  // 2022년 1월 상장이라 2021년 주가가 존재하지 않는다 — 비워두면 R1 등락률이 보합으로 잡힌다.
  { name: 'LG에너지솔루션',   code: '373220', market: 'KOSPI', desc: '전기차에 들어가는 배터리를 만들어요.',                                        priceByYear: { 2022: 440000, 2023: 413000, 2024: 312000 } },
  { name: '기아',            code: '000270', market: 'KOSPI', desc: '현대차와 같은 그룹인 자동차 회사예요.',                                       priceByYear: { 2021: 83700,  2022: 66000,  2023: 100300, 2024: 118200 } },
  { name: 'POSCO홀딩스',     code: '005490', market: 'KOSPI', desc: '철을 만드는 회사예요. 요즘은 배터리 소재 사업도 하고 있어요.',                  priceByYear: { 2021: 275000, 2022: 275000, 2023: 486000, 2024: 372000 } },
  { name: '셀트리온',        code: '068270', market: 'KOSPI', desc: '바이오 의약품을 개발하고 만드는 회사예요.',                                    priceByYear: { 2021: 210000, 2022: 163000, 2023: 200000, 2024: 186300 } },
  { name: '삼성바이오로직스', code: '207940', market: 'KOSPI', desc: '다른 제약회사의 약을 대신 만들어주는 공장 역할을 해요.',                        priceByYear: { 2021: 900000, 2022: 823000, 2023: 780000, 2024: 985000 } },
  { name: 'KB금융',          code: '105560', market: 'KOSPI', desc: '국민은행을 비롯해 보험·카드를 묶은 금융 회사예요.',                            priceByYear: { 2021: 55000,  2022: 51300,  2023: 55000,  2024: 86400 } },
  { name: '삼성SDI',         code: '006400', market: 'KOSPI', desc: '전기차와 전자기기에 들어가는 배터리를 만들어요.',                              priceByYear: { 2021: 655000, 2022: 600000, 2023: 470000, 2024: 342500 } },
]

// 체결내역. 최신순으로 앞에 쌓인다. 시작 상태이므로 비어 있다.
export const initialHistory = []

// 뉴스의 related에 종목명 대신 쓸 수 있는 값. 실존 종목이 아니어도 통과한다.
export const NEWS_SENTINELS = ['전체 시장']

// ===== 시황 뉴스 =====
// impact: 'up' = 호재(빨강) / 'down' = 악재(파랑) / 'flat' = 중립(회색)
//
// 규칙 1 — related의 종목명은 반드시 위 stocks에 존재해야 한다.
//   (예외: NEWS_SENTINELS에 있는 값). 오타가 나면 학생에게 존재하지 않는 종목을
//   사라고 안내하는 꼴이 된다. 아래 개발용 검사가 콘솔로 잡아준다.
//
// 규칙 2 — 뉴스는 "그 라운드에 발표되어 '다음' 라운드 주가를 예고"하는 힌트다.
//   학생이 R1에서 호재를 읽고 사면 R2에 오른다 — 이게 학습 포인트다.
//   따라서 impact는 반드시 다음 해의 실제 등락과 맞아야 한다. 위 priceByYear와
//   어긋나면 학생이 정직하게 판단해도 손해를 보므로, 시세를 고칠 땐 뉴스도 같이 고칠 것.
//   (마지막 라운드 뉴스는 예고할 다음 해가 없어 단순 시황이다.)
export const initialNews = [
  // ── R1 (2022) → 2023년 등락 예고
  {
    id: 'r1-1', round: 1, time: '14:30', impact: 'up',
    headline: '메모리 감산 효과 가시화… 반도체 업황 바닥 통과 전망',
    related: ['삼성전자', 'SK하이닉스'],
  },
  {
    id: 'r1-2', round: 1, time: '13:10', impact: 'up',
    headline: '완성차 북미 판매 사상 최대, 원화 약세도 실적에 보탬',
    related: ['현대차', '기아'],
  },
  {
    id: 'r1-3', round: 1, time: '11:25', impact: 'up',
    headline: '포스코, 이차전지 소재 사업 본격화… 리튬 확보 기대감',
    related: ['POSCO홀딩스'],
  },
  {
    id: 'r1-4', round: 1, time: '10:40', impact: 'down',
    headline: '배터리 소재 가격 급락, 전기차 수요 둔화 조짐',
    related: ['삼성SDI', 'LG에너지솔루션'],
  },
  {
    id: 'r1-5', round: 1, time: '09:30', impact: 'flat',
    headline: '한국은행 기준금리 3.25%로 인상… 긴축 속도 조절 시사',
    related: ['전체 시장'],
  },

  // ── R2 (2023) → 2024년 등락 예고
  {
    id: 'r2-1', round: 2, time: '14:45', impact: 'up',
    headline: 'AI 서버 열풍에 HBM 품귀… 글로벌 수주 사실상 독식',
    related: ['SK하이닉스'],
  },
  {
    id: 'r2-2', round: 2, time: '13:20', impact: 'up',
    headline: '정부 밸류업 프로그램 발표, 저PBR 금융주 재평가 기대',
    related: ['KB금융'],
  },
  {
    id: 'r2-3', round: 2, time: '11:55', impact: 'up',
    headline: '글로벌 제약사 대형 수주 잇따라… 4공장 풀가동 돌입',
    related: ['삼성바이오로직스'],
  },
  {
    id: 'r2-4', round: 2, time: '10:30', impact: 'down',
    headline: '전기차 캐즘 본격화, 배터리 3사 목표주가 줄하향',
    related: ['LG에너지솔루션', '삼성SDI'],
  },
  {
    id: 'r2-5', round: 2, time: '09:40', impact: 'down',
    headline: '플랫폼 규제 논의 재점화… 카카오 경영 리스크 부각',
    related: ['카카오'],
  },
  {
    id: 'r2-6', round: 2, time: '09:15', impact: 'down',
    headline: '철강 업황 둔화, 중국 저가 공세 심화로 마진 압박',
    related: ['POSCO홀딩스'],
  },

  // ── R3 (2024) 시황 (마지막 라운드 — 예고할 다음 해 없음)
  {
    id: 'r3-1', round: 3, time: '14:30', impact: 'up',
    headline: '반도체 수출 3개월 연속 증가… AI 서버용 HBM 수요가 견인',
    related: ['삼성전자', 'SK하이닉스'],
  },
  {
    id: 'r3-2', round: 3, time: '13:05', impact: 'down',
    headline: '전기차 캐즘 장기화 우려… 배터리 3사 목표주가 줄하향',
    related: ['LG에너지솔루션', '삼성SDI'],
  },
  {
    id: 'r3-3', round: 3, time: '11:40', impact: 'flat',
    headline: '한국은행 기준금리 동결… "물가 둔화 흐름 더 확인해야"',
    related: ['전체 시장'],
  },
  {
    id: 'r3-4', round: 3, time: '09:30', impact: 'up',
    headline: '완성차 3사 미국 판매 호조, 하이브리드 비중 사상 최대',
    related: ['현대차', '기아'],
  },
]

// 개발 중 데이터 정합성 검사. 주석은 오타를 막지 못하므로 실제로 확인시킨다.
// 위 규칙 1을 어긴 뉴스가 있으면 콘솔에 뜬다. (운영 빌드에서는 제거됨)
if (import.meta.env?.DEV) {
  const known = new Set([...stocks.map((s) => s.name), ...NEWS_SENTINELS])
  const bad = initialNews.flatMap((n) =>
    n.related.filter((r) => !known.has(r)).map((r) => `${n.id}: "${r}"`),
  )
  if (bad.length) {
    console.error(
      '[data.js] 뉴스의 관련 종목이 stocks에 없습니다. 오타이거나 지운 종목입니다:\n  ' +
        bad.join('\n  '),
    )
  }
}

// ===== 재무제표 =====
// 단위: 매출액·영업이익·당기순이익 = 억원 / 부채비율·ROE = %
export const FIN_METRICS = [
  { key: 'revenue', label: '매출액', unit: '억원', desc: '회사가 물건이나 서비스를 팔아서 벌어들인 돈 전체예요.' },
  { key: 'opIncome', label: '영업이익', unit: '억원', desc: '매출액에서 재료비·인건비 같은 비용을 뺀, 본업으로 남긴 이익이에요.' },
  { key: 'netIncome', label: '당기순이익', unit: '억원', desc: '이자와 세금까지 전부 내고 최종적으로 남은 이익이에요.' },
  { key: 'debtRatio', label: '부채비율', unit: '%', desc: '내 돈에 비해 빚이 얼마나 많은지예요. 낮을수록 안정적이고, 보통 200%보다 낮으면 양호하다고 봐요.' },
  { key: 'roe', label: 'ROE', unit: '%', desc: '내 돈으로 얼마나 잘 벌었는지 보여주는 지표예요. 높을수록 장사를 잘한 거예요.' },
]

export const financials = {
  '005930': {
    2021: { revenue: 2796048, opIncome: 516339, netIncome: 399074, debtRatio: 39.9, roe: 13.9 },
    2022: { revenue: 3022314, opIncome: 433766, netIncome: 556541, debtRatio: 36.1, roe: 17.1 },
    2023: { revenue: 2589355, opIncome: 65670, netIncome: 154871, debtRatio: 25.4, roe: 4.1 },
    2024: { revenue: 3007771, opIncome: 326725, netIncome: 340120, debtRatio: 27.9, roe: 8.6 },
  },
  '000660': {
    2021: { revenue: 429978, opIncome: 124103, netIncome: 96162, debtRatio: 53.9, roe: 16.8 },
    2022: { revenue: 446216, opIncome: 68094, netIncome: 22417, debtRatio: 63.1, roe: 3.6 },
    2023: { revenue: 327657, opIncome: -77303, netIncome: -91375, debtRatio: 87.4, roe: -15.6 },
    2024: { revenue: 572000, opIncome: 234000, netIncome: 198400, debtRatio: 62.2, roe: 28.4 },
  },
  '035420': {
    2021: { revenue: 68176, opIncome: 13255, netIncome: 164776, debtRatio: 45.2, roe: 41.2 },
    2022: { revenue: 82201, opIncome: 13047, netIncome: 6640, debtRatio: 51.8, roe: 1.5 },
    2023: { revenue: 96706, opIncome: 14888, netIncome: 6845, debtRatio: 49.3, roe: 1.5 },
    2024: { revenue: 105000, opIncome: 19500, netIncome: 8210, debtRatio: 47.1, roe: 1.8 },
  },
  '035720': {
    2021: { revenue: 61367, opIncome: 5949, netIncome: 16419, debtRatio: 42.7, roe: 12.4 },
    2022: { revenue: 71068, opIncome: 5803, netIncome: 10625, debtRatio: 45.9, roe: 7.3 },
    2023: { revenue: 79000, opIncome: 4609, netIncome: -7360, debtRatio: 52.3, roe: -5.1 },
    2024: { revenue: 78700, opIncome: 4200, netIncome: 1140, debtRatio: 54.8, roe: 0.8 },
  },
  '005380': {
    2021: { revenue: 1176106, opIncome: 66789, netIncome: 56931, debtRatio: 172.4, roe: 8.0 },
    2022: { revenue: 1425275, opIncome: 98249, netIncome: 79836, debtRatio: 168.9, roe: 10.4 },
    2023: { revenue: 1626636, opIncome: 151269, netIncome: 122723, debtRatio: 161.2, roe: 14.5 },
    2024: { revenue: 1750000, opIncome: 142000, netIncome: 118300, debtRatio: 155.7, roe: 12.9 },
  },
  '373220': {
    2021: { revenue: 178519, opIncome: 7685, netIncome: 9299, debtRatio: 128.4, roe: 6.4 },
    2022: { revenue: 255986, opIncome: 12137, netIncome: 7798, debtRatio: 84.2, roe: 3.4 },
    2023: { revenue: 337455, opIncome: 21632, netIncome: 16380, debtRatio: 76.5, roe: 6.2 },
    2024: { revenue: 258000, opIncome: 5800, netIncome: 3120, debtRatio: 81.3, roe: 1.1 },
  },
  '000270': {
    2021: { revenue: 698624, opIncome: 50657, netIncome: 46000, debtRatio: 78.4, roe: 12.1 },
    2022: { revenue: 863559, opIncome: 72331, netIncome: 54090, debtRatio: 72.6, roe: 13.2 },
    2023: { revenue: 999666, opIncome: 116079, netIncome: 87778, debtRatio: 62.1, roe: 19.4 },
    2024: { revenue: 1075000, opIncome: 129000, netIncome: 96500, debtRatio: 55.3, roe: 18.8 },
  },
  '005490': {
    2021: { revenue: 763323, opIncome: 92381, netIncome: 71958, debtRatio: 62.4, roe: 12.9 },
    2022: { revenue: 848021, opIncome: 48501, netIncome: 33500, debtRatio: 64.1, roe: 5.6 },
    2023: { revenue: 771272, opIncome: 35314, netIncome: 18456, debtRatio: 65.8, roe: 3.1 },
    2024: { revenue: 728000, opIncome: 21000, netIncome: 9800, debtRatio: 67.2, roe: 1.6 },
  },
  '068270': {
    2021: { revenue: 19116, opIncome: 7442, netIncome: 5942, debtRatio: 32.1, roe: 15.2 },
    2022: { revenue: 22840, opIncome: 6472, netIncome: 5426, debtRatio: 29.8, roe: 12.4 },
    2023: { revenue: 21764, opIncome: 6510, netIncome: 5340, debtRatio: 27.4, roe: 10.1 },
    2024: { revenue: 35573, opIncome: 4920, netIncome: 3210, debtRatio: 24.6, roe: 3.4 },
  },
  '207940': {
    2021: { revenue: 15680, opIncome: 5373, netIncome: 3936, debtRatio: 42.3, roe: 9.1 },
    2022: { revenue: 30013, opIncome: 9836, netIncome: 7981, debtRatio: 51.7, roe: 13.6 },
    2023: { revenue: 36946, opIncome: 11137, netIncome: 8577, debtRatio: 44.2, roe: 11.8 },
    2024: { revenue: 45473, opIncome: 13201, netIncome: 10150, debtRatio: 40.5, roe: 12.4 },
  },
  '105560': {
    2021: { revenue: 158000, opIncome: 58000, netIncome: 44096, debtRatio: 1180, roe: 9.8 },
    2022: { revenue: 172000, opIncome: 62000, netIncome: 44133, debtRatio: 1215, roe: 9.3 },
    2023: { revenue: 181000, opIncome: 63500, netIncome: 46319, debtRatio: 1190, roe: 9.1 },
    2024: { revenue: 195000, opIncome: 70200, netIncome: 51200, debtRatio: 1160, roe: 9.6 },
  },
  '006400': {
    2021: { revenue: 137532, opIncome: 10676, netIncome: 12659, debtRatio: 68.3, roe: 8.4 },
    2022: { revenue: 201241, opIncome: 18080, netIncome: 20659, debtRatio: 74.1, roe: 11.9 },
    2023: { revenue: 226708, opIncome: 16334, netIncome: 20659, debtRatio: 79.6, roe: 10.2 },
    2024: { revenue: 165000, opIncome: 3200, netIncome: 2100, debtRatio: 86.4, roe: 1.0 },
  },
}
