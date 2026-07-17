import { useState } from 'react'
import Modal from '../components/Modal'
import { errorText } from '../supabase'
import { num, signed, pct, dirOf } from '../format'

/** 조 관리 탭. 조 수·시드는 전부 여기서 정한다 — 코드에 하드코딩하지 않는다. */
export default function AdminTeams({ actions, game, teams, refresh, notify }) {
  const [adding, setAdding] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', seed: '' })
  const [seedEdit, setSeedEdit] = useState({}) // code → 입력 중인 시드

  const started = (game?.current_round ?? 0) > 0
  const defaultSeed = Number(game?.default_seed ?? 0)

  const add = async () => {
    setBusy(true)
    const r = await actions.createTeam(
      form.code,
      form.name,
      form.seed ? Number(form.seed.replace(/\D/g, '')) : null,
    )
    setBusy(false)
    if (!r.ok) return notify(errorText(r.error), 'down')
    setAdding(false)
    setForm({ code: '', name: '', seed: '' })
    notify('조를 추가했어요', 'gold')
    await refresh()
  }

  const del = async (code) => {
    setBusy(true)
    const r = await actions.deleteTeam(code)
    setBusy(false)
    setConfirmDel(null)
    if (!r.ok) return notify(errorText(r.error), 'down')
    notify('조를 삭제했어요', 'gold')
    await refresh()
  }

  const saveSeed = async (code) => {
    const v = Number((seedEdit[code] ?? '').replace(/\D/g, ''))
    if (!v) return
    const r = await actions.setTeamSeed(code, v)
    if (!r.ok) return notify(errorText(r.error), 'down')
    setSeedEdit((s) => ({ ...s, [code]: undefined }))
    notify('시드를 바꿨어요', 'gold')
    await refresh()
  }

  return (
    <div className="apanel">
      <section className="acard">
        <div className="acard-head">
          <span className="acap">조 목록 ({teams.length}조)</span>
          <button className="text-btn" onClick={() => setAdding(true)}>
            + 조 추가
          </button>
        </div>

        {started && (
          <p className="anote">대회가 시작되어 시드는 바꿀 수 없습니다. 초기화하면 다시 바꿀 수 있습니다.</p>
        )}

        {teams.length === 0 ? (
          <p className="aempty">등록된 조가 없습니다. [조 추가]로 시작하세요.</p>
        ) : (
          <div className="scroller">
            <table>
              <thead>
                <tr>
                  <th>코드</th>
                  <th>이름</th>
                  <th>시드</th>
                  <th>예수금</th>
                  <th>평가금액</th>
                  <th>수익률</th>
                  <th>주문서</th>
                  <th>힌트</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => {
                  const editing = seedEdit[t.code] !== undefined
                  return (
                    <tr key={t.code}>
                      <td className="num">{t.code}</td>
                      <td>{t.name}</td>
                      <td className="num">
                        {started ? (
                          num(t.seed)
                        ) : editing ? (
                          <span className="seed-edit">
                            <input
                              className="num"
                              value={seedEdit[t.code]}
                              onChange={(e) => setSeedEdit((s) => ({ ...s, [t.code]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && saveSeed(t.code)}
                              autoFocus
                            />
                            <button className="text-btn tiny" onClick={() => saveSeed(t.code)}>
                              저장
                            </button>
                          </span>
                        ) : (
                          <button
                            className="linkish num"
                            onClick={() => setSeedEdit((s) => ({ ...s, [t.code]: String(t.seed) }))}
                          >
                            {num(t.seed)}
                          </button>
                        )}
                      </td>
                      <td className="num">{num(t.cash)}</td>
                      <td className="num">{num(t.equity)}</td>
                      <td className={'num ' + dirOf(Number(t.pnl))}>
                        {pct(Number(t.pnl_pct))}
                        <div className="sub" style={{ color: 'inherit' }}>
                          {signed(Number(t.pnl))}
                        </div>
                      </td>
                      <td>
                        {Number(t.sheet_lines) > 0 ? (
                          <span className="chip ok">제출 {t.sheet_lines}종목</span>
                        ) : (
                          <span className="chip warn">미제출</span>
                        )}
                      </td>
                      <td className="num">{t.hint_count}</td>
                      <td>
                        <button className="text-btn danger tiny" onClick={() => setConfirmDel(t)}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={adding} onClose={() => setAdding(false)} title="조 추가">
        <div className="form">
          <div className="frow col">
            <label>참가 코드</label>
            <input
              className="num"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="TIGER-03"
              autoFocus
            />
          </div>
          <div className="frow col">
            <label>조 이름</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="호랑이 3조"
            />
          </div>
          <div className="frow col">
            <label>시드머니 (비우면 기본값 {num(defaultSeed)})</label>
            <input
              className="num"
              value={form.seed}
              onChange={(e) => setForm({ ...form, seed: e.target.value })}
              placeholder={String(defaultSeed)}
            />
          </div>
        </div>
        <div className="mfoot">
          <button className="cancel" onClick={() => setAdding(false)}>
            취소
          </button>
          <button className="act-btn buy" disabled={busy || !form.code.trim()} onClick={add}>
            추가
          </button>
        </div>
      </Modal>

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="조 삭제">
        {confirmDel && (
          <div className="confirm">
            <p className="big">
              <b>{confirmDel.name}</b> ({confirmDel.code})
            </p>
            <p className="ask">이 조의 보유·체결내역·힌트가 전부 사라집니다. 되돌릴 수 없습니다.</p>
          </div>
        )}
        <div className="mfoot">
          <button className="cancel" onClick={() => setConfirmDel(null)}>
            취소
          </button>
          <button className="act-btn sell" disabled={busy} onClick={() => del(confirmDel.code)}>
            삭제
          </button>
        </div>
      </Modal>
    </div>
  )
}
