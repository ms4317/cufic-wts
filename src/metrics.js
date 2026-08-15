// 재무·시황 지표 정의 — 단일 소스(single source of truth).
// 교보재팀이 지표를 바꾸면 **여기만** 고치면 재무·시황 모달·관리자 편집·엑셀 업로드 파서가 함께 따라간다.
//   · key   — 화면·데이터 접근 키(재무는 camelCase, 시황은 그대로). data[year][key]
//   · db    — payload/DB 컬럼명(재무는 snake_case)
//   · xlsx  — 엑셀 헤더에서 이 열을 찾는 키워드(부분일치). 배열이면 여럿 중 하나
//   · label·unit·desc — 화면 표시(모달 표·용어 설명)
//   · round — true면 정수 반올림(환율·유가)
// data.js는 이 파일을 재-export 한다(하위 호환). 새로 import 하는 코드는 여기서 가져온다.

export const FIN_METRICS = [
  { key: 'revenue', db: 'revenue', xlsx: '매출', label: '매출액', unit: '억원', desc: '회사가 물건이나 서비스를 팔아서 벌어들인 돈 전체예요.' },
  { key: 'opIncome', db: 'op_income', xlsx: '영업이익', label: '영업이익', unit: '억원', desc: '매출액에서 재료비·인건비 같은 비용을 뺀, 본업으로 남긴 이익이에요.' },
  { key: 'netIncome', db: 'net_income', xlsx: ['당기순이익', '순이익'], label: '당기순이익', unit: '억원', desc: '이자와 세금까지 전부 내고 최종적으로 남은 이익이에요.' },
  { key: 'debtRatio', db: 'debt_ratio', xlsx: '부채비율', label: '부채비율', unit: '%', desc: '내 돈에 비해 빚이 얼마나 많은지예요. 낮을수록 안정적이고, 보통 200%보다 낮으면 양호하다고 봐요.' },
  { key: 'roe', db: 'roe', xlsx: 'ROE', label: 'ROE', unit: '%', desc: '내 돈으로 얼마나 잘 벌었는지 보여주는 지표예요. 높을수록 장사를 잘한 거예요.' },
]

export const MACRO_METRICS = [
  { key: 'rate', db: 'rate', xlsx: '금리', label: '기준금리', unit: '%', desc: '중앙은행이 정하는 기준 이자율이에요. 높으면 대출·투자가 위축되고 빚 많은 회사·성장주에 불리해요.' },
  { key: 'gdp', db: 'gdp', xlsx: 'GDP', label: 'GDP 성장률', unit: '%', desc: '나라 경제가 1년간 얼마나 커졌는지예요. 높으면 경기가 좋아 소비·투자가 늘어요.' },
  { key: 'unemployment', db: 'unemployment', xlsx: '실업', label: '실업률', unit: '%', desc: '일자리를 못 구한 사람의 비율이에요. 높으면 소비가 줄어 경기가 나빠요.' },
  { key: 'fx', db: 'fx', xlsx: '환율', label: '환율', unit: '원/$', round: true, desc: '1달러를 사는 데 드는 원화예요. 오르면(원화 약세) 수출 기업엔 유리, 수입엔 불리해요.' },
  { key: 'cpi', db: 'cpi', xlsx: '물가', label: '물가상승률', unit: '%', desc: '물건 값이 1년간 얼마나 올랐는지예요. 너무 높으면 금리를 올려 잡으려 해요.' },
  { key: 'oil', db: 'oil', xlsx: '유가', label: '국제유가', unit: '$', round: true, desc: '원유 1배럴 가격(달러)이에요. 오르면 항공·운송·제조 비용이 커져요.' },
]
