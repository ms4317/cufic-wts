// 조별 순위.
//
// ⚠ 지금 다른 조는 전부 가짜다. 서버가 없어서 다른 브라우저의 상태를 알 방법이 없다.
//   실제 수업에 투입하기 전에 반드시 서버를 붙이거나 순위판을 꺼야 한다 —
//   그러지 않으면 학생이 존재하지 않는 조와 자기를 비교하게 된다.
//   화면에 IS_MOCK 배지를 띄워 이 상태를 드러낸다.
//
// 서버가 붙으면 이 파일에서 MOCK_TEAMS와 buildLeaderboard의 더미 부분만 걷어내고
// fetch 결과를 rows에 넣으면 된다. 화면 쪽은 고칠 게 없다.
export const IS_MOCK = true

// 더미 조의 라운드별 수익률(%). 라운드가 넘어가면 다른 조도 움직인다.
const MOCK_TEAMS = [
  { name: 'LION-01', byRound: { 1: 2.4, 2: 18.6, 3: 31.2 } },
  { name: 'TIGER-02', byRound: { 1: -1.8, 2: 9.3, 3: 14.7 } },
  { name: 'BEAR-04', byRound: { 1: 4.1, 2: 22.5, 3: 19.8 } },
  { name: 'WOLF-05', byRound: { 1: 0.6, 2: -4.2, 3: 6.5 } },
  { name: 'EAGLE-06', byRound: { 1: -3.5, 2: 11.8, 3: 27.4 } },
  { name: 'FOX-07', byRound: { 1: 1.2, 2: 6.7, 3: -8.3 } },
  { name: 'PANDA-08', byRound: { 1: 3.3, 2: 14.1, 3: 22.0 } },
]

/**
 * 내 조를 포함한 전체 순위표. 평가금액 내림차순.
 * 모든 조의 원금이 같으므로 평가금액 순위 = 수익률 순위다.
 *
 * @returns {{rank:number, name:string, equity:number, pnl:number, pnlPct:number, me:boolean}[]}
 */
export function buildLeaderboard({ myTeam, myEquity, round, principal }) {
  const others = MOCK_TEAMS
    // 내 참가 코드와 겹치는 더미는 뺀다 (같은 조가 둘이 되는 걸 막는다)
    .filter((t) => t.name !== myTeam)
    .map((t) => ({
      name: t.name,
      equity: Math.round(principal * (1 + (t.byRound[round] ?? 0) / 100)),
      me: false,
    }))

  return [...others, { name: myTeam, equity: myEquity, me: true }]
    .sort((a, b) => b.equity - a.equity)
    .map((t, i) => ({
      ...t,
      rank: i + 1,
      pnl: t.equity - principal,
      pnlPct: principal ? ((t.equity - principal) / principal) * 100 : 0,
    }))
}
