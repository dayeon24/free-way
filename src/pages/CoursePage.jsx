import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_CENTER } from '../utils/constants'
import { loadTourCourses } from '../utils/courseApi'
import { generateCourse } from '../utils/courseGen'
import { loadAllLikes, AI_COURSE_KEY } from '../utils/courseStore'
import { fetchWeather } from '../utils/weather'
import { useAuth } from '../hooks/useAuth'
import CoursePageFront from '../components/CoursePage_front'

const EMPTY_CONDITIONS = { travelerType: null, transport: null, stamina: null, duration: null }

/**
 * CoursePage (BACK) - 기능/로직 담당 (코스 탭 메인, 기획서 "1. 코스 탭 구성 개요")
 *
 * 보유: 추천 코스 목록(정적 데이터) 로드, 좋아요 수, 날씨 배너(기상청), AI 코스 만들기 시트 상태/생성
 * front에 넘기는 데이터: courses, loading, loadError, likes, weatherBanner, sheetOpen, conditions,
 *                       generating, genError, canGenerate, toast
 * front에 넘기는 함수: onOpenSheet, onCloseSheet, onSelectCondition, onGenerate, onOpenCourse,
 *                     onPlaceClick, onWeatherClick, onRetry
 */
export default function CoursePage() {
  const navigate = useNavigate()
  const { userDoc } = useAuth()

  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [likes, setLikes] = useState({})
  const [weather, setWeather] = useState(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [conditions, setConditions] = useState(EMPTY_CONDITIONS)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)

  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const off = () => setToast('인터넷 연결을 확인해주세요.')
    window.addEventListener('offline', off)
    return () => window.removeEventListener('offline', off)
  }, [])

  function loadCourses() {
    setLoading(true)
    setLoadError(false)
    loadTourCourses()
      .then(setCourses)
      .catch(() => { setLoadError(true); setToast(navigator.onLine ? '장소 정보를 불러오지 못했어요.' : '인터넷 연결을 확인해주세요.') })
      .finally(() => setLoading(false))
  }
  useEffect(loadCourses, [])

  // 좋아요 수 — 규칙/네트워크 문제로 실패해도 목록은 그대로 보여줌 (수치만 0)
  useEffect(() => { loadAllLikes().then(setLikes).catch(() => {}) }, [])

  // 날씨 알림 배너용 기상청 예보 (홈과 동일하게 GPS → 실패 시 광주 중심)
  useEffect(() => {
    const load = (lat, lng) => fetchWeather(lat, lng).then(setWeather).catch(() => setWeather(null))
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => load(p.coords.latitude, p.coords.longitude),
        () => load(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        { timeout: 5000 },
      )
    } else load(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)
  }, [])

  // 악천후(강수형태 PTY 1·2·3·4)일 때만 노출, 평상시 숨김 (기획서 "3. 날씨 배너")
  const now = new Date()
  const weatherBanner = weather?.rain
    ? `${now.getMonth() + 1}/${now.getDate()} ${weather.condition === 'snowy' ? '눈' : '비'} 예보 — 실내 코스 위주로 추천돼요.`
    : null

  const canGenerate = Object.values(conditions).every(Boolean) && !generating

  async function handleGenerate() {
    if (!canGenerate) return
    setGenerating(true)
    setGenError(null)
    try {
      const center = await new Promise(resolve => {
        if (!navigator.geolocation) return resolve(DEFAULT_CENTER)
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(DEFAULT_CENTER),
          { timeout: 4000 },
        )
      })
      // 광주·전남 밖에서 접속해도 코스는 광주 중심으로 생성 (서비스 지역 한정)
      const inRegion = center.lat > 34 && center.lat < 35.6 && center.lng > 125.8 && center.lng < 127.9
      const course = await generateCourse(conditions, { center: inRegion ? center : DEFAULT_CENTER })
      sessionStorage.setItem(AI_COURSE_KEY, JSON.stringify(course))
      setSheetOpen(false)
      navigate('/course/ai', { state: { course } })
    } catch (e) {
      console.error(e)
      const msg = !navigator.onLine ? '인터넷 연결을 확인해주세요.' : '코스 생성에 실패했어요. 다시 시도해주세요.'
      setGenError(msg)
      setToast(msg)
    } finally {
      setGenerating(false)
    }
  }

  function handlePlaceClick(name) {
    navigate('/map', { state: { searchQuery: name, toast: `'${name}' 위치를 지도에서 보여드려요.` } })
  }

  return (
    <CoursePageFront
      courses={courses}
      loading={loading}
      loadError={loadError}
      likes={likes}
      weatherBanner={weatherBanner}
      sheetOpen={sheetOpen}
      myTravelType={userDoc?.travelType}
      conditions={conditions}
      generating={generating}
      genError={genError}
      canGenerate={canGenerate}
      toast={toast}
      onOpenSheet={() => { setGenError(null); setSheetOpen(true) }}
      onCloseSheet={() => setSheetOpen(false)}
      onSelectCondition={(key, value) => { setGenError(null); setConditions(prev => ({ ...prev, [key]: value })) }}
      onGenerate={handleGenerate}
      onOpenCourse={id => navigate(`/course/${id}`)}
      onPlaceClick={handlePlaceClick}
      onWeatherClick={() => navigate('/')}
      onRetry={loadCourses}
    />
  )
}
