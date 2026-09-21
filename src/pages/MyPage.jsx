import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { loadSavedCourses, getSavedCourseShareUrl } from '../utils/courseStore'
import MyPageFront from '../components/MyPage_front'

/**
 * MyPage (BACK) - 기능/로직 담당
 *
 * 보유: Firebase 로그인, Firestore 설정 저장, 저장한 코스 목록(북마크)
 * front에 넘기는 데이터: user, userDoc, isLoading, loading, error, savedCourses, savedCoursesLoading
 * front에 넘기는 함수: signInWithGoogle, logout, updateUserDoc, updateProfile, onOpenSavedCourse
 */
export default function MyPage() {
  const {
    user, userDoc, isLoading, loading, error,
    signInWithGoogle, logout, updateUserDoc, updateProfile,
  } = useAuth()
  const navigate = useNavigate()

  const [savedCourses, setSavedCourses] = useState([])
  const [savedCoursesLoading, setSavedCoursesLoading] = useState(false)
  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!user) { setSavedCourses([]); return }
    setSavedCoursesLoading(true)
    loadSavedCourses(user.uid)
      .then(setSavedCourses)
      .catch(() => setSavedCourses([]))
      .finally(() => setSavedCoursesLoading(false))
  }, [user])

  // 저장한 코스 클릭 → 공유 URL(같은 앱 안의 /course/share/:id)로 이동 (북마크처럼)
  async function handleOpenSavedCourse(saved) {
    try {
      const url = await getSavedCourseShareUrl(saved)
      const target = new URL(url)
      navigate(target.pathname + target.search)
    } catch (e) {
      console.error(e)
      setToast('코스를 불러오지 못했어요. 다시 시도해주세요.')
    }
  }

  return (
    <MyPageFront
      user={user}
      userDoc={userDoc}
      isLoading={isLoading}
      loading={loading}
      error={error}
      savedCourses={savedCourses}
      savedCoursesLoading={savedCoursesLoading}
      toast={toast}
      onSignInWithGoogle={signInWithGoogle}
      onLogout={logout}
      onUpdateUserDoc={updateUserDoc}
      onUpdateProfile={updateProfile}
      onOpenSavedCourse={handleOpenSavedCourse}
    />
  )
}
