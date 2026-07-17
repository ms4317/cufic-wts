import { useState } from 'react'
import ThemeToggle from './ThemeToggle'

/**
 * 조별 코드 입장 화면.
 * @param {(code: string) => {ok: boolean, error?: string}} onSubmit  auth.login
 */
export default function Login({ onSubmit, theme, onToggleTheme }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const result = onSubmit(code)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="login">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} className="theme-fab" />

      <div className="card">
        <div className="mark" />
        <h1>CUFIC WTS</h1>
        <p className="sub2">스마트 주식 교실 · 모의투자 시스템</p>

        <form onSubmit={submit}>
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
          <button type="submit" className="go">
            입장하기
          </button>
        </form>

        <p className="hint">참가 코드는 강사 선생님에게 받으세요</p>
      </div>
    </div>
  )
}
