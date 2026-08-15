// 자동 생성 파일 — 직접 고치지 말 것.
// 원천: seed_stocks_2025.json + seed_financials_2025.json + scripts/build-data.mjs(소개·힌트).
// 교체: JSON(+소개·힌트) 수정 → `node scripts/build-data.mjs` → `node scripts/gen-seed.mjs`.
//
// data.js는 FinancialModal·정합성 테스트(data.test)·시드의 공통 원천이다.

export const PRINCIPAL = 100000000 // 조별 시드머니(원금). 관리자가 조별로 바꿀 수 있고, 이건 기본값.
export const initialCash = PRINCIPAL

// 라운드 → 연도. R1=2020 … R5=2024에서 매매하고, 대회 종료 시 FINAL_YEAR로 최종 정산한다.
export const ROUNDS = [{"round":1,"year":2020},{"round":2,"year":2021},{"round":3,"year":2022},{"round":4,"year":2023},{"round":5,"year":2024}]
export const initialRound = ROUNDS[0]
export const FINAL_YEAR = 2025

// 재무제표에 노출할 연도 (현재 라운드 연도 초과분은 스포일러라 화면에서 가림)
export const FIN_YEARS = [2020,2021,2022,2023,2024,2025]

// 뉴스/힌트의 related에 종목 대신 쓸 수 있는 값 (전체 시장 등). 지금 데이터엔 미사용.
export const NEWS_SENTINELS = ['전체 시장']

export const initialHistory = []

// 종목. priceByYear 값이 없거나 0이면 거래정지. listedFromRound 이전엔 '상장 예정'.
export const stocks = [
  {
    "name": "승주보험",
    "code": "S01",
    "market": "KOSPI",
    "desc": "자동차·생명 보험을 파는 회사예요. 경기가 흔들려도 보험료가 꾸준히 들어와요.",
    "listedFromRound": 1,
    "displayOrder": 1,
    "priceByYear": {
      "2020": 29300,
      "2021": 35000,
      "2022": 50200,
      "2023": 53000,
      "2024": 52600,
      "2025": 33000
    }
  },
  {
    "name": "백만전자",
    "code": "S02",
    "market": "KOSPI",
    "desc": "반도체와 전자부품을 만드는 대형 기술 기업이에요. 경기에 따라 실적이 크게 움직여요.",
    "listedFromRound": 1,
    "displayOrder": 2,
    "priceByYear": {
      "2020": 7300,
      "2021": 13200,
      "2022": 17700,
      "2023": 12900,
      "2024": 19200,
      "2025": 25000
    }
  },
  {
    "name": "C소프트",
    "code": "S03",
    "market": "KOSPI",
    "desc": "기업용 소프트웨어를 만드는 회사예요. 한 번 계약하면 오래 쓰는 고객이 많아요.",
    "listedFromRound": 1,
    "displayOrder": 3,
    "priceByYear": {
      "2020": 10700,
      "2021": 14300,
      "2022": 13100,
      "2023": 12200,
      "2024": 13600,
      "2025": 20400
    }
  },
  {
    "name": "D게임즈",
    "code": "S04",
    "market": "KOSPI",
    "desc": "모바일 게임을 만드는 작은 회사예요. 게임 하나가 터지면 회사가 통째로 달라져요.",
    "listedFromRound": 1,
    "displayOrder": 4,
    "priceByYear": {
      "2020": 100,
      "2021": 400,
      "2022": 3700,
      "2023": 1800,
      "2024": 1700,
      "2025": 3100
    }
  },
  {
    "name": "양재금융",
    "code": "S05",
    "market": "KOSPI",
    "desc": "공격적인 투자로 유명한 금융 회사예요. 벌 때는 크게 벌지만 빚도 많아요.",
    "listedFromRound": 1,
    "displayOrder": 5,
    "priceByYear": {
      "2020": 25100,
      "2021": 38800,
      "2022": 67800,
      "2023": 31000,
      "2024": 0,
      "2025": 0
    }
  },
  {
    "name": "F모빌리티",
    "code": "S06",
    "market": "KOSPI",
    "desc": "전기 스쿠터·공유 모빌리티 스타트업이에요. 미래 성장 기대로 주목받았어요.",
    "listedFromRound": 1,
    "displayOrder": 6,
    "priceByYear": {
      "2020": 30900,
      "2021": 187700,
      "2022": 47800,
      "2023": 18100,
      "2024": 3700,
      "2025": 0
    }
  },
  {
    "name": "형록전자",
    "code": "S07",
    "market": "KOSPI",
    "desc": "부품을 납품하는 중소 전자 회사예요. 큰 회사 주문에 실적이 좌우돼요.",
    "listedFromRound": 1,
    "displayOrder": 7,
    "priceByYear": {
      "2020": 5900,
      "2021": 4900,
      "2022": 5100,
      "2023": 2600,
      "2024": 5000,
      "2025": 2000
    }
  },
  {
    "name": "백학푸드",
    "code": "S08",
    "market": "KOSPI",
    "desc": "라면·간편식을 만드는 식품 회사예요. 화려하진 않지만 꾸준히 팔려요.",
    "listedFromRound": 1,
    "displayOrder": 8,
    "priceByYear": {
      "2020": 5500,
      "2021": 5400,
      "2022": 5900,
      "2023": 6300,
      "2024": 5800,
      "2025": 6200
    }
  },
  {
    "name": "I모터스",
    "code": "S09",
    "market": "KOSPI",
    "desc": "전기차를 만드는 자동차 회사예요. 신차 반응에 따라 주가가 크게 출렁여요.",
    "listedFromRound": 1,
    "displayOrder": 9,
    "priceByYear": {
      "2020": 2700,
      "2021": 23500,
      "2022": 35200,
      "2023": 12300,
      "2024": 24800,
      "2025": 40300
    }
  },
  {
    "name": "J시스템즈",
    "code": "S10",
    "market": "KOSPI",
    "desc": "인공지능 서버 장비를 만드는 회사예요. 오랫동안 무명이었지만 기술력은 있다는 평이에요.",
    "listedFromRound": 1,
    "displayOrder": 10,
    "priceByYear": {
      "2020": 200,
      "2021": 300,
      "2022": 400,
      "2023": 600,
      "2024": 7000,
      "2025": 2200
    }
  },
  {
    "name": "경상제약",
    "code": "S11",
    "market": "KOSPI",
    "desc": "복제약과 건강기능식품을 만드는 제약사예요. 신약 개발도 조금씩 하고 있어요.",
    "listedFromRound": 1,
    "displayOrder": 11,
    "priceByYear": {
      "2020": 2800,
      "2021": 3400,
      "2022": 5600,
      "2023": 6700,
      "2024": 10300,
      "2025": 8600
    }
  },
  {
    "name": "HeeSoo ENT.",
    "code": "S12",
    "market": "KOSPI",
    "desc": "아이돌 그룹을 키우는 엔터테인먼트 회사예요. 소속 가수 활동에 따라 실적이 요동쳐요.",
    "listedFromRound": 1,
    "displayOrder": 12,
    "priceByYear": {
      "2020": 3200,
      "2021": 5400,
      "2022": 6000,
      "2023": 2900,
      "2024": 4800,
      "2025": 8900
    }
  },
  {
    "name": "M증권",
    "code": "S13",
    "market": "KOSPI",
    "desc": "새로 생긴 온라인 증권사예요. 수수료 무료 정책으로 이용자를 모으고 있어요. (R3 신규 상장)",
    "listedFromRound": 3,
    "displayOrder": 13,
    "priceByYear": {
      "2020": 0,
      "2021": 0,
      "2022": 1700,
      "2023": 800,
      "2024": 1200,
      "2025": 3700
    }
  },
  {
    "name": "N스포츠",
    "code": "S14",
    "market": "KOSPI",
    "desc": "스포츠 용품 브랜드예요. 한때 SNS에서 크게 유행했던 적이 있어요.",
    "listedFromRound": 1,
    "displayOrder": 14,
    "priceByYear": {
      "2020": 2800,
      "2021": 15100,
      "2022": 3500,
      "2023": 700,
      "2024": 600,
      "2025": 800
    }
  },
  {
    "name": "O에어로",
    "code": "S15",
    "market": "KOSPI",
    "desc": "항공기 부품을 만드는 회사예요. 여행 수요와 방산 수주에 영향을 받아요.",
    "listedFromRound": 1,
    "displayOrder": 15,
    "priceByYear": {
      "2020": 32500,
      "2021": 21400,
      "2022": 20100,
      "2023": 19000,
      "2024": 26000,
      "2025": 17700
    }
  },
  {
    "name": "윤선바이오",
    "code": "S16",
    "market": "KOSPI",
    "desc": "신약을 개발하는 바이오 벤처예요. 임상 결과 발표 하나에 주가가 급변해요.",
    "listedFromRound": 1,
    "displayOrder": 16,
    "priceByYear": {
      "2020": 1900,
      "2021": 10400,
      "2022": 25300,
      "2023": 17900,
      "2024": 9900,
      "2025": 4100
    }
  },
  {
    "name": "큐픽플랫폼",
    "code": "S17",
    "market": "KOSPI",
    "desc": "중고 거래 플랫폼을 운영하는 IT 회사예요. 이용자는 많지만 아직 적자예요.",
    "listedFromRound": 1,
    "displayOrder": 17,
    "priceByYear": {
      "2020": 1800,
      "2021": 4700,
      "2022": 4600,
      "2023": 100,
      "2024": 1000,
      "2025": 4000
    }
  },
  {
    "name": "하프케이",
    "code": "S18",
    "market": "KOSPI",
    "desc": "여러 사업을 거느린 대형 지주회사예요. 주가가 비싸고 움직임이 묵직해요.",
    "listedFromRound": 1,
    "displayOrder": 18,
    "priceByYear": {
      "2020": 323000,
      "2021": 375600,
      "2022": 475500,
      "2023": 383900,
      "2024": 476900,
      "2025": 588100
    }
  }
]

// 등급 힌트. R1은 없음. round 힌트는 그 해→다음 해 등락을 예고한다(R5는 FINAL_YEAR).
// impact: up=호재(빨강) / down=악재(파랑) / flat=중립(회색). related는 종목 code.
export const initialHints = [
  {
    "round": 2,
    "grade": "S",
    "impact": "up",
    "headline": "D게임즈 신작, 사전예약 서버가 마비됐다… 업계 '역대급 흥행' 확신",
    "related": [
      "S04"
    ]
  },
  {
    "round": 2,
    "grade": "A",
    "impact": "down",
    "headline": "거품 논란의 모빌리티 업계, 투자금이 마르고 있다는 소문 — F모빌리티 자금난설",
    "related": [
      "S06"
    ]
  },
  {
    "round": 2,
    "grade": "B",
    "impact": "up",
    "headline": "바이오 임상 발표 시즌 도래… 일부 바이오 기업에 큰 장이 설 것이란 전망",
    "related": [
      "S16"
    ]
  },
  {
    "round": 2,
    "grade": "C",
    "impact": "down",
    "headline": "작년에 SNS에서 유행한 것들, 올해도 유행하리란 법은 없다",
    "related": [
      "S14"
    ]
  },
  {
    "round": 2,
    "grade": "D",
    "impact": "up",
    "headline": "시장이 흔들릴 때는 오히려 금융이 웃는다는 옛말이 있다. 늘 맞는 말은 아니지만.",
    "related": [
      "S05"
    ]
  },
  {
    "round": 3,
    "grade": "S",
    "impact": "down",
    "headline": "큐픽플랫폼 회계 부정 의혹 내부 고발… 상장폐지 심사설까지 거론",
    "related": [
      "S17"
    ]
  },
  {
    "round": 3,
    "grade": "A",
    "impact": "down",
    "headline": "전기차 보조금 대폭 축소 예고 — 전기차·모빌리티 업계 실적 경고등",
    "related": [
      "S09",
      "S06"
    ]
  },
  {
    "round": 3,
    "grade": "B",
    "impact": "up",
    "headline": "불경기에는 결국 먹는 장사와 약 장사가 남는다는 분석",
    "related": [
      "S08",
      "S11"
    ]
  },
  {
    "round": 3,
    "grade": "C",
    "impact": "up",
    "headline": "화려한 곳에서 조용한 곳으로, 큰손들의 시선이 옮겨가고 있다",
    "related": [
      "S10"
    ]
  },
  {
    "round": 3,
    "grade": "D",
    "impact": "flat",
    "headline": "올해는 '살아남는 것'이 수익률이라는 말이 돈다",
    "related": []
  },
  {
    "round": 4,
    "grade": "S",
    "impact": "up",
    "headline": "J시스템즈, 글로벌 AI 기업과 서버 공급 계약 임박설 — 사실이면 회사가 달라진다",
    "related": [
      "S10"
    ]
  },
  {
    "round": 4,
    "grade": "A",
    "impact": "down",
    "headline": "양재금융 부채 만기 집중… 채권단 '상환 능력 의문' — 최악의 경우 상장폐지",
    "related": [
      "S05"
    ]
  },
  {
    "round": 4,
    "grade": "B",
    "impact": "up",
    "headline": "AI 붐이 진짜라면, 서버·반도체·전력 관련주가 먼저 움직인다",
    "related": [
      "S10",
      "S02",
      "S07"
    ]
  },
  {
    "round": 4,
    "grade": "C",
    "impact": "up",
    "headline": "죽었다던 그 플랫폼, 새 주인을 만났다는 소문이 있다",
    "related": [
      "S17"
    ]
  },
  {
    "round": 4,
    "grade": "D",
    "impact": "down",
    "headline": "바닥인 줄 알았는데 지하실이 있더라 — 어느 투자자의 한탄",
    "related": [
      "S16",
      "S06"
    ]
  },
  {
    "round": 5,
    "grade": "S",
    "impact": "up",
    "headline": "M증권, 이용자 1천만 돌파에 흑자 전환까지 — 증권가 '올해의 성장주' 만장일치",
    "related": [
      "S13"
    ]
  },
  {
    "round": 5,
    "grade": "A",
    "impact": "down",
    "headline": "F모빌리티 법정관리 신청 초읽기… 주식이 휴지가 될 수 있다는 경고",
    "related": [
      "S06"
    ]
  },
  {
    "round": 5,
    "grade": "B",
    "impact": "up",
    "headline": "K-콘텐츠 해외 매출 사상 최대 전망 — 엔터·게임주 수혜 기대",
    "related": [
      "S12",
      "S04"
    ]
  },
  {
    "round": 5,
    "grade": "C",
    "impact": "down",
    "headline": "작년의 영웅이 올해도 영웅인 경우는 드물다",
    "related": [
      "S10"
    ]
  },
  {
    "round": 5,
    "grade": "D",
    "impact": "down",
    "headline": "보험을 들어야 할 때와 팔아야 할 때가 있다",
    "related": [
      "S01"
    ]
  }
]

// 재무·시황 지표 정의는 src/metrics.js 단일 소스 (교보재팀이 지표를 바꾸면 거기만 수정)
export { FIN_METRICS, MACRO_METRICS } from './metrics.js'

// 재무제표. null = 미상장/상장폐지 연도(화면에서 '-'). 단위: 금액=억원, 비율=%.
export const financials = {
  "S01": {
    "2020": {
      "revenue": 38000,
      "opIncome": 3200,
      "netIncome": 2400,
      "debtRatio": 95,
      "roe": 8.5
    },
    "2021": {
      "revenue": 40500,
      "opIncome": 3900,
      "netIncome": 3000,
      "debtRatio": 92,
      "roe": 9.8
    },
    "2022": {
      "revenue": 43800,
      "opIncome": 4600,
      "netIncome": 3500,
      "debtRatio": 90,
      "roe": 10.9
    },
    "2023": {
      "revenue": 45200,
      "opIncome": 4800,
      "netIncome": 3700,
      "debtRatio": 88,
      "roe": 10.8
    },
    "2024": {
      "revenue": 45900,
      "opIncome": 4700,
      "netIncome": 3600,
      "debtRatio": 89,
      "roe": 10.1
    },
    "2025": {
      "revenue": 44100,
      "opIncome": 2100,
      "netIncome": 1300,
      "debtRatio": 103,
      "roe": 3.6
    }
  },
  "S02": {
    "2020": {
      "revenue": 236000,
      "opIncome": 28000,
      "netIncome": 21000,
      "debtRatio": 45,
      "roe": 12.1
    },
    "2021": {
      "revenue": 268000,
      "opIncome": 41000,
      "netIncome": 32000,
      "debtRatio": 42,
      "roe": 16.5
    },
    "2022": {
      "revenue": 292000,
      "opIncome": 46000,
      "netIncome": 35000,
      "debtRatio": 40,
      "roe": 16.9
    },
    "2023": {
      "revenue": 245000,
      "opIncome": 9500,
      "netIncome": 6800,
      "debtRatio": 43,
      "roe": 3.2
    },
    "2024": {
      "revenue": 289000,
      "opIncome": 38000,
      "netIncome": 29000,
      "debtRatio": 41,
      "roe": 12.8
    },
    "2025": {
      "revenue": 331000,
      "opIncome": 52000,
      "netIncome": 40000,
      "debtRatio": 39,
      "roe": 15.7
    }
  },
  "S03": {
    "2020": {
      "revenue": 12400,
      "opIncome": 2100,
      "netIncome": 1600,
      "debtRatio": 35,
      "roe": 11.2
    },
    "2021": {
      "revenue": 13800,
      "opIncome": 2500,
      "netIncome": 1900,
      "debtRatio": 33,
      "roe": 12.4
    },
    "2022": {
      "revenue": 13200,
      "opIncome": 2200,
      "netIncome": 1700,
      "debtRatio": 34,
      "roe": 10.6
    },
    "2023": {
      "revenue": 12900,
      "opIncome": 2000,
      "netIncome": 1500,
      "debtRatio": 34,
      "roe": 9.1
    },
    "2024": {
      "revenue": 13600,
      "opIncome": 2300,
      "netIncome": 1800,
      "debtRatio": 32,
      "roe": 10.3
    },
    "2025": {
      "revenue": 15900,
      "opIncome": 3100,
      "netIncome": 2400,
      "debtRatio": 30,
      "roe": 12.9
    }
  },
  "S04": {
    "2020": {
      "revenue": 120,
      "opIncome": -35,
      "netIncome": -40,
      "debtRatio": 180,
      "roe": -25
    },
    "2021": {
      "revenue": 310,
      "opIncome": 20,
      "netIncome": 12,
      "debtRatio": 150,
      "roe": 6
    },
    "2022": {
      "revenue": 2850,
      "opIncome": 1350,
      "netIncome": 1050,
      "debtRatio": 60,
      "roe": 48
    },
    "2023": {
      "revenue": 1420,
      "opIncome": 380,
      "netIncome": 290,
      "debtRatio": 70,
      "roe": 11.5
    },
    "2024": {
      "revenue": 1180,
      "opIncome": 240,
      "netIncome": 180,
      "debtRatio": 75,
      "roe": 6.8
    },
    "2025": {
      "revenue": 1650,
      "opIncome": 520,
      "netIncome": 410,
      "debtRatio": 65,
      "roe": 13.9
    }
  },
  "S05": {
    "2020": {
      "revenue": 8900,
      "opIncome": 2100,
      "netIncome": 1600,
      "debtRatio": 320,
      "roe": 14
    },
    "2021": {
      "revenue": 14200,
      "opIncome": 4800,
      "netIncome": 3700,
      "debtRatio": 410,
      "roe": 24.5
    },
    "2022": {
      "revenue": 21500,
      "opIncome": 7900,
      "netIncome": 6100,
      "debtRatio": 540,
      "roe": 31
    },
    "2023": {
      "revenue": 9800,
      "opIncome": -5200,
      "netIncome": -6800,
      "debtRatio": 890,
      "roe": -48
    },
    "2024": null,
    "2025": null
  },
  "S06": {
    "2020": {
      "revenue": 850,
      "opIncome": -420,
      "netIncome": -480,
      "debtRatio": 210,
      "roe": -35
    },
    "2021": {
      "revenue": 2400,
      "opIncome": -680,
      "netIncome": -750,
      "debtRatio": 260,
      "roe": -42
    },
    "2022": {
      "revenue": 2900,
      "opIncome": -1100,
      "netIncome": -1250,
      "debtRatio": 380,
      "roe": -68
    },
    "2023": {
      "revenue": 2100,
      "opIncome": -950,
      "netIncome": -1080,
      "debtRatio": 520,
      "roe": -95
    },
    "2024": {
      "revenue": 1200,
      "opIncome": -700,
      "netIncome": -820,
      "debtRatio": 780,
      "roe": -160
    },
    "2025": null
  },
  "S07": {
    "2020": {
      "revenue": 4200,
      "opIncome": 260,
      "netIncome": 190,
      "debtRatio": 110,
      "roe": 6.5
    },
    "2021": {
      "revenue": 3900,
      "opIncome": 180,
      "netIncome": 120,
      "debtRatio": 115,
      "roe": 4.1
    },
    "2022": {
      "revenue": 4100,
      "opIncome": 210,
      "netIncome": 150,
      "debtRatio": 112,
      "roe": 5
    },
    "2023": {
      "revenue": 3100,
      "opIncome": -240,
      "netIncome": -310,
      "debtRatio": 135,
      "roe": -11
    },
    "2024": {
      "revenue": 4600,
      "opIncome": 420,
      "netIncome": 320,
      "debtRatio": 105,
      "roe": 10.5
    },
    "2025": {
      "revenue": 3400,
      "opIncome": -120,
      "netIncome": -180,
      "debtRatio": 128,
      "roe": -6.2
    }
  },
  "S08": {
    "2020": {
      "revenue": 21000,
      "opIncome": 1500,
      "netIncome": 1100,
      "debtRatio": 62,
      "roe": 7.2
    },
    "2021": {
      "revenue": 21400,
      "opIncome": 1550,
      "netIncome": 1150,
      "debtRatio": 61,
      "roe": 7.3
    },
    "2022": {
      "revenue": 22800,
      "opIncome": 1700,
      "netIncome": 1280,
      "debtRatio": 60,
      "roe": 7.8
    },
    "2023": {
      "revenue": 24100,
      "opIncome": 1850,
      "netIncome": 1400,
      "debtRatio": 58,
      "roe": 8.1
    },
    "2024": {
      "revenue": 24600,
      "opIncome": 1800,
      "netIncome": 1350,
      "debtRatio": 58,
      "roe": 7.6
    },
    "2025": {
      "revenue": 25900,
      "opIncome": 1950,
      "netIncome": 1480,
      "debtRatio": 56,
      "roe": 7.9
    }
  },
  "S09": {
    "2020": {
      "revenue": 98000,
      "opIncome": 2800,
      "netIncome": 1900,
      "debtRatio": 145,
      "roe": 4.2
    },
    "2021": {
      "revenue": 132000,
      "opIncome": 8900,
      "netIncome": 6800,
      "debtRatio": 130,
      "roe": 12.8
    },
    "2022": {
      "revenue": 158000,
      "opIncome": 12500,
      "netIncome": 9600,
      "debtRatio": 120,
      "roe": 15.6
    },
    "2023": {
      "revenue": 141000,
      "opIncome": 4200,
      "netIncome": 2900,
      "debtRatio": 128,
      "roe": 4.5
    },
    "2024": {
      "revenue": 172000,
      "opIncome": 14800,
      "netIncome": 11500,
      "debtRatio": 115,
      "roe": 15.9
    },
    "2025": {
      "revenue": 198000,
      "opIncome": 19500,
      "netIncome": 15200,
      "debtRatio": 108,
      "roe": 18.3
    }
  },
  "S10": {
    "2020": {
      "revenue": 340,
      "opIncome": 15,
      "netIncome": 8,
      "debtRatio": 95,
      "roe": 2
    },
    "2021": {
      "revenue": 380,
      "opIncome": 22,
      "netIncome": 14,
      "debtRatio": 92,
      "roe": 3.3
    },
    "2022": {
      "revenue": 450,
      "opIncome": 30,
      "netIncome": 20,
      "debtRatio": 90,
      "roe": 4.5
    },
    "2023": {
      "revenue": 620,
      "opIncome": 55,
      "netIncome": 40,
      "debtRatio": 85,
      "roe": 8.2
    },
    "2024": {
      "revenue": 5800,
      "opIncome": 1900,
      "netIncome": 1500,
      "debtRatio": 55,
      "roe": 42
    },
    "2025": {
      "revenue": 4100,
      "opIncome": 780,
      "netIncome": 590,
      "debtRatio": 68,
      "roe": 13.1
    }
  },
  "S11": {
    "2020": {
      "revenue": 3100,
      "opIncome": 280,
      "netIncome": 210,
      "debtRatio": 85,
      "roe": 7.5
    },
    "2021": {
      "revenue": 3600,
      "opIncome": 360,
      "netIncome": 270,
      "debtRatio": 82,
      "roe": 9
    },
    "2022": {
      "revenue": 4500,
      "opIncome": 520,
      "netIncome": 400,
      "debtRatio": 78,
      "roe": 12
    },
    "2023": {
      "revenue": 5200,
      "opIncome": 640,
      "netIncome": 500,
      "debtRatio": 74,
      "roe": 13.4
    },
    "2024": {
      "revenue": 6400,
      "opIncome": 850,
      "netIncome": 670,
      "debtRatio": 70,
      "roe": 15.5
    },
    "2025": {
      "revenue": 6100,
      "opIncome": 720,
      "netIncome": 560,
      "debtRatio": 72,
      "roe": 12.1
    }
  },
  "S12": {
    "2020": {
      "revenue": 980,
      "opIncome": 110,
      "netIncome": 80,
      "debtRatio": 70,
      "roe": 8
    },
    "2021": {
      "revenue": 1450,
      "opIncome": 230,
      "netIncome": 180,
      "debtRatio": 65,
      "roe": 15.2
    },
    "2022": {
      "revenue": 1620,
      "opIncome": 260,
      "netIncome": 200,
      "debtRatio": 63,
      "roe": 15.4
    },
    "2023": {
      "revenue": 1100,
      "opIncome": -80,
      "netIncome": -120,
      "debtRatio": 78,
      "roe": -9
    },
    "2024": {
      "revenue": 1750,
      "opIncome": 290,
      "netIncome": 230,
      "debtRatio": 66,
      "roe": 15.8
    },
    "2025": {
      "revenue": 2600,
      "opIncome": 560,
      "netIncome": 450,
      "debtRatio": 58,
      "roe": 24.1
    }
  },
  "S13": {
    "2020": null,
    "2021": null,
    "2022": {
      "revenue": 420,
      "opIncome": -180,
      "netIncome": -210,
      "debtRatio": 150,
      "roe": -28
    },
    "2023": {
      "revenue": 510,
      "opIncome": -120,
      "netIncome": -150,
      "debtRatio": 165,
      "roe": -22
    },
    "2024": {
      "revenue": 780,
      "opIncome": -30,
      "netIncome": -45,
      "debtRatio": 140,
      "roe": -6.5
    },
    "2025": {
      "revenue": 1450,
      "opIncome": 210,
      "netIncome": 160,
      "debtRatio": 110,
      "roe": 18.5
    }
  },
  "S14": {
    "2020": {
      "revenue": 640,
      "opIncome": 40,
      "netIncome": 28,
      "debtRatio": 88,
      "roe": 4.5
    },
    "2021": {
      "revenue": 2100,
      "opIncome": 380,
      "netIncome": 300,
      "debtRatio": 70,
      "roe": 28
    },
    "2022": {
      "revenue": 900,
      "opIncome": -150,
      "netIncome": -190,
      "debtRatio": 105,
      "roe": -18
    },
    "2023": {
      "revenue": 480,
      "opIncome": -210,
      "netIncome": -250,
      "debtRatio": 160,
      "roe": -35
    },
    "2024": {
      "revenue": 420,
      "opIncome": -90,
      "netIncome": -120,
      "debtRatio": 175,
      "roe": -20
    },
    "2025": {
      "revenue": 510,
      "opIncome": 10,
      "netIncome": 5,
      "debtRatio": 168,
      "roe": 0.9
    }
  },
  "S15": {
    "2020": {
      "revenue": 5200,
      "opIncome": -380,
      "netIncome": -450,
      "debtRatio": 190,
      "roe": -12
    },
    "2021": {
      "revenue": 4300,
      "opIncome": -520,
      "netIncome": -600,
      "debtRatio": 215,
      "roe": -18
    },
    "2022": {
      "revenue": 4800,
      "opIncome": -150,
      "netIncome": -220,
      "debtRatio": 205,
      "roe": -7
    },
    "2023": {
      "revenue": 5600,
      "opIncome": 180,
      "netIncome": 110,
      "debtRatio": 185,
      "roe": 3.5
    },
    "2024": {
      "revenue": 7100,
      "opIncome": 620,
      "netIncome": 480,
      "debtRatio": 160,
      "roe": 13.2
    },
    "2025": {
      "revenue": 6300,
      "opIncome": 280,
      "netIncome": 190,
      "debtRatio": 172,
      "roe": 5.1
    }
  },
  "S16": {
    "2020": {
      "revenue": 45,
      "opIncome": -120,
      "netIncome": -130,
      "debtRatio": 60,
      "roe": -18
    },
    "2021": {
      "revenue": 60,
      "opIncome": -180,
      "netIncome": -195,
      "debtRatio": 75,
      "roe": -22
    },
    "2022": {
      "revenue": 85,
      "opIncome": -240,
      "netIncome": -260,
      "debtRatio": 110,
      "roe": -30
    },
    "2023": {
      "revenue": 70,
      "opIncome": -280,
      "netIncome": -300,
      "debtRatio": 170,
      "roe": -45
    },
    "2024": {
      "revenue": 55,
      "opIncome": -250,
      "netIncome": -270,
      "debtRatio": 260,
      "roe": -70
    },
    "2025": {
      "revenue": 40,
      "opIncome": -210,
      "netIncome": -230,
      "debtRatio": 380,
      "roe": -120
    }
  },
  "S17": {
    "2020": {
      "revenue": 380,
      "opIncome": -140,
      "netIncome": -160,
      "debtRatio": 120,
      "roe": -25
    },
    "2021": {
      "revenue": 890,
      "opIncome": -220,
      "netIncome": -250,
      "debtRatio": 135,
      "roe": -30
    },
    "2022": {
      "revenue": 1350,
      "opIncome": -180,
      "netIncome": -210,
      "debtRatio": 150,
      "roe": -28
    },
    "2023": {
      "revenue": 620,
      "opIncome": -890,
      "netIncome": -1100,
      "debtRatio": 450,
      "roe": -180
    },
    "2024": {
      "revenue": 1100,
      "opIncome": -150,
      "netIncome": -180,
      "debtRatio": 200,
      "roe": -35
    },
    "2025": {
      "revenue": 1900,
      "opIncome": 60,
      "netIncome": 30,
      "debtRatio": 130,
      "roe": 4.2
    }
  },
  "S18": {
    "2020": {
      "revenue": 486000,
      "opIncome": 32000,
      "netIncome": 24000,
      "debtRatio": 55,
      "roe": 8.2
    },
    "2021": {
      "revenue": 512000,
      "opIncome": 38000,
      "netIncome": 29000,
      "debtRatio": 53,
      "roe": 9.4
    },
    "2022": {
      "revenue": 561000,
      "opIncome": 45000,
      "netIncome": 34000,
      "debtRatio": 51,
      "roe": 10.5
    },
    "2023": {
      "revenue": 528000,
      "opIncome": 31000,
      "netIncome": 23000,
      "debtRatio": 54,
      "roe": 6.9
    },
    "2024": {
      "revenue": 589000,
      "opIncome": 47000,
      "netIncome": 36000,
      "debtRatio": 50,
      "roe": 10.2
    },
    "2025": {
      "revenue": 642000,
      "opIncome": 58000,
      "netIncome": 45000,
      "debtRatio": 48,
      "roe": 11.8
    }
  }
}

// 거시경제 시황. 연도별 지표(현재 라운드 연도 초과분은 스포일러라 화면에서 가린다).
export const MACRO = {
  "2020": {
    "summary": "코로나 충격으로 경기 급랭 — 초저금리·유가 폭락",
    "rate": 0.5,
    "gdp": -0.7,
    "unemployment": 4,
    "fx": 1180,
    "cpi": 0.5,
    "oil": 42
  },
  "2021": {
    "summary": "경기 반등·유동성 장세 — 성장주 급등",
    "rate": 0.75,
    "gdp": 4.1,
    "unemployment": 3.7,
    "fx": 1150,
    "cpi": 2.5,
    "oil": 68
  },
  "2022": {
    "summary": "인플레이션 급등, 금리 인상 시작 — 성장주 조정",
    "rate": 3.25,
    "gdp": 2.6,
    "unemployment": 2.9,
    "fx": 1300,
    "cpi": 5.1,
    "oil": 95
  },
  "2023": {
    "summary": "고금리 지속·경기 둔화 — 실적 옥석 가리기",
    "rate": 3.5,
    "gdp": 1.4,
    "unemployment": 2.7,
    "fx": 1310,
    "cpi": 3.6,
    "oil": 78
  },
  "2024": {
    "summary": "금리 인하 기대·완만한 회복",
    "rate": 3,
    "gdp": 2,
    "unemployment": 2.8,
    "fx": 1350,
    "cpi": 2.3,
    "oil": 80
  },
  "2025": {
    "summary": "금리 정상화·안정 국면",
    "rate": 2.5,
    "gdp": 1.8,
    "unemployment": 3,
    "fx": 1320,
    "cpi": 2,
    "oil": 72
  }
}
