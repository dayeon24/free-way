// 카테고리, 색상, 무장애 아이콘 등 back/front 공용 상수
import { CONTENT_TYPES } from './tourApi'

export const DEFAULT_CENTER = { lat: 35.1595, lng: 126.8526 } // 광주 중심

export const CATEGORIES = [
  { id: CONTENT_TYPES.TOURIST_SPOT,      label: '관광지',   icon: '🏞️' },
  { id: CONTENT_TYPES.CULTURAL_FACILITY, label: '문화시설', icon: '🏛️' },
  { id: CONTENT_TYPES.FESTIVAL,          label: '행사/축제', icon: '🎪' },
  { id: CONTENT_TYPES.TOUR_COURSE,       label: '여행코스', icon: '🗺️' },
  { id: CONTENT_TYPES.LEISURE,           label: '레포츠',   icon: '🏄' },
  { id: CONTENT_TYPES.ACCOMMODATION,     label: '숙박',     icon: '🏨' },
  { id: CONTENT_TYPES.SHOPPING,          label: '쇼핑',     icon: '🛍️' },
  { id: CONTENT_TYPES.RESTAURANT,        label: '음식점',   icon: '🍽️' },
]

// 지도탭 필터 칩 전용 (기획서 MAP-04 "칩 구성 5종") — 위 CATEGORIES의 부분집합 + 표기만 다름
export const MAP_FILTER_CATEGORIES = [
  { id: CONTENT_TYPES.TOURIST_SPOT,      label: '관광지',   icon: '🏞️' },
  { id: CONTENT_TYPES.CULTURAL_FACILITY, label: '문화시설', icon: '🏛️' },
  { id: CONTENT_TYPES.FESTIVAL,          label: '행사·축제', icon: '🎪' },
  { id: CONTENT_TYPES.RESTAURANT,        label: '음식점',   icon: '🍽️' },
  { id: CONTENT_TYPES.ACCOMMODATION,     label: '숙박',     icon: '🏨' },
]

export const TYPE_COLOR = {
  12: '#2e7d32', 14: '#1565c0', 15: '#6a1b9a',
  25: '#e65100', 28: '#00695c', 32: '#ad1457',
  38: '#f57f17', 39: '#4e342e',
}

export const BARRIER_ICONS = [
  { key: 'wheelchair',    icon: '♿', label: '휠체어' },
  { key: 'restroom',      icon: '🚻', label: '장애인화장실' },
  { key: 'parking',       icon: '🅿️', label: '장애인주차' },
  { key: 'elevator',      icon: '🛗', label: '엘리베이터' },
  { key: 'stroller',      icon: '👶', label: '유모차' },
  { key: 'lactationroom', icon: '🍼', label: '수유실' },
]

// 무장애 등급 3종 (지도탭 기획서 MAP-03 색상 토큰 그대로)
// 색상 외 기호(○ 완전가능 / △ 부분가능 / ━ 이용불가) 병기로 WCAG 1.4.1(색에만 의존 금지) 대응
export const ACCESSIBILITY_GRADES = {
  available: { label: '완전가능', color: '#2F9E44', bg: '#E5F6E8', textColor: '#1B642B', symbol: '○' },
  partial:   { label: '부분가능', color: '#DB8B12', bg: '#FBF0DC', textColor: '#8C5300', symbol: '△' },
  unknown:   { label: '이용불가', color: '#8A9490', bg: '#EEF1EE', textColor: '#8A9490', symbol: '━' },
}

// 편의시설 배지 색 (기획서 MAP-03)
export const AMENITY_BADGE = { bg: '#EFF3FA', textColor: '#3A5BB0' }

// 장소의 무장애 등급 계산: barrierIndex(contentId -> 편의시설 키 배열) 기반
// wheelchair 항목이 있으면 '가능', 다른 편의시설 정보만 있으면 '일부', 인덱스에 없으면 '정보없음'
export function getAccessibilityGrade(contentId, barrierIndex) {
  if (!barrierIndex) return 'unknown'
  const keys = barrierIndex[contentId]
  if (!keys || keys.length === 0) return 'unknown'
  return keys.includes('wheelchair') ? 'available' : 'partial'
}

// 두 좌표 간 거리(km), Haversine 공식 — 거리범위 필터용
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 지도탭 필터 패널 옵션 (기획서 MAP-02)
export const AMENITY_FILTERS = [
  { key: 'wheelchair', label: '휠체어출입',   icon: '♿' },
  { key: 'restroom',   label: '장애인화장실', icon: '🚻' },
  { key: 'parking',    label: '전용주차',     icon: '🅿️' },
  { key: 'elevator',   label: '엘리베이터',   icon: '🛗' },
]

// 사용자유형: 데이터에 실제 매핑 가능한 유형만 barrierKey 연결, 나머지는 UI만 제공(데이터 미비)
export const USER_TYPES = [
  { key: 'all',      label: '전체',          barrierKey: null },
  { key: 'mobility', label: '지체장애',      barrierKey: 'wheelchair' },
  { key: 'visual',   label: '시각장애',      barrierKey: null },
  { key: 'hearing',  label: '청각장애',      barrierKey: null },
  { key: 'family',   label: '영유아동반가족', barrierKey: 'stroller' },
  { key: 'elderly',  label: '고령자',        barrierKey: null },
]

export const DISTANCE_OPTIONS = [1, 3, 5]

// 검색어/등급/편의시설/사용자유형/거리 필터를 spots 배열에 적용하는 순수 함수 (front 전용, back 무변경)
export function filterSpots(spots, { query, gradeSet, amenitySet, userType, distanceKm, userLocation, barrierIndex }) {
  return spots.filter(spot => {
    if (query?.trim()) {
      const q = query.trim().toLowerCase()
      const hay = `${spot.title || ''} ${spot.addr1 || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }

    const grade = getAccessibilityGrade(spot.contentid, barrierIndex)
    if (gradeSet && !gradeSet.has(grade)) return false

    const keys = barrierIndex?.[spot.contentid] || []
    if (amenitySet && amenitySet.size > 0) {
      for (const key of amenitySet) if (!keys.includes(key)) return false
    }

    const userTypeDef = USER_TYPES.find(u => u.key === userType)
    if (userTypeDef?.barrierKey && !keys.includes(userTypeDef.barrierKey)) return false

    if (distanceKm && userLocation && spot.mapx && spot.mapy) {
      const d = getDistanceKm(userLocation.lat, userLocation.lng, parseFloat(spot.mapy), parseFloat(spot.mapx))
      if (d > distanceKm) return false
    }

    return true
  })
}

// 지도탭 정렬 옵션 (기획서 MAP-05)
export const SORT_OPTIONS = [
  { key: 'distance',      label: '거리순' },
  { key: 'accessibility', label: '무장애 접근순' },
  { key: 'name',          label: '장소명순' },
]

const GRADE_RANK = { available: 0, partial: 1, unknown: 2 }

// 거리순/무장애 접근순/장소명순 정렬 (순수 함수)
export function sortSpots(spots, { sortBy, userLocation, barrierIndex }) {
  const withDistance = spots.map(spot => ({
    spot,
    distance: (userLocation && spot.mapx && spot.mapy)
      ? getDistanceKm(userLocation.lat, userLocation.lng, parseFloat(spot.mapy), parseFloat(spot.mapx))
      : Infinity,
  }))

  if (sortBy === 'accessibility') {
    withDistance.sort((a, b) => {
      const rankDiff = GRADE_RANK[getAccessibilityGrade(a.spot.contentid, barrierIndex)] - GRADE_RANK[getAccessibilityGrade(b.spot.contentid, barrierIndex)]
      return rankDiff !== 0 ? rankDiff : a.distance - b.distance
    })
  } else if (sortBy === 'name') {
    withDistance.sort((a, b) => (a.spot.title || '').localeCompare(b.spot.title || '', 'ko'))
  } else {
    withDistance.sort((a, b) => a.distance - b.distance)
  }

  return withDistance.map(x => x.spot)
}

// 마커 클러스터링 (기획서 MAP-05 "핀 클러스터링") — CustomOverlay 기반이라 카카오 공식
// MarkerClusterer(Marker 전용) 대신 격자 기반 자체 클러스터링으로 구현.
// zoomLevel이 낮을수록(확대) 격자가 작아져 개별 핀으로, 높을수록(축소) 묶여서 카운트 핀으로 표시.
const CLUSTER_MIN_ZOOM = 6

// 커뮤니티 탭 게시글 유형 3종 + 색상 (기획서 커뮤니티탭 "2. 선택시 아이콘 색상 변경")
export const COMMUNITY_TYPES = [
  { key: 'review',    label: '후기', icon: '📖', color: '#1976D2', bg: '#E3F0FD', desc: '방문 경험을 공유해요' },
  { key: 'recommend', label: '추천', icon: '⭐', color: '#7C4DFF', bg: '#EFE8FF', desc: '무장애 장소를 추천해요' },
  { key: 'report',    label: '제보', icon: '📢', color: '#B23B3B', bg: '#FBE7E7', desc: '접근성 문제를 알려요' },
]

// 게시글 작성 화면 컬러 토큰 (기획서 "5. 게시글 작성하기 - 8. 컬러 토큰")
export const WRITE_COLORS = {
  teal800: '#154A40',
  teal700: '#1C6354',
  teal050: '#EFF7F4',
  ink: '#152521',
  inkSoft: '#5C6B66',
  inkFaint: '#94A29D',
  line: '#E4E9E3',
}

// 정렬 옵션 (기획서 "정렬 버튼 탭 → 드롭다운")
export const COMMUNITY_SORT_OPTIONS = [
  { key: 'latest', label: '최신순' },
  { key: 'views',  label: '조회수 순' },
  { key: 'likes',  label: '좋아요 순' },
]

// 제보 처리 상태 - 무장애 등급과 동일한 색 토큰 재사용(주황=확인중/초록=처리완료)
export const REPORT_STATUS = {
  pending:  { label: '확인중',  color: '#DB8B12', bg: '#FBF0DC', textColor: '#8C5300' },
  resolved: { label: '처리완료', color: '#2F9E44', bg: '#E5F6E8', textColor: '#1B642B' },
}

// 아바타 색상 팔레트 - 닉네임/uid 해시로 고정 배정 (문자 없이 색상만, 접근성 이슈는 닉네임 텍스트가 대신함)
const AVATAR_COLORS = ['#F2B94D', '#4CAF7D', '#E28A4B', '#5C9CE0', '#B472D9', '#E0637C']
export function getAvatarColor(seed) {
  const str = seed || ''
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// 공지 배너 (기획서 "3. 공지 배너") - 관리자 CMS 연동 전까지 고정값 사용
export const CURRENT_NOTICE = {
  text: '전남광주 무장애 관광 추천 코스 업데이트!',
}

// Firestore Timestamp -> "YYYY-MM-DD" (게시글 상세/카드 하단 절대 날짜 표기용)
export function formatDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Firestore Timestamp -> "YYYY-MM-DD HH:mm" (게시글 상세 상단 작성일시)
export function formatDateTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return `${formatDate(ts)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 신고 유형 (기획서 "4. 게시글 옵션 - 신고 유형 선택")
export const REPORT_REASONS = [
  { key: 'spam',     icon: '📣', label: '스팸·광고',      desc: '상업적 홍보나 반복 도배 게시글이에요' },
  { key: 'false',    icon: '✕',  label: '허위·과장 정보', desc: '사실과 다르거나 과장된 접근성 정보에요' },
  { key: 'abuse',    icon: '⊘',  label: '욕설·혐오 표현', desc: '불쾌하거나 차별적인 언어가 포함돼 있어요' },
  { key: 'privacy',  icon: '🔒', label: '개인정보 노출',  desc: '타인의 개인정보가 포함된 게시글이에요' },
  { key: 'etc',      icon: '💬', label: '기타',          desc: '위 항목에 해당하지 않는 다른 이유에요' },
]

export function clusterSpots(spots, zoomLevel) {
  const valid = spots.filter(s => s.mapx && s.mapy)
  if (zoomLevel < CLUSTER_MIN_ZOOM) {
    return valid.map(spot => ({ type: 'single', spot }))
  }

  const cellSize = 0.004 * Math.pow(1.8, zoomLevel - CLUSTER_MIN_ZOOM)
  const groups = {}
  valid.forEach(spot => {
    const lat = parseFloat(spot.mapy), lng = parseFloat(spot.mapx)
    const key = `${Math.round(lat / cellSize)}_${Math.round(lng / cellSize)}`
    ;(groups[key] ??= []).push(spot)
  })

  return Object.values(groups).map(group => {
    if (group.length === 1) return { type: 'single', spot: group[0] }
    const lat = group.reduce((sum, s) => sum + parseFloat(s.mapy), 0) / group.length
    const lng = group.reduce((sum, s) => sum + parseFloat(s.mapx), 0) / group.length
    return { type: 'cluster', lat, lng, count: group.length, spots: group }
  })
}
