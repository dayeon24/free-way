import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { arrayMove } from '@dnd-kit/sortable'
import { getDistanceKm } from '../utils/constants'
import { loadBarrierIndex, fetchFestivals } from '../utils/courseApi'
import {
  TRAVELER_TYPES, generateCourse, relayoutDays, courseMeta, makeItem, suggestAlternative, addableCandidates,
  withFacilities, fetchOpenInfo, fetchAccessGrade,
} from '../utils/courseGen'
import { loadSharedCourse, AI_COURSE_KEY } from '../utils/courseStore'
import { fetchWeather } from '../utils/weather'
import { useCourseActions } from '../hooks/useCourseActions'
import AiCoursePageFront from '../components/AiCoursePage_front'

const readSession = () => {
  try { return JSON.parse(sessionStorage.getItem(AI_COURSE_KEY)) } catch { return null }
}

// contentid가 같은 장소의 필드를 갱신
const patchItem = (course, contentid, patch) => ({
  ...course,
  days: course.days.map(d => ({ ...d, items: d.items.map(it => (it.contentid === contentid ? { ...it, ...patch } : it)) })),
})

/**
 * AiCoursePage (BACK) - AI 추천 코스 상세 (기획서 "4. AI 추천 코스 상세 화면")
 *   /course/ai            : 방금 생성한 코스 (편집·재생성·저장·공유 가능)
 *   /course/share/:shareId : 공유받은 코스 (읽기 전용, 비로그인도 열람)
 *
 * 보유: 코스 상태/편집(dnd 순서 변경·삭제·추가·대체), 재생성, 날씨 대체 제안(기상청), 경로 중 편의시설 토글,
 *       행사·축제 제안, 운영시간/접근성 보강(TourAPI), 저장·공유(useCourseActions)
 */
export default function AiCoursePage() {
  const { shareId } = useParams()
  const readOnly = !!shareId
  const [params] = useSearchParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(readOnly)
  const [loadError, setLoadError] = useState(null)

  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false) // 이동시간 재계산 중
  const [facilities, setFacilities] = useState(() => new Set())
  const [facilityDays, setFacilityDays] = useState(null)

  const [regenerating, setRegenerating] = useState(false)
  const [regenError, setRegenError] = useState(null)
  const [rain, setRain] = useState(false)
  const [festivals, setFestivals] = useState([])
  const [addSheet, setAddSheet] = useState(null) // 장소 추가 중인 일차 index
  const [addQuery, setAddQuery] = useState('')

  const actions = useCourseActions(() => course)

  /* 코스 불러오기 */
  useEffect(() => {
    if (readOnly) {
      setLoading(true)
      loadSharedCourse(shareId, params.get('d'))
        .then(c => setCourse(c))
        .catch(e => setLoadError(e.message === 'NOT_FOUND' || e.message === 'EMPTY' ? '삭제되었거나 존재하지 않는 코스입니다.' : '코스를 불러오지 못했어요.'))
        .finally(() => setLoading(false))
      return
    }
    const c = state?.course || readSession()
    if (!c) { navigate('/course', { replace: true }); return }
    setCourse(c)
    if (c.savedId) actions.setSavedId(c.savedId)
  }, [shareId])

  // 새로고침해도 유지 (편집 내용/저장 여부 포함)
  useEffect(() => {
    if (!course || readOnly) return
    try { sessionStorage.setItem(AI_COURSE_KEY, JSON.stringify({ ...course, savedId: actions.savedId || course.savedId || null })) } catch { /* 용량 초과 등은 무시 */ }
  }, [course, actions.savedId])

  /* 운영시간 / 접근성 보강 — 화면을 먼저 보여주고 하나씩 채움 (코스가 바뀌면 처음부터) */
  useEffect(() => {
    if (!course || readOnly) return
    let cancelled = false
    const items = course.days.flatMap(d => d.items).filter(it => it.kind === 'place')
    const needOpen = items.filter(it => !it.openTime && !it.openChecked && [12, 14, 28, 38, 39].includes(it.type)).slice(0, 14)
    const sensitive = TRAVELER_TYPES.find(t => t.key === course.conditions?.travelerType)?.sensitive
    const needAccess = sensitive ? items.filter(it => it.grade === 'unknown' && !it.accessChecked).slice(0, 10) : []
    ;(async () => {
      for (const it of needOpen) {
        if (cancelled) return
        const info = await fetchOpenInfo(it.contentid, it.type)
        if (!cancelled) setCourse(c => c && patchItem(c, it.contentid, { openChecked: true, ...(info || {}) }))
      }
      for (const it of needAccess) {
        if (cancelled) return
        const grade = await fetchAccessGrade(it.contentid)
        if (!cancelled) setCourse(c => c && patchItem(c, it.contentid, {
          accessChecked: true,
          ...(grade ? { grade, warning: grade === 'available' ? null : '휠체어 출입 정보가 확인되지 않았어요' } : {}),
        }))
      }
    })()
    return () => { cancelled = true }
  }, [course?.id])

  /* 날씨 (비/눈 예보 시 실내 대체 제안 배너) + 행사·축제 제안 */
  useEffect(() => {
    if (!course || readOnly) return
    let cancelled = false
    fetchWeather(course.center.y, course.center.x).then(w => { if (!cancelled) setRain(!!w.rain) }).catch(() => {})
    fetchFestivals(new Date()).then(list => {
      if (cancelled) return
      const used = new Set(course.days.flatMap(d => d.items.map(i => i.contentid)))
      setFestivals(
        list.filter(f => !used.has(f.id))
          .map(f => ({ ...f, distKm: getDistanceKm(course.center.y, course.center.x, f.y, f.x) }))
          .filter(f => f.distKm <= 25).sort((a, b) => a.distKm - b.distKm).slice(0, 3),
      )
    }).catch(() => {})
    return () => { cancelled = true }
  }, [course?.id])

  /* 경로 중 편의시설 삽입 (표시용) */
  useEffect(() => {
    if (!course || facilities.size === 0) { setFacilityDays(null); return }
    let cancelled = false
    withFacilities(course.days, facilities).then(d => { if (!cancelled) setFacilityDays(d) }).catch(() => {
      if (!cancelled) { setFacilityDays(null); actions.setToast('편의시설 정보를 불러오지 못했어요.') }
    })
    return () => { cancelled = true }
  }, [course?.days, facilities])

  /* 편집 */
  async function commitDays(days) {
    setBusy(true)
    try {
      const laid = await relayoutDays(days, course.conditions.transport)
      setCourse(c => ({ ...c, days: laid }))
    } finally { setBusy(false) }
  }
  const mapDay = (di, fn) => course.days.map((d, i) => (i === di ? { ...d, items: fn(d.items) } : d))

  function handleReorder(di, from, to) {
    const days = mapDay(di, items => arrayMove(items, from, to))
    setCourse({ ...course, days })
    commitDays(days)
  }
  function handleRemove(di, item) {
    const days = mapDay(di, items => items.filter(i => i.key !== item.key))
    setCourse({ ...course, days })
    commitDays(days)
  }
  async function handleAddPlace(di, candidate) {
    const barrier = await loadBarrierIndex()
    const sensitive = TRAVELER_TYPES.find(t => t.key === course.conditions.travelerType)?.sensitive
    const item = makeItem(candidate, barrier, sensitive)
    // 마지막 일정이 숙박이면 그 앞에 끼워 넣음
    const days = mapDay(di, items => {
      const last = items[items.length - 1]
      return last?.type === 32 ? [...items.slice(0, -1), item, last] : [...items, item]
    })
    setAddSheet(null); setAddQuery('')
    setCourse({ ...course, days })
    commitDays(days)
  }
  async function handleAlternative(item) {
    const alt = suggestAlternative(course, item)
    if (!alt) { actions.setToast('대체할 장소를 찾지 못했어요.'); return }
    const barrier = await loadBarrierIndex()
    const sensitive = TRAVELER_TYPES.find(t => t.key === course.conditions.travelerType)?.sensitive
    const replacement = makeItem(alt, barrier, sensitive)
    const days = course.days.map(d => ({ ...d, items: d.items.map(i => (i.key === item.key ? replacement : i)) }))
    setCourse({ ...course, days })
    commitDays(days)
    actions.setToast(`'${alt.name}'(으)로 바꿨어요.`)
  }
  function handleAddFestival(f) {
    loadBarrierIndex().then(barrier => {
      const item = makeItem(f, barrier, false, { reason: `${f.period.replace(/(\d{4})(\d{2})(\d{2})/g, '$2/$3')} 진행` })
      const days = mapDay(0, items => {
        const last = items[items.length - 1]
        return last?.type === 32 ? [...items.slice(0, -1), item, last] : [...items, item]
      })
      setFestivals(list => list.filter(x => x.id !== f.id))
      setCourse({ ...course, days })
      commitDays(days)
      actions.setToast(`'${f.name}'을(를) 일정에 추가했어요.`)
    })
  }

  /* 재생성 (같은 조건으로 / 날씨 대체: 실내 중심) */
  async function regenerate(indoor = false) {
    setRegenerating(true)
    setRegenError(null)
    try {
      const fresh = await generateCourse(course.conditions, {
        center: { lat: course.center.y, lng: course.center.x },
        indoorPreferred: indoor || !!course.options?.indoorPreferred,
      })
      setCourse(fresh)
      setEditing(false)
      setFacilities(new Set())
      actions.setSavedId(null)
      actions.setToast(indoor ? '실내 중심으로 코스를 다시 만들었어요.' : '새 코스를 만들었어요.')
    } catch (e) {
      console.error(e)
      const msg = navigator.onLine ? '코스 생성에 실패했어요. 다시 시도해주세요.' : '인터넷 연결을 확인해주세요.'
      setRegenError(msg)
      actions.setToast(msg)
    } finally {
      setRegenerating(false)
    }
  }

  function handlePlaceClick(item) {
    navigate('/map', { state: { searchQuery: item.name, toast: `'${item.name}' 위치를 지도에서 보여드려요.` } })
  }

  const displayDays = useMemo(() => {
    if (!course) return []
    return editing || facilities.size === 0 || !facilityDays ? course.days : facilityDays
  }, [course, editing, facilities, facilityDays])

  const meta = useMemo(() => (course ? courseMeta(course) : null), [course])

  const addList = useMemo(() => {
    if (addSheet == null || !course) return []
    const day = course.days[addSheet]
    const from = day?.items[day.items.length - 1] || course.center
    const q = addQuery.trim()
    return addableCandidates(course, from).filter(c => !q || c.name.includes(q)).slice(0, 40)
  }, [addSheet, addQuery, course])

  const keyPlaces = course
    ? course.days.flatMap(d => d.items).filter(it => it.kind === 'place' && [12, 14, 15, 28].includes(it.type)).slice(0, 6)
    : []

  return (
    <AiCoursePageFront
      course={course}
      meta={meta}
      displayDays={displayDays}
      keyPlaces={keyPlaces}
      readOnly={readOnly}
      loading={loading}
      loadError={loadError}
      editing={editing}
      busy={busy}
      facilities={facilities}
      showWeatherBanner={rain && !course?.options?.indoorPreferred}
      festivals={festivals}
      regenerating={regenerating}
      regenError={regenError}
      addSheet={addSheet}
      addQuery={addQuery}
      addList={addList}
      actions={actions}
      onBack={() => navigate('/course')}
      onToggleEdit={() => { setEditing(e => !e); if (!editing) setFacilities(new Set()) }}
      onToggleFacility={kind => setFacilities(prev => { const n = new Set(prev); n.has(kind) ? n.delete(kind) : n.add(kind); return n })}
      onReorder={handleReorder}
      onRemove={handleRemove}
      onOpenAdd={di => { setAddSheet(di); setAddQuery('') }}
      onCloseAdd={() => setAddSheet(null)}
      onChangeAddQuery={setAddQuery}
      onAddPlace={handleAddPlace}
      onAlternative={handleAlternative}
      onAddFestival={handleAddFestival}
      onRegenerate={() => regenerate(false)}
      onWeatherSwap={() => regenerate(true)}
      onCloseRegen={() => setRegenError(null)}
      onPlaceClick={handlePlaceClick}
      onMakeMine={() => navigate('/course')}
      onCopyCurrentUrl={async () => {
        try { await navigator.clipboard.writeText(window.location.href); actions.setToast('링크를 복사했어요.') }
        catch { actions.setToast('링크 복사에 실패했어요.') }
      }}
    />
  )
}
