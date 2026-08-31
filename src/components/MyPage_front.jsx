import { useState } from 'react'
import { useAccessibilityContext } from '../hooks/useAccessibility'

/**
 * MyPage (FRONT) - 외견/UI 담당 (인라인 CSS)
 *
 * back에서 받는 데이터: user, userDoc, isLoading, loading, error
 * back에서 받는 함수: onSignInWithGoogle, onLogout, onUpdateUserDoc, onUpdateProfile
 */

const TRAVEL_TYPES = [
  { key: 'wheelchair', icon: '♿', label: '휠체어' },
  { key: 'stroller',   icon: '👶', label: '유모차' },
  { key: 'elderly',    icon: '🧓', label: '고령자' },
]

const FONT_SIZE_OPTIONS = [
  { value: 'small',  label: '소' },
  { value: 'medium', label: '중' },
  { value: 'large',  label: '대' },
]

// 프로필 수정 모달 (닉네임 / 프로필 사진 URL / 소개)
function EditProfileModal({ initialName, initialPhoto, initialBio, onClose, onSave }) {
  const [name, setName] = useState(initialName || '')
  const [photo, setPhoto] = useState(initialPhoto || '')
  const [bio, setBio] = useState(initialBio || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    await onSave({ displayName: name.trim(), photoURL: photo.trim(), bio: bio.trim() })
    setSaving(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px 20px 0 0',
        padding: 20, width: '100%', maxHeight: '85vh', overflowY: 'auto',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 700 }}>프로필 수정</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          {photo
            ? <img src={photo} alt="프로필 미리보기" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'var(--green-500)' }}>
                {name?.[0] || '?'}
              </div>
          }
        </div>

        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>닉네임</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="닉네임을 입력하세요"
          maxLength={20}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid var(--gray-200)', fontSize: 14,
            marginBottom: 14, outline: 'none', boxSizing: 'border-box',
          }}
        />

        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>프로필 사진 URL</p>
        <input
          value={photo}
          onChange={e => setPhoto(e.target.value)}
          placeholder="https://..."
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid var(--gray-200)', fontSize: 14,
            marginBottom: 14, outline: 'none', boxSizing: 'border-box',
          }}
        />

        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>소개</p>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="나를 한 줄로 소개해보세요"
          maxLength={80}
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid var(--gray-200)', fontSize: 13,
            resize: 'none', outline: 'none', lineHeight: 1.6,
            boxSizing: 'border-box', marginBottom: 6,
          }}
        />
        <p style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'right', marginBottom: 16 }}>
          {bio.length}/80
        </p>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="btn btn-primary"
          style={{ width: '100%', opacity: !name.trim() ? 0.5 : 1 }}
        >
          {saving ? <span className="spinner" /> : '저장하기'}
        </button>
      </div>
    </div>
  )
}

export default function MyPageFront({
  user,
  userDoc,
  isLoading,
  loading,
  error,
  onSignInWithGoogle,
  onLogout,
  onUpdateUserDoc,
  onUpdateProfile,
}) {
  const [showEditProfile, setShowEditProfile] = useState(false)
  const { settings: a11y, update: updateA11y } = useAccessibilityContext()

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
          onClick={onSignInWithGoogle}
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

  const displayName = userDoc?.displayName || user.displayName
  const photoURL = userDoc?.photoURL || user.photoURL
  const bio = userDoc?.bio

  return (
    <div className="page">
      <p className="page-title">내 정보</p>

      <div className="card section" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {photoURL
          ? <img src={photoURL} alt="프로필" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
          : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'var(--green-500)', flexShrink: 0 }}>
              {displayName?.[0] || '?'}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ fontWeight: 700, fontSize: 16 }}>{displayName}</p>
            <button
              onClick={() => setShowEditProfile(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--gray-400)', padding: 2 }}
              aria-label="프로필 수정"
            >
              ✏️
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: bio ? 4 : 10 }}>{user.email}</p>
          {bio && <p style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.5, marginBottom: 10 }}>{bio}</p>}
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

      <div className="section">
        <p className="section-title">내 여행 유형</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TRAVEL_TYPES.map(type => {
            const active = userDoc?.travelType === type.key
            return (
              <div
                key={type.key}
                onClick={() => onUpdateUserDoc({ travelType: type.key })}
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

      <div className="section">
        <p className="section-title">접근성 설정</p>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* TTS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>음성 안내 (TTS)</span>
            <div
              onClick={() => updateA11y({ tts: !a11y.tts })}
              style={{ width: 40, height: 22, borderRadius: 11, background: a11y.tts ? 'var(--green-500)' : 'var(--gray-200)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: a11y.tts ? 20 : 2, transition: 'left 0.2s' }} />
            </div>
          </div>

          {/* 글자 크기 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>글자 크기</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {FONT_SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateA11y({ fontSize: opt.value })}
                  style={{
                    width: 36, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: a11y.fontSize === opt.value ? 'var(--green-500)' : 'var(--gray-100)',
                    color: a11y.fontSize === opt.value ? 'white' : 'var(--gray-800)',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 고대비 모드 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>고대비 모드</span>
            <div
              onClick={() => updateA11y({ highContrast: !a11y.highContrast })}
              style={{ width: 40, height: 22, borderRadius: 11, background: a11y.highContrast ? 'var(--green-500)' : 'var(--gray-200)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: a11y.highContrast ? 20 : 2, transition: 'left 0.2s' }} />
            </div>
          </div>

          {/* 스탬프 알림 (Firestore 연동 유지) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>스탬프 알림</span>
            <div
              onClick={() => onUpdateUserDoc({ settings: { ...userDoc?.settings, stampAlert: !(userDoc?.settings?.stampAlert ?? false) } })}
              style={{ width: 40, height: 22, borderRadius: 11, background: (userDoc?.settings?.stampAlert ?? false) ? 'var(--green-500)' : 'var(--gray-200)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: (userDoc?.settings?.stampAlert ?? false) ? 20 : 2, transition: 'left 0.2s' }} />
            </div>
          </div>

        </div>
      </div>

      <div className="section">
        <button
          onClick={onLogout}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--gray-200)', background: 'white', fontSize: 14, color: 'var(--gray-600)', cursor: 'pointer', fontWeight: 500 }}
        >
          로그아웃
        </button>
      </div>

      {showEditProfile && (
        <EditProfileModal
          initialName={displayName}
          initialPhoto={photoURL}
          initialBio={bio}
          onClose={() => setShowEditProfile(false)}
          onSave={onUpdateProfile}
        />
      )}
    </div>
  )
}
