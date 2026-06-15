import { useAuth } from '../hooks/useAuth'
import MyPageFront from '../components/MyPage_front'

/**
 * MyPage (BACK) - 기능/로직 담당
 *
 * 보유: Firebase 로그인, Firestore 설정 저장
 * front에 넘기는 데이터: user, userDoc, isLoading, loading, error
 * front에 넘기는 함수: signInWithGoogle, logout, updateUserDoc
 */
export default function MyPage() {
  const { user, userDoc, isLoading, loading, error, signInWithGoogle, logout, updateUserDoc } = useAuth()

  return (
    <MyPageFront
      user={user}
      userDoc={userDoc}
      isLoading={isLoading}
      loading={loading}
      error={error}
      onSignInWithGoogle={signInWithGoogle}
      onLogout={logout}
      onUpdateUserDoc={updateUserDoc}
    />
  )
}
