import { useState } from 'react'
import ThemeToggle from './ThemeToggle'

/**
 * 입장 화면. 두 방식 —
 *   · code(기본): 강사가 나눠준 참가 코드 입력 (`onSubmit`).
 *   · open(자율): 닉네임으로 조를 만들거나 재접속. 신규는 PIN 1회 발급, 재접속은 닉네임+PIN (`onJoin`/`onCommit`).
 *
 * @param {'code'|'open'} mode
 * @param {(code:string)=>Promise<{ok,error?}>} onSubmit  코드 방식 로그인(입장까지 처리)
 * @param {(name:string, pin?:string)=>Promise<{ok, team?, pin?, created?, code?, error?}>} onJoin  자율 입장 시도(입장 확정 안 함)
 * @param {(team)=>Promise<void>} onCommit  실제 입장 확정
 */
export default function Login({ mode = 'code', onSubmit, onJoin, onCommit, theme, onToggleTheme }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState('name') // open: 'name' | 'pin' | 'created'
  const [made, setMade] = useState(null) // 신규 발급 결과 {team, pin}
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const open = mode === 'open'

  const submitCode = async (e) => {
    e.preventDefault()
    setBusy(true)
    const r = await onSubmit(code)
    setBusy(false)
    if (!r.ok) setError(r.error)
  }

  const submitName = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const r = await onJoin(name)
    setBusy(false)
    if (r.ok && r.created) {
      setMade({ team: r.team, pin: r.pin })
      setStep('created')
    } else if (r.ok) {
      await onCommit(r.team) // 이미 있는 조를 PIN 없이? (서버는 신규만 pin 생략) — 방어적으로 처리
    } else if (r.code === 'need_pin') {
      setStep('pin')
    } else {
      setError(r.error)
    }
  }

  const submitPin = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const r = await onJoin(name, pin)
    setBusy(false)
    if (r.ok) await onCommit(r.team)
    else setError(r.error)
  }

  return (
    <div className="login">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} className="theme-fab" />

      <div className="card">
        <span className="brand-logo" role="img" aria-label="CUFIC WTS" />
        <h1>CUFIC WTS</h1>
        <p className="sub2">스마트 주식 교실 · 모의투자 시스템</p>

        {/* ── 코드 방식 ── */}
        {!open && (
          <>
            <form onSubmit={submitCode}>
              <div className="field">
                <label htmlFor="team-code">조별 참가 코드</label>
                <input
                  id="team-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="TIGER-03"
                  autoFocus
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              <div className="err">{error}</div>
              <button type="submit" className="go" disabled={busy}>
                {busy ? '확인 중…' : '입장하기'}
              </button>
            </form>
            <p className="hint">참가 코드는 강사 선생님에게 받으세요</p>
          </>
        )}

        {/* ── 자율 입장: 닉네임 ── */}
        {open && step === 'name' && (
          <>
            <form onSubmit={submitName}>
              <div className="field">
                <label htmlFor="nick">닉네임 (우리 조 이름)</label>
                <input
                  id="nick"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="예: 불꽃투자단"
                  maxLength={12}
                  autoFocus
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              <div className="err">{error}</div>
              <button type="submit" className="go" disabled={busy || name.trim().length < 2}>
                {busy ? '입장 중…' : '입장하기'}
              </button>
            </form>
            <p className="hint">닉네임을 정하면 우리 조가 만들어져요. 이미 만든 닉네임이면 다시 들어와져요.</p>
          </>
        )}

        {/* ── 자율 입장: 재접속 PIN ── */}
        {open && step === 'pin' && (
          <>
            <form onSubmit={submitPin}>
              <p className="join-back">
                <b>{name}</b> 조로 다시 들어가기
              </p>
              <div className="field">
                <label htmlFor="pin">PIN (4자리)</label>
                <input
                  id="pin"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                    if (error) setError('')
                  }}
                  placeholder="0000"
                  inputMode="numeric"
                  autoFocus
                  autoComplete="off"
                />
              </div>
              <div className="err">{error}</div>
              <button type="submit" className="go" disabled={busy || pin.length !== 4}>
                {busy ? '확인 중…' : '다시 입장'}
              </button>
            </form>
            <button
              className="text-btn"
              onClick={() => {
                setStep('name')
                setPin('')
                setError('')
              }}
            >
              ← 다른 닉네임으로
            </button>
          </>
        )}

        {/* ── 자율 입장: 신규 PIN 발급 안내 ── */}
        {open && step === 'created' && made && (
          <div className="join-made">
            <p className="jm-hi">
              <b>{made.team.name}</b> 조로 입장했어요!
            </p>
            <div className="jm-pin">
              <span className="jm-pin-cap">재접속 PIN</span>
              <span className="jm-pin-val num">{made.pin}</span>
            </div>
            <p className="jm-note">
              다른 기기에서 다시 들어오거나, 실수로 나갔다가 돌아올 때 이 <b>PIN</b>이 필요해요.
              <b> 꼭 기억하거나 적어두세요.</b>
            </p>
            <button className="go" disabled={busy} onClick={() => onCommit(made.team)}>
              시작하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
