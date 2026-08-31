import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore'
import { db } from '../firebase'
import { STAMPS } from './StampPage'
import { getBarrierFreeList } from '../utils/tourApi'
import { CATEGORIES, DEFAULT_CENTER } from '../utils/constants'
import { fetchWeather } from '../utils/weather'
import HomePageFront from '../components/HomePage_front'

/**
 * HomePage (BACK) - 기능/로직 담당
 *
 * 보유: 날씨(기상청 단기예보 API), 스탬프 진행 요약, AI 추천 코스(TourAPI fallback)
 * front에 넘기는 데이터: weather, stampTour, courses, coursesLoading, coursesError, categories
 */

// 날씨 조건별 아이콘/무장애 맥락 메시지 (기획서 HOME-02 "날씨 아이콘 8종" + "메시지 변형 5종")
const WEATHER_CONDITIONS = {
  sunny:        { icon: '☀️', message: '오늘은 맑고 따뜻해서 휠체어로 산책하기 좋은 날씨예요.' },
  partlyCloudy: { icon: '⛅', message: '구름이 조금 있지만 이동하기 좋은 날씨예요.' },
  cloudy:       { icon: '☁️', message: '야외 이동 시 미끄럼에 주의하세요.' },
  rainy:        { icon: '🌧️', message: '우산 준비 필요. 실내 코스를 추천해요.' },
  snowy:        { icon: '❄️', message: '노면이 미끄럽습니다. 실내 코스를 추천해요.' },
  thunder:      { icon: '⛈️', message: '천둥·번개가 칠 수 있어요. 실내 코스를 추천해요.' },
  fog:          { icon: '🌫️', message: '안개로 시야가 좁아요. 이동 시 주의하세요.' },
  heatwave:     { icon: '🥵', message: '더운 날씨예요. 그늘진 코스를 추천해요.' },
}


const STAMP_TOUR_NAME = '광주 무장애 시티 투어'

export default function HomePage() {
  const [weatherData, setWeatherData] = useState(null)
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState(null)
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState(null)

  // 기상청 단기예보 API — GPS 위치 기반, 실패 시 더미로 유지
  useEffect(() => {
    function loadWeather(lat, lng) {
      fetchWeather(lat, lng)
        .then(data => setWeatherData(data))
        .catch(() => setWeatherData(null))
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => loadWeather(pos.coords.latitude, pos.coords.longitude),
        () => loadWeather(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        { timeout: 5000 }
      )
    } else {
      loadWeather(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)
    }
  }, [])

  useEffect(() => {
    setCoursesLoading(true)
    getBarrierFreeList({ areaCode: 5, numOfRows: 5 })
      .then(body => {
        const items = body?.items?.item
        setCourses(items ? [items].flat() : [])
      })
      .catch(() => setCoursesError('추천 코스를 불러오지 못했어요'))
      .finally(() => setCoursesLoading(false))
  }, [])

  useEffect(() => {
    setPostsLoading(true)
    const q = query(collection(db, 'community'), orderBy('createdAt', 'desc'), limit(3))
    getDocs(q)
      .then(snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setPostsError('커뮤니티 소식을 불러오지 못했어요'))
      .finally(() => setPostsLoading(false))
  }, [])

  const earned = STAMPS.filter(s => s.earned).length
  const cond = weatherData ? (WEATHER_CONDITIONS[weatherData.condition] || WEATHER_CONDITIONS.sunny) : null
  const weather = weatherData ? { ...weatherData, icon: cond.icon, message: cond.message } : null

  return (
    <HomePageFront
      weather={weather}
      stampTour={{ name: STAMP_TOUR_NAME, earned, total: STAMPS.length }}
      courses={courses}
      coursesLoading={coursesLoading}
      coursesError={coursesError}
      categories={CATEGORIES}
      posts={posts}
      postsLoading={postsLoading}
      postsError={postsError}
    />
  )
}
