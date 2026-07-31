import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import { errorText } from '../supabase'

/**
 * 데이터셋(시나리오) — 저장·전환·백업.
 * "지금 편집 중인 데이터셋"(game.active_dataset_id)을 보여주고, 다른 탭에서 콘텐츠를 고친 뒤
 * [저장]을 누르면 그 데이터셋에 반영된다. [편집]으로 다른 데이터셋으로 전환(불러오기, 게임 리셋).
 */
export default function AdminDatasets({ actions, game, refresh, notify }) {
  const [datasets, setDatasets] = useState([])
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null) // {type:'load'|'delete', id, name}

  const started = (game?.current_round ?? 0) > 0
  const activeId = game?.active_dataset_id ?? null
  const active = datasets.find((d) => d.id === activeId) ?? null

  const loadDatasets = async () => {
    const r = await actions.listDatasets()
    if (r.ok) setDatasets(r.datasets ?? [])
  }
  useEffect(() => {
    loadDatasets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 지금 콘텐츠를 편집 중인 데이터셋에 저장(덮어쓰기)
  const saveActive = async () => {
    if (!active) return
    setBusy(true)
    const r = await actions.saveDataset(active.name, active.description, active.id)
    setBusy(false)
    if (!r.ok) return notify(errorText(r.error), 'down')
    notify(`'${active.name}'에 저장했어요`, 'gold')
    loadDatasets()
    await refresh()
  }

  // 지금 콘텐츠를 새 데이터셋으로 저장(그게 편집 중이 됨)
  const saveNew = async () => {
    const nm = name.trim()
    if (!nm) return
    setBusy(true)
    const r = await actions.saveDataset(nm, desc)
    setBusy(false)
    if (!r.ok) return notify(errorText(r.error), 'down')
    setName('')
    setDesc('')
    notify(`'${nm}' 새 데이터셋으로 저장했어요`, 'gold')
    loadDatasets()
    await refresh()
  }

  const exportDs = async (d) => {
    const r = await actions.getDataset(d.id)
    if (!r.ok) return notify(errorText(r.error), 'down')
    const blob = new Blob([JSON.stringify(r.payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${d.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    let payload
    try {
      payload = JSON.parse(await file.text())
    } catch {
      return notify('JSON 파일을 읽을 수 없어요', 'down')
    }
    const nm = file.name.replace(/\.json$/i, '')
    setBusy(true)
    const r = await actions.importDataset(nm, '가져온 데이터셋', payload)
    setBusy(false)
    if (!r.ok) return notify(errorText(r.error), 'down')
    notify(`'${nm}' 가져왔어요. [편집]으로 열 수 있어요`, 'gold')
    loadDatasets()
  }

  const runConfirm = async () => {
    const c = confirm
    setConfirm(null)
    if (!c) return
    setBusy(true)
    const r = c.type === 'load' ? await actions.loadDataset(c.id) : await actions.deleteDataset(c.id)
    setBusy(false)
    if (!r.ok) return notify(errorText(r.error), 'down')
    if (c.type === 'load') notify(`'${c.name}' 편집을 시작해요`, 'gold')
    else notify(`'${c.name}' 삭제했어요`, 'gold')
    loadDatasets()
    await refresh()
  }

  return (
    <div className="apanel">
      <section className="acard">
        <span className="acap">데이터셋 · 시나리오 저장·전환·백업</span>

        {/* 지금 편집 중 */}
        <div className="ds-active">
          <div className="ds-active-info">
            <span className="ds-active-label">지금 편집 중</span>
            <span className="ds-active-name">{active ? active.name : '(아직 저장 안 함)'}</span>
            <span className="anote ds-active-hint">
              다른 탭에서 콘텐츠(종목·가격·재무·시황·힌트·게임설정)를 고친 뒤 여기 [저장]을 누르면 이
              데이터셋에 반영돼요.
            </span>
          </div>
          <button className="act-btn buy" disabled={busy || !active} onClick={saveActive}>
            💾 저장
          </button>
        </div>

        {/* 새 데이터셋으로 저장 + 파일 */}
        <div className="ds-save">
          <input
            className="bc-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="새 데이터셋 이름 (예: 2026 시나리오)"
            maxLength={60}
          />
          <input
            className="bc-input"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="설명 (선택)"
            maxLength={120}
          />
          <button className="act-btn bc-go" disabled={busy || !name.trim()} onClick={saveNew}>
            + 새 데이터셋으로 저장
          </button>
        </div>
        <div className="ds-import">
          <label className="text-btn file-btn">
            📁 파일 가져오기 (.json)
            <input type="file" accept="application/json,.json" onChange={onImport} hidden />
          </label>
        </div>

        {started && (
          <p className="awarn">
            게임 진행 중이라 다른 데이터셋으로 [편집] 전환이 잠겨 있어요. [진행] 탭에서 게임 리셋 후 가능합니다.
          </p>
        )}

        {datasets.length === 0 ? (
          <p className="aempty">저장된 데이터셋이 없어요.</p>
        ) : (
          <div className="ds-list">
            {datasets.map((d) => (
              <div key={d.id} className={'ds-row' + (d.id === activeId ? ' on' : '')}>
                <div className="ds-info">
                  <span className="ds-name">
                    {d.name}
                    {d.id === activeId && <span className="ds-badge">편집 중</span>}
                  </span>
                  {d.description && <span className="ds-desc">{d.description}</span>}
                </div>
                <div className="ds-btns">
                  <button
                    className="act-btn buy sm"
                    disabled={busy || started || d.id === activeId}
                    onClick={() => setConfirm({ type: 'load', id: d.id, name: d.name })}
                  >
                    편집
                  </button>
                  <button className="text-btn" disabled={busy} onClick={() => exportDs(d)}>
                    내보내기
                  </button>
                  <button
                    className="text-btn danger tiny"
                    disabled={busy}
                    onClick={() => setConfirm({ type: 'delete', id: d.id, name: d.name })}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'load' ? '데이터셋 편집 전환' : '데이터셋 삭제'}
      >
        <div className="confirm">
          {confirm?.type === 'load' ? (
            <>
              <p className="big">
                <b>'{confirm?.name}'</b> 편집을 시작합니다
              </p>
              <p className="ask">
                지금 콘텐츠가 이 데이터셋으로 <b>바뀌고 게임이 리셋</b>됩니다(조는 유지). <b>저장하지 않은
                변경은 사라져요.</b>
              </p>
            </>
          ) : (
            <p className="big">
              <b>'{confirm?.name}'</b>을 삭제할까요?
            </p>
          )}
        </div>
        <div className="mfoot">
          <button className="cancel" onClick={() => setConfirm(null)}>
            취소
          </button>
          <button
            className={'act-btn ' + (confirm?.type === 'load' ? 'buy' : 'sell')}
            disabled={busy}
            onClick={runConfirm}
          >
            {confirm?.type === 'load' ? '편집 시작' : '삭제'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
