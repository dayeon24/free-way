import { useState } from 'react'
import { testApiConnection, getAreaBasedList, getTourCourseList, AREA_CODES } from '../utils/tourApi'
import CoursePageFront from '../components/CoursePage_front'

const API_KEY = import.meta.env.VITE_TOUR_API_KEY

/**
 * CoursePage (BACK) - 기능/로직 담당
 *
 * 보유: TourAPI 테스트 로직
 * front에 넘기는 데이터: testResult, loading, activeTest, hasKey, apiKey
 * front에 넘기는 함수: runTest (+ 테스트별 실행 함수들)
 */
export default function CoursePage() {
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTest, setActiveTest] = useState(null)

  const hasKey = API_KEY && API_KEY !== 'your_tour_api_key_here'

  async function runTest(label, fn) {
    setLoading(true)
    setActiveTest(label)
    setTestResult(null)
    try {
      const result = await fn()
      setTestResult({ type: 'success', label, data: result })
    } catch (e) {
      setTestResult({ type: 'error', label, message: e.message })
    } finally {
      setLoading(false)
    }
  }

  // 테스트 시나리오 정의 (back에서 로직 보유)
  const tests = [
    { label: '연결 테스트', text: '1. 연결 테스트 (광주 관광지 1건)', primary: true, fn: testApiConnection },
    { label: '광주 관광지 목록', text: '2. 광주 관광지 목록 (5건)', fn: () => getAreaBasedList({ areaCode: AREA_CODES.GWANGJU, numOfRows: 5 }) },
    { label: '전남 관광지 목록', text: '3. 전남 관광지 목록 (5건)', fn: () => getAreaBasedList({ areaCode: AREA_CODES.JEONNAM, numOfRows: 5 }) },
    { label: '여행코스 조회', text: '4. 광주 여행코스 조회', fn: () => getTourCourseList({ areaCode: AREA_CODES.GWANGJU }) },
  ]

  return (
    <CoursePageFront
      hasKey={hasKey}
      apiKey={API_KEY}
      testResult={testResult}
      loading={loading}
      activeTest={activeTest}
      tests={tests}
      onRunTest={runTest}
    />
  )
}
