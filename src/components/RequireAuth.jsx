import { useAuth } from '../hooks/useAuth'

// 로그인 안 한 사용자가 커뮤니티/코스 탭에 들어오면 화면 자체를 이 안내로 대체함
// (좋아요/댓글처럼 "행동만 막기"가 아니라, 페이지 진입 자체를 막는 용도)
export default function RequireAuth({ children }) {
  const { user, isLoading, signInWithGoogle } = useAuth()

  if (isLoading) return null

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: 'var(--green-500)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16,
        }}>✓</div>
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>로그인이 필요한 화면이에요</p>
        <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 22 }}>로그인하고 커뮤니티·코스 기능을 이용해보세요.</p>
        <button
          onClick={signInWithGoogle}
          style={{ padding: '12px 28px', borderRadius: 8, border: 'none', background: '#2E4D9A', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          구글로 로그인
        </button>
      </div>
    )
  }

  return children
}
