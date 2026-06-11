const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2'
const API_KEY = import.meta.env.VITE_TOUR_API_KEY

async function tourFetch(endpoint, params = {}) {
  const url = new URL(endpoint)
  url.searchParams.set('serviceKey', API_KEY)
  url.searchParams.set('MobileOS', 'ETC')
  url.searchParams.set('MobileApp', 'Freeway')
  url.searchParams.set('_type', 'json')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TourAPI HTTP ${res.status}`)
  const data = await res.json()

  const header = data?.response?.header
  if (header?.resultCode !== '0000') {
    throw new Error(`TourAPI 오류: ${header?.resultMsg} (${header?.resultCode})`)
  }

  return data.response.body
}

// 연결 테스트
export async function testApiConnection() {
  return tourFetch(`${BASE_URL}/areaBasedList2`, {
    numOfRows: 1, pageNo: 1, arrange: 'A', areaCode: 5, contentTypeId: 12,
  })
}

// 1. 지역 기반 관광정보 조회
export async function getAreaBasedList({ areaCode = 5, contentTypeId = 12, numOfRows = 20, pageNo = 1 } = {}) {
  return tourFetch(`${BASE_URL}/areaBasedList2`, {
    numOfRows, pageNo, arrange: 'A', areaCode, contentTypeId,
  })
}

// 2. 위치 기반 관광정보 조회
export async function getLocationBasedList({ mapX, mapY, radius = 5000, contentTypeId = 12, numOfRows = 20 } = {}) {
  return tourFetch(`${BASE_URL}/locationBasedList2`, {
    numOfRows, pageNo: 1, arrange: 'A', mapX, mapY, radius, contentTypeId,
  })
}

// 3. 키워드 검색
export async function searchKeyword({ keyword, areaCode = '', contentTypeId = '', numOfRows = 20 } = {}) {
  return tourFetch(`${BASE_URL}/searchKeyword2`, {
    numOfRows, pageNo: 1, arrange: 'A', keyword,
    ...(areaCode && { areaCode }),
    ...(contentTypeId && { contentTypeId }),
  })
}

// 4. 행사/공연/축제 조회
export async function searchFestival({ areaCode = 5, eventStartDate, numOfRows = 20 } = {}) {
  return tourFetch(`${BASE_URL}/searchFestival2`, {
    numOfRows, pageNo: 1, arrange: 'A', areaCode,
    ...(eventStartDate && { eventStartDate }),
  })
}

// 5. 숙박정보 조회
export async function searchStay({ areaCode = 5, numOfRows = 20 } = {}) {
  return tourFetch(`${BASE_URL}/searchStay2`, {
    numOfRows, pageNo: 1, arrange: 'A', areaCode,
  })
}

// 6. 공통정보 조회 (상세정보1) - 제목, 이미지, 주소, 좌표, 개요
export async function getDetailCommon(contentId, contentTypeId = 12) {
  return tourFetch(`${BASE_URL}/detailCommon2`, {
    contentId, contentTypeId,
    defaultYN: 'Y', firstImageYN: 'Y', areacodeYN: 'Y',
    addrinfoYN: 'Y', mapinfoYN: 'Y', overviewYN: 'Y',
  })
}

// 7. 소개정보 조회 (상세정보2) - 타입별 세부정보 (입장료, 운영시간 등)
export async function getDetailIntro(contentId, contentTypeId = 12) {
  return tourFetch(`${BASE_URL}/detailIntro2`, { contentId, contentTypeId })
}

// 8. 반복정보 조회 (상세정보3) - 여행코스 경유지, 숙박 객실 등
export async function getDetailInfo(contentId, contentTypeId = 25) {
  return tourFetch(`${BASE_URL}/detailInfo2`, { contentId, contentTypeId })
}

// 9. 이미지정보 조회 (상세정보4)
export async function getDetailImage(contentId) {
  return tourFetch(`${BASE_URL}/detailImage2`, { contentId, imageYN: 'Y', subImageYN: 'Y' })
}

// 여행코스 목록 (편의 함수)
export async function getTourCourseList({ areaCode = 5, numOfRows = 10 } = {}) {
  return getAreaBasedList({ areaCode, contentTypeId: 25, numOfRows })
}

// 무장애 관광지 목록 (편의 함수 - 향후 무장애 API 연동 전까지 관광지로 대체)
export async function getBarrierFreeList({ areaCode = 5, numOfRows = 20 } = {}) {
  return getAreaBasedList({ areaCode, contentTypeId: 12, numOfRows })
}

// 지역코드
export const AREA_CODES = {
  GWANGJU: 5,
  JEONNAM: 38,
}

// 콘텐츠 타입
export const CONTENT_TYPES = {
  TOURIST_SPOT: 12,      // 관광지
  CULTURAL_FACILITY: 14, // 문화시설
  FESTIVAL: 15,          // 행사/공연/축제
  TOUR_COURSE: 25,       // 여행코스
  LEISURE: 28,           // 레포츠
  ACCOMMODATION: 32,     // 숙박
  SHOPPING: 38,          // 쇼핑
  RESTAURANT: 39,        // 음식점
}

// 무장애 여행 정보 조회 (detailWithTour2)
const BARRIER_FREE_BASE = 'https://apis.data.go.kr/B551011/KorWithService2'

export async function getBarrierFreeDetail(contentId) {
  const url = new URL(`${BARRIER_FREE_BASE}/detailWithTour2`)
  url.searchParams.set('serviceKey', API_KEY)
  url.searchParams.set('MobileOS', 'ETC')
  url.searchParams.set('MobileApp', 'Freeway')
  url.searchParams.set('_type', 'json')
  url.searchParams.set('contentId', String(contentId))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`무장애API HTTP ${res.status}`)
  const data = await res.json()

  const header = data?.response?.header
  if (header?.resultCode !== '0000') return null // 데이터 없으면 null 반환

  const item = data?.response?.body?.items?.item
  if (!item) return null
  return [item].flat()[0] // 단건
}

// 여러 contentId 배치 호출 (concurrency 제한)
export async function getBarrierFreeDetailBatch(contentIds, batchSize = 5) {
  const results = {}
  for (let i = 0; i < contentIds.length; i += batchSize) {
    const batch = contentIds.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (id) => {
        try {
          results[id] = await getBarrierFreeDetail(id)
        } catch {
          results[id] = null
        }
      })
    )
  }
  return results
}
