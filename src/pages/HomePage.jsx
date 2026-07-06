import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore'
import { db } from '../firebase'
import { STAMPS } from './StampPage'
import { getBarrierFreeList } from '../utils/tourApi'
import { CATEGORIES } from '../utils/constants'
import HomePageFront from '../components/HomePage_front'

/**
 * HomePage (BACK) - 기능/로직 담당
 *
 * 보유: 날씨(더미, API 연동 전), 스탬프 진행 요약(StampPage 재사용), AI 추천 코스(TourAPI 인기 fallback)
 * front에 넘기는 데이터: weather, stampTour, courses, coursesLoading, coursesError, categories
 */

// 날씨 조건별 아이콘/무장애 맥락 메시지 (기획서 HOME-02 "날씨 아이콘 8종" + "메시지 변형 5종")
// 맑음/흐림/비/눈/폭염 5종은 기획서 표에 명시된 문구 그대로. 구름/천둥/안개는 표에 없어 톤에 맞춰 보완.
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

// TODO: 기상청 단기예보 API + 에어코리아 미세먼지 API 연동 전까지 더미 데이터.
// condition은 API 연동 시 응답 코드(SKY/PTY 등)로 결정될 예정, 지금은 'sunny' 고정
const DUMMY_CONDITION = 'sunny'
const DUMMY_WEATHER_BASE = {
  temp: 24,
  tempMin: 18,
  tempMax: 26,
  dustLevel: 'good', // good | normal | bad | veryBad
  rain: false,
}

const STAMP_TOUR_NAME = '광주 무장애 시티 투어'

export default function HomePage() {
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState(null)

  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState(null)

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

  const weather = {
    ...DUMMY_WEATHER_BASE,
    icon: WEATHER_CONDITIONS[DUMMY_CONDITION].icon,
    message: WEATHER_CONDITIONS[DUMMY_CONDITION].message,
  }

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
