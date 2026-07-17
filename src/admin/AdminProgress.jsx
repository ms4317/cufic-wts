import { useState } from 'react'
import Modal from '../components/Modal'
import { errorText } from '../supabase'

/**
 * 진행 탭. 라운드를 넘기는 순간이 대회의 유일한 되돌릴 수 없는 지점이므로
 * 확인 모달을 반드시 거치게 한다. 리셋은 텍스트 입력까지 요구한다 — 당일 오조작 방지.
 */
export default function AdminProgress({ actions, game, teams, refresh, notify }) {
  const [confirm, setConfirm] = useState(null) // 'advance' | 'end' | 'reset'
  const [resetText, setResetText] = useState('')
  const [busy, setBusy] = useState(false)

  if (!game) return null

  const cur = game.current_round
  const total = game.total_rounds
  const isLast = cur >= total
  const notStarted = cur === 0
  const nextYear = game.round_year_map?.[String(cur + 1)]

  const notSubmitted = teams.filter((t) => Number(t.sheet_lines) === 0)

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
              {notStarted ? '대회 시작 (ROUND 1 열기)' : '다음 연도로 넘어가기'}
            </button>
          ) : (
            <button className="act-btn sell" disabled={busy} onClick={() => setConfirm('end')}>
              대회 종료
            </button>
          )}
        </div>

        {!notStarted && !isLast && (
          <p className="anote">
            누르면 <b>전 조의 주문서가 {game.round_year_map?.[String(cur)]}년 가격으로 일괄 체결</b>된 뒤
            {nextYear}년 가격이 공개됩니다. 되돌릴 수 없습니다.
          </p>
        )}
      </section>

      {/* 주문서 제출 현황 — 누가 아직 안 냈는지 */}
      {!notStarted && (
        <section className="acard">
          <span className="acap">주문서 제출 현황</span>
          {teams.length === 0 ? (
            <p className="aempty">등록된 조가 없습니다.</p>
          ) : notSubmitted.length === 0 ? (
            <p className="aok">모든 조가 주문서를 냈습니다 ({teams.length}조)</p>
          ) : (
            <>
              <p className="awarn">
                아직 안 낸 조 {notSubmitted.length} / {teams.length}
              </p>
              <div className="chips">
                {notSubmitted.map((t) => (
                  <span key={t.code} className="chip warn">
                    {t.name} ({t.code})
                  </span>
                ))}
              </div>
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
          {!notStarted && notSubmitted.length > 0 && (
            <p className="sheet-warn">아직 주문서를 안 낸 조가 {notSubmitted.length}곳 있습니다.</p>
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
