// 거래 라운드 타이머 — 헤더 배지보다 큰 독립 요소. 학생·관리자 공용.
//   · live=true면 남은 시간 카운트다운 + 진행바가 함께 줄어든다.
//   · 60초 이하 경고색(warn), 30초 이하 강조+깜빡임(urgent). 30초 토스트 알림과 결합해 쓴다.
//   · live=false면 label(대기/마감 안내)만 크게. 서버 round_ends_at이 유일 기준(클라 카운트는 UX용).

const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function RoundTimer({ remainingMs = 0, durationMs = 0, live = false, label = '거래 대기' }) {
  const fillPct = durationMs > 0 ? Math.max(0, Math.min(100, (remainingMs / durationMs) * 100)) : 0
  const urgent = live && remainingMs <= 30000
  const warn = live && remainingMs <= 60000 && !urgent
  const cls = 'round-timer' + (live ? ' live' : ' idle') + (urgent ? ' urgent' : warn ? ' warn' : '')

  return (
    <div className={cls} role="timer" aria-live="off">
      <div className="rt-main">
        {live ? (
          <>
            <span className="rt-label">거래 마감까지</span>
            <span className="rt-clock num">{mmss(remainingMs)}</span>
            {urgent && <span className="rt-flag">마감 임박!</span>}
          </>
        ) : (
          <span className="rt-label idle">{label}</span>
        )}
      </div>
      <div className="rt-bar">
        <i style={{ width: (live ? fillPct : 0) + '%' }} />
      </div>
    </div>
  )
}
