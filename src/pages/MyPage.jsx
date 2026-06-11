import { useAuth } from '../hooks/useAuth'

const TRAVEL_TYPES = [
  { key: 'wheelchair', icon: '♿', label: '휠체어' },
  { key: 'stroller',   icon: '👶', label: '유모차' },
  { key: 'elderly',    icon: '🧓', label: '고령자' },
]

const SETTINGS = [
  { key: 'tts',          label: '음성 안내 (TTS)' },
  { key: 'highContrast', label: '고대비 모드' },
  { key: 'largeFontSize',label: '글자 크기 조절' },
  { key: 'stampAlert',   label: '스탬프 알림' },
]

export default function MyPage() {
  const { user, userDoc, isLoading, loading, error, signInWithGoogle, logout, updateUserDoc } = useAuth()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)' }} />
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32, gap: 16 }}>
        <span style={{ fontSize: 56 }}>♿</span>
        <p style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', letterSpacing: -0.5 }}>프리웨이</p>
        <p style={{ fontSize: 13, color: 'var(--gray-600)', textAlign: 'center', lineHeight: 1.6 }}>
          로그인하면 여행 기록, 스탬프,<br/>커뮤니티 활동을 저장할 수 있어요
        </p>
        {error && <p style={{ fontSize: 12, color: '#c62828', textAlign: 'center' }}>{error}</p>}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 24px', borderRadius: 10, border: '1px solid var(--gray-200)',
            background: 'white', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600, color: 'var(--gray-800)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)', width: '100%', justifyContent: 'center',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? <div className="spinner" style={{ borderTopColor: '#4285f4', borderColor: 'rgba(0,0,0,0.1)', width: 18, height: 18 }} />
            : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )
          }
          {loading ? '로그인 중...' : 'Google로 로그인'}
        </button>
        <p style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center', lineHeight: 1.6 }}>
          로그인 시 서비스 이용약관 및<br/>개인정보처리방침에 동의하게 됩니다
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <p className="page-title">내 정보</p>

      {/* 프로필 */}
      <div className="card section" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {user.photoURL
          ? <img src={user.photoURL} alt="프로필" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0 }} />
          : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'var(--green-500)', flexShrink: 0 }}>
              {user.displayName?.[0] || '?'}
            </div>
        }
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{user.displayName}</p>
          <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 10 }}>{user.email}</p>
          <div style={{ display: 'flex', gap: 16 }}>
            {[['0', '스탬프'], ['0', '완료 코스'], ['0', '방문지']].map(([n, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-500)' }}>{n}</p>
                <p style={{ fontSize: 10, color: 'var(--gray-600)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 여행 유형 - Firestore에 저장 */}
      <div className="section">
        <p className="section-title">내 여행 유형</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TRAVEL_TYPES.map(type => {
            const active = userDoc?.travelType === type.key
            return (
              <div
                key={type.key}
                onClick={() => updateUserDoc({ travelType: type.key })}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: active ? '1.5px solid var(--green-500)' : undefined }}
              >
                <span style={{ fontSize: 20 }}>{type.icon}</span>
                <span style={{ fontSize: 14, fontWeight: active ? 600 : 400 }}>{type.label}</span>
                {active && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>선택됨</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* 접근성 설정 - Firestore에 저장 */}
      <div className="section">
        <p className="section-title">접근성 설정</p>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SETTINGS.map(s => {
            const on = userDoc?.settings?.[s.key] ?? false
            return (
              <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>{s.label}</span>
                <div
                  onClick={() => updateUserDoc({ settings: { ...userDoc?.settings, [s.key]: !on } })}
                  style={{ width: 40, height: 22, borderRadius: 11, background: on ? 'var(--green-500)' : 'var(--gray-200)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.2s' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 로그아웃 */}
      <div className="section">
        <button
          onClick={logout}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--gray-200)', background: 'white', fontSize: 14, color: 'var(--gray-600)', cursor: 'pointer', fontWeight: 500 }}
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
