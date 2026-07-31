import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import { errorText } from '../supabase'

/**
 * 데이터셋(시나리오 팩) — 게임 한 판 콘텐츠 전체를 저장/전환/백업한다.
 * 불러오기는 파괴적(콘텐츠 교체 + 게임 리셋)이라 진행 중(current_round>0)이면 서버가 차단한다.
 */
export default function AdminDatasets({ actions, game, refresh, notify }) {
  const [datasets, setDatasets] = useState([])
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null) // {type:'load'|'delete', id, name}

  const started = (game?.current_round ?? 0) > 0

  const loadDatasets = async () => {
    const r = await actions.listDatasets()
    if (r.ok) setDatasets(r.datasets ?? [])
  }
  useEffect(() => {
    loadDatasets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveNew = async () => {
    const nm = name.trim()
    if (!nm) return
    setBusy(true)
    const r = await actions.saveDataset(nm, desc)
    setBusy(false)
    if (!r.ok) return notify(errorText(r.error), 'down')
    setName('')
    setDesc('')
    notify(`'${nm}' 데이터셋으로 저장했어요`, 'gold')
    loadDatasets()
  }

  const overwrite = async (d) => {
    setBusy(true)
    const r = await actions.saveDataset(d.name, d.description, d.id)
    setBusy(false)
    if (!r.ok) return notify(errorText(r.error), 'down')
    notify(`'${d.name}'에 현재 상태를 덮어썼어요`, 'gold')
    loadDatasets()
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
    notify(`'${nm}' 데이터셋을 가져왔어요`, 'gold')
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
    if (c.type === 'load') {
      notify(`'${c.name}' 데이터셋을 불러왔어요`, 'gold')
      await refresh()
    } else {
      notify(`'${c.name}' 데이터셋을 삭제했어요`, 'gold')
      loadDatasets()
    }
  }

  return (
    <div className="apanel">
      <section className="acard">
        <span className="acap">데이터셋 · 시나리오 저장·전환·백업</span>
        <p className="anote">
          게임 한 판 콘텐츠(종목·가격·재무·시황·힌트·게임설정) 전체를 데이터셋으로 저장·전환해요. .json으로
          내보내 백업·공유하거나 파일을 가져올 수 있어요. <b>불러오기는 게임 시작 전(리셋 상태)에만</b> 됩니다.
        </p>
        <div className="ds-save">
          <input
            className="bc-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (예: 2026 시나리오)"
            maxLength={60}
          />
          <input
            className="bc-input"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="설명 (선택)"
            maxLength={120}
          />
          <button className="act-btn buy bc-go" disabled={busy || !name.trim()} onClick={saveNew}>
            현재 콘텐츠를 데이터셋으로 저장
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
            게임 진행 중이라 불러오기가 잠겨 있어요. [진행] 탭에서 게임 리셋 후 가능합니다.
          </p>
        )}

        {datasets.length === 0 ? (
          <p className="aempty">저장된 데이터셋이 없어요.</p>
        ) : (
          <div className="ds-list">
            {datasets.map((d) => (
              <div key={d.id} className="ds-row">
                <div className="ds-info">
                  <span className="ds-name">{d.name}</span>
                  {d.description && <span className="ds-desc">{d.description}</span>}
                </div>
                <div className="ds-btns">
                  <button className="text-btn" disabled={busy} onClick={() => exportDs(d)}>
                    내보내기
                  </button>
                  <button className="text-btn" disabled={busy} onClick={() => overwrite(d)}>
                    덮어쓰기
                  </button>
                  <button
                    className="act-btn buy sm"
                    disabled={busy || started}
                    onClick={() => setConfirm({ type: 'load', id: d.id, name: d.name })}
                  >
                    불러오기
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
        title={confirm?.type === 'load' ? '데이터셋 불러오기' : '데이터셋 삭제'}
      >
        <div className="confirm">
          {confirm?.type === 'load' ? (
            <>
              <p className="big">
                <b>'{confirm?.name}'</b>을 불러옵니다
              </p>
              <p className="ask">
                현재 종목·재무·시황·힌트·게임설정이 <b>이 데이터셋으로 전부 교체</b>됩니다(조는 유지, 게임은
                시작 전 상태). 되돌릴 수 없습니다.
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
            {confirm?.type === 'load' ? '불러오기' : '삭제'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
