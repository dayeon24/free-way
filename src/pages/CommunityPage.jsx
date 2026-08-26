import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, getDocs, updateDoc, doc,
  arrayUnion, arrayRemove, orderBy, query
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { COMMUNITY_SORT_OPTIONS } from '../utils/constants'
import CommunityPageFront from '../components/CommunityPage_front'

/**
 * CommunityPage (BACK) - 기능/로직 담당
 *
 * 보유: Firestore 글목록 조회, 좋아요, 검색/필터/정렬, 오프라인 감지
 * (글 작성은 별도 페이지 - WritePostPage 참고)
 * front에 넘기는 데이터:
 *   user, posts(필터/검색/정렬 적용됨), loading, filter, sortBy, sortOpen, searchQuery,
 *   loginPromptReason, toast
 * front에 넘기는 함수:
 *   onLike, onFilter, onSetSortBy, onToggleSortOpen, onSearchChange,
 *   onFabTap, onConfirmLogin, onCancelLoginPrompt, onPlaceTagClick
 */
export default function CommunityPage() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | review | recommend | report
  const [sortBy, setSortBy] = useState('latest')
  const [sortOpen, setSortOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 비로그인 상태에서 글쓰기/좋아요 탭 시 안내 팝업 (기획서 "4. 글쓰기 FAB", "5. 주요 동작 명세")
  const [loginPromptReason, setLoginPromptReason] = useState(null) // null | 'write' | 'like'

  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  // 네트워크 오프라인 감지 (기획서 "6. 오류 및 예외처리")
  useEffect(() => {
    function handleOffline() { setToast('인터넷 연결을 확인해주세요.') }
    window.addEventListener('offline', handleOffline)
    return () => window.removeEventListener('offline', handleOffline)
  }, [])

  async function fetchPosts() {
    setLoading(true)
    try {
      const q = query(collection(db, 'community'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error(e)
      setToast(navigator.onLine ? '게시글을 불러오지 못했어요. 다시 시도해주세요.' : '인터넷 연결을 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [])

  function handleFabTap() {
    if (user) navigate('/community/write')
    else setLoginPromptReason('write')
  }

  async function handleConfirmLogin() {
    await signInWithGoogle()
    setLoginPromptReason(null)
  }

  async function handleLike(postId, liked) {
    if (!user) { setLoginPromptReason('like'); return }
    // 낙관적 업데이트 - 실패 시 원복 (기획서 "좋아요 API 실패" 처리)
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const likes = liked ? p.likes.filter(uid => uid !== user.uid) : [...(p.likes || []), user.uid]
      return { ...p, likes }
    }))
    try {
      const ref = doc(db, 'community', postId)
      await updateDoc(ref, { likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) })
    } catch (e) {
      console.error(e)
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p
        const likes = liked ? [...(p.likes || []), user.uid] : p.likes.filter(uid => uid !== user.uid)
        return { ...p, likes }
      }))
      setToast('좋아요 처리에 실패했어요. 다시 시도해주세요.')
    }
  }

  // 장소 태그 탭 → 지도 탭으로 이동, 장소명으로 검색창 채워서 관련 핀 표시 (기획서 "5. 주요 동작 명세")
  function handlePlaceTagClick(placeName) {
    navigate('/map', { state: { searchQuery: placeName } })
  }

  // 공지 배너 탭 - 공지사항 상세 페이지는 별도 기획 전이라 준비중 안내로 대체
  function handleNoticeClick() {
    setToast('공지사항 상세 페이지는 준비 중이에요.')
  }

  function handleSortSelect(key) {
    setSortBy(key)
    setSortOpen(false)
  }

  // 검색 + 유형 필터 + 정렬 적용 (순수 클라이언트 필터링)
  let visible = filter === 'all' ? posts : posts.filter(p => p.type === filter)
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    visible = visible.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.body || '').toLowerCase().includes(q) ||
      (p.placeName || '').toLowerCase().includes(q)
    )
  }
  visible = [...visible].sort((a, b) => {
    if (sortBy === 'views') return (b.viewCount || 0) - (a.viewCount || 0)
    if (sortBy === 'likes') return (b.likes?.length || 0) - (a.likes?.length || 0)
    return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
  })

  return (
    <CommunityPageFront
      user={user}
      posts={visible}
      totalCount={posts.length}
      loading={loading}
      filter={filter}
      sortBy={sortBy}
      sortOpen={sortOpen}
      sortOptions={COMMUNITY_SORT_OPTIONS}
      searchQuery={searchQuery}
      loginPromptReason={loginPromptReason}
      toast={toast}
      onLike={handleLike}
      onFilter={setFilter}
      onSetSortBy={handleSortSelect}
      onToggleSortOpen={() => setSortOpen(prev => !prev)}
      onSearchChange={setSearchQuery}
      onFabTap={handleFabTap}
      onConfirmLogin={handleConfirmLogin}
      onCancelLoginPrompt={() => setLoginPromptReason(null)}
      onPlaceTagClick={handlePlaceTagClick}
      onNoticeClick={handleNoticeClick}
    />
  )
}
