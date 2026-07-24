import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import { errorText } from '../supabase'

const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * 진행 탭. 라운드를 넘기는 순간이 대회의 유일한 되돌릴 수 없는 지점이므로
 * 확인 모달을 반드시 거치게 한다. 리셋은 텍스트 입력까지 요구한다 — 당일 오조작 방지.
 *
 * 게임 루프: [연도 넘기기]로 새 가격·순위를 공개하고 → 순위를 확인한 뒤 →
 * [타이머 시작]으로 거래를 연다. 10분이 지나면 거래는 자동으로 닫히고, 관리자가 다시 연도를 넘긴다.
 */
export default function AdminProgress({ actions, game, teams, refresh, notify }) {
  const [confirm, setConfirm] = useState(null) // 'advance' | 'end' | 'reset'
  const [resetText, setResetText] = useState('')
  const [busy, setBusy] = useState(false)
  const [nowTs, setNowTs] = useState(() => Date.now())

  // 카운트다운 1초 틱
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!game) return null

  const cur = game.current_round
  const total = game.total_rounds
  const isLast = cur >= total
  const notStarted = cur === 0
  const nextYear = game.round_year_map?.[String(cur + 1)]

  // 거래 타이머 상태 (서버 round_ends_at 기준)
  const endsAt = game.round_ends_at ? new Date(game.round_ends_at).getTime() : null
  const remainingMs = endsAt ? Math.max(0, endsAt - nowTs) : 0
  const timerRunning = !notStarted && remainingMs > 0
  const durMin = Math.round((game.round_duration_seconds ?? 600) / 60)

  const traded = teams.filter((t) => Number(t.trades_this_round) > 0)

  const run = async (fn, okMsg) => {
    setBusy(true)
    const r = await fn()
    setBusy(false)
    setConfirm(null)
    setResetText('')
    if (!r.ok) {
      notify(errorText(r.error), 'down')
      return
    }
    notify(okMsg, 'gold')
    await refresh()
  }

  return (
    <div className="apanel">
      <section className="acard big">
        <span className="acap">현재 라운드</span>
        <div className="round-big">
          {notStarted ? (
            <>
              <b>시작 전</b>
              <span>진행 버튼을 누르면 ROUND 1이 열립니다</span>
            </>
          ) : (
            <>
              <b>
                ROUND {cur} · {game.round_year_map?.[String(cur)]}년
              </b>
              <span>
                전체 {total}라운드 중 {cur}번째
              </span>
            </>
          )}
        </div>

        <div className="arow">
          {!isLast ? (
            <button className="act-btn buy" disabled={busy} onClick={() => setConfirm('advance')}>
              {notStarted ? '대회 시작 (ROUND 1 열기)' : '다음 연도로 넘어가기 (순위 갱신)'}
            </button>
          ) : (
            <button className="act-btn sell" disabled={busy} onClick={() => setConfirm('end')}>
              대회 종료
            </button>
          )}
        </div>

        {!notStarted && !isLast && (
          <p className="anote">
            누르면 <b>{nextYear}년 가격이 공개</b>되고 보유종목이 재평가돼 <b>순위가 갱신</b>됩니다.
            순위를 확인한 뒤 아래에서 <b>타이머를 시작</b>하면 거래가 열립니다. 되돌릴 수 없습니다.
          </p>
        )}
      </section>

      {/* 거래 타이머 — 순위 확인 후 여기서 거래를 연다 */}
      {!notStarted && (
        <section className="acard big">
          <span className="acap">거래 타이머</span>
          <div className="round-big">
            {timerRunning ? (
              <>
                <b className="timer-count live">{mmss(remainingMs)}</b>
                <span>거래 진행 중 — 학생들이 매매할 수 있어요</span>
              </>
            ) : endsAt ? (
              <>
                <b className="timer-count">0:00</b>
                <span>거래 마감 — 순위 확인 후 다음 연도로 넘기세요</span>
              </>
            ) : (
              <>
                <b className="timer-count">대기</b>
                <span>타이머를 시작하면 {durMin}분간 거래가 열립니다</span>
              </>
            )}
          </div>
          <div className="arow">
            <button
              className="act-btn buy"
              disabled={busy}
              onClick={() => run(actions.startTimer, timerRunning ? '타이머를 다시 시작했어요' : '거래를 열었어요')}
            >
              {timerRunning ? `타이머 다시 시작 (${durMin}분)` : `타이머 시작 (${durMin}분)`}
            </button>
          </div>
        </section>
      )}

      {/* 거래 현황 — 이번 라운드에 누가 매매했는지 */}
      {!notStarted && (
        <section className="acard">
          <span className="acap">이번 라운드 거래 현황</span>
          {teams.length === 0 ? (
            <p className="aempty">등록된 조가 없습니다.</p>
          ) : (
            <>
              <p className={traded.length === teams.length ? 'aok' : 'anote'}>
                거래한 조 {traded.length} / {teams.length}
              </p>
              {traded.length > 0 && (
                <div className="chips">
                  {traded.map((t) => (
                    <span key={t.code} className="chip">
                      {t.name} · {Number(t.trades_this_round)}건
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      <section className="acard danger">
        <span className="acap">게임 리셋</span>
        <p className="anote">
          모든 조의 예수금이 초기 자본으로 돌아가고 보유·체결내역·주문서·힌트 지급이 전부 사라집니다.
          종목과 힌트 자체는 남습니다.
        </p>
        <button className="text-btn danger" disabled={busy} onClick={() => setConfirm('reset')}>
          게임 리셋
        </button>
      </section>

      {/* 라운드 진행 확인 */}
      <Modal open={confirm === 'advance'} onClose={() => setConfirm(null)} title="확인">
        <div className="confirm">
          <p className="big">
            {notStarted ? (
              <>
                <b>ROUND 1 · {game.round_year_map?.['1']}년</b>으로 대회를 시작합니다
              </>
            ) : (
              <>
                <b>
                  ROUND {cur + 1} · {nextYear}년
                </b>
                으로 넘어갑니다
              </>
            )}
          </p>
          <p className="ask">모든 조에 즉시 반영됩니다. 되돌릴 수 없습니다.</p>
          {timerRunning && (
            <p className="sheet-warn">
              아직 거래 타이머가 {mmss(remainingMs)} 남아 있습니다. 넘기면 거래가 바로 닫힙니다.
            </p>
          )}
        </div>
        <div className="mfoot">
          <button className="cancel" onClick={() => setConfirm(null)}>
            취소
          </button>
          <button
            className="act-btn buy"
            disabled={busy}
            onClick={() => run(actions.advanceRound, '라운드가 넘어갔습니다')}
          >
            {busy ? '진행 중…' : '진행'}
          </button>
        </div>
      </Modal>

      {/* 대회 종료 */}
      <Modal open={confirm === 'end'} onClose={() => setConfirm(null)} title="대회 종료">
        <div className="confirm">
          <p className="big">대회를 종료합니다</p>
          <p className="ask">최종 순위가 기록됩니다.</p>
        </div>
        <div className="mfoot">
          <button className="cancel" onClick={() => setConfirm(null)}>
            취소
          </button>
          <button
            className="act-btn sell"
            disabled={busy}
            onClick={() => run(actions.endGame, '대회가 종료되었습니다')}
          >
            종료
          </button>
        </div>
      </Modal>

      {/* 리셋 — 이중 확인 */}
      <Modal open={confirm === 'reset'} onClose={() => setConfirm(null)} title="게임 리셋">
        <div className="confirm">
          <p className="big">정말 초기화할까요?</p>
          <p className="ask">
            모든 조의 거래가 사라집니다. 되돌릴 수 없습니다.
            <br />
            확인을 위해 <b>RESET</b>을 입력하세요.
          </p>
          <input
            className="reset-input num"
            value={resetText}
            onChange={(e) => setResetText(e.target.value)}
            placeholder="RESET"
            autoFocus
          />
        </div>
        <div className="mfoot">
          <button className="cancel" onClick={() => setConfirm(null)}>
            취소
          </button>
          <button
            className="act-btn sell"
            disabled={busy || resetText !== 'RESET'}
            onClick={() => run(actions.resetGame, '게임이 초기화되었습니다')}
          >
            초기화
          </button>
        </div>
      </Modal>
    </div>
  )
}
