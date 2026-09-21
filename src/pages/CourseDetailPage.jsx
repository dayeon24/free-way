import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getTourCourse, loadBarrierIndex, COURSE_CATEGORIES } from '../utils/courseApi'
import { tourToCourse, courseMeta, fetchAccessGrade } from '../utils/courseGen'
import { loadLikes, setLike } from '../utils/courseStore'
import { useCourseActions } from '../hooks/useCourseActions'
import CourseDetailPageFront from '../components/CourseDetailPage_front'

/**
 * CourseDetailPage (BACK) - 추천 코스 상세 (기획서 "3. 추천 코스 상세 화면")
 *
 * 보유: 코스 로드(정적 데이터 + 무장애 등급), 좋아요 토글(로그인 필수), 저장/공유(useCourseActions), 신고
 * front에 넘기는 데이터: course, meta, loading, notFound, likes, liked, actions(저장/공유/토스트 상태), moreOpen
 * front에 넘기는 함수: onBack, onToggleLike, onSave, onShare, onPlaceClick, onOpenMore, onCloseMore, onReport, onInquiry
 */
export default function CourseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [base, setBase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [likes, setLikes] = useState([])
  const [moreOpen, setMoreOpen] = useState(false)
  const [access, setAccess] = useState({}) // contentid → 보강된 접근성 등급

  const actions = useCourseActions(() => course)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    Promise.all([getTourCourse(id), loadBarrierIndex()])
      .then(([tc, barrier]) => {
        if (cancelled) return
        if (!tc) { setNotFound(true); return }
        setBase(tourToCourse(tc, barrier))
      })
      .catch(() => { if (!cancelled) { setNotFound(true); actions.setToast('장소 정보를 불러오지 못했어요.') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    loadLikes(id).then(l => { if (!cancelled) setLikes(l) }).catch(() => {})
    return () => { cancelled = true }
  }, [id])

  // 무장애 여행 정보(detailWithTour2)로 등급 보강 — 화면을 먼저 보여준 뒤 하나씩 채움
  useEffect(() => {
    if (!base) return
    let cancelled = false
    const targets = base.days.flatMap(d => d.items).filter(it => it.grade === 'unknown').slice(0, 10)
    ;(async () => {
      for (const it of targets) {
        if (cancelled) return
        const acc = await fetchAccessGrade(it.contentid)
        if (acc && !cancelled) setAccess(prev => ({ ...prev, [it.contentid]: acc }))
      }
    })()
    return () => { cancelled = true }
  }, [base])

  // 보강된 등급 반영
  const course = useMemo(() => {
    if (!base) return null
    return {
      ...base,
      days: base.days.map(d => ({
        ...d,
        items: d.items.map(it => {
          const acc = access[it.contentid]
          if (!acc) return it
          return { ...it, grade: acc.grade, warning: acc.grade === 'available' ? null : acc.note, accessTags: acc.tags }
        }),
      })),
    }
  }, [base, access])

  const meta = useMemo(() => {
    if (!course) return null
    const m = courseMeta(course)
    const nights = course.nights || 0
    return {
      type: m.accessibleRatio >= 0.5 ? '휠체어' : '일반',
      schedule: nights ? `${nights}박 ${nights + 1}일` : '당일',
      distance: course.distance ? `약 ${course.distance}` : `약 ${m.totalKm}km`,
      keyPlaces: course.days.flatMap(d => d.items).filter(it => it.type !== 32).slice(0, 6),
    }
  }, [course])

  const liked = !!actions.user && likes.includes(actions.user.uid)

  // 좋아요: 로그인 → 토글 + 카운트 즉시 반영 (실패 시 원복), 비로그인 → 로그인 팝업
  async function handleToggleLike() {
    if (!actions.user) { actions.requireLogin(); return }
    const uid = actions.user.uid
    const wasLiked = likes.includes(uid)
    setLikes(prev => (wasLiked ? prev.filter(u => u !== uid) : [...prev, uid]))
    try {
      await setLike(id, uid, !wasLiked)
    } catch (e) {
      console.error(e)
      setLikes(prev => (wasLiked ? [...prev, uid] : prev.filter(u => u !== uid)))
      actions.setToast('좋아요 처리에 실패했어요. 다시 시도해주세요.')
    }
  }

  function handlePlaceClick(nameOrItem) {
    const name = typeof nameOrItem === 'string' ? nameOrItem : nameOrItem.name
    navigate('/map', { state: { searchQuery: name, toast: `'${name}' 위치를 지도에서 보여드려요.` } })
  }

  async function handleReport() {
    setMoreOpen(false)
    if (!actions.user) { actions.requireLogin(); return }
    try {
      await addDoc(collection(db, 'reports'), { type: 'course', courseId: id, uid: actions.user.uid, createdAt: serverTimestamp() })
      actions.setToast('신고가 접수됐어요.')
    } catch (e) {
      console.error(e)
      actions.setToast('신고 접수에 실패했어요. 다시 시도해주세요.')
    }
  }

  return (
    <CourseDetailPageFront
      course={course}
      meta={meta}
      categoryLabel={course ? COURSE_CATEGORIES[course.category]?.label : ''}
      loading={loading}
      notFound={notFound}
      likeCount={likes.length}
      liked={liked}
      actions={actions}
      moreOpen={moreOpen}
      onBack={() => navigate('/course')}
      onToggleLike={handleToggleLike}
      onPlaceClick={handlePlaceClick}
      onOpenMore={() => setMoreOpen(true)}
      onCloseMore={() => setMoreOpen(false)}
      onReport={handleReport}
      onInquiry={() => { setMoreOpen(false); actions.setToast('문의하기는 준비 중이에요.') }}
    />
  )
}
