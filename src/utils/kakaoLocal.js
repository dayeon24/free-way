// 카카오 Local API 연동 (기획서 MAP-03 "영업시간 API 병합")
//
// 중요: 카카오 로컬 키워드 검색 API(v2/local/search/keyword.json) 응답에는
// 영업시간/영업중 여부 필드가 없음 (place_name, address, phone, place_url, category_name 정도만 제공).
// 실시간 영업중/준비중 표시는 카카오맵 자체 상세 페이지에서만 노출되는 정보라 공식 API로는 구현 불가.
// 그래서 여기서는 검색으로 얻을 수 있는 실 데이터(전화번호, 카카오맵 링크)만 연동하고,
// 영업시간 자체는 "정보 없음"으로 명시.
//
// REST 키는 브라우저에 노출하지 않고 /api/kakao 서버리스 함수(api/kakao.js)를 거쳐 호출한다.

import { DEFAULT_CENTER } from './constants'

// 장소명 키워드로 후보 목록 검색 (커뮤니티 "게시글 작성 - 위치 추가" 화면용)
// 광주 지역 중심으로 넓게(20km) 편향 검색
export async function searchPlaces(keyword) {
  if (!keyword?.trim()) return []
  try {
    const url = new URL('/api/kakao', window.location.origin)
    url.searchParams.set('keyword', keyword.trim())
    url.searchParams.set('x', DEFAULT_CENTER.lng)
    url.searchParams.set('y', DEFAULT_CENTER.lat)
    url.searchParams.set('radius', 20000)
    url.searchParams.set('size', 10)
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const data = await res.json()
    return (data.documents || []).map(d => ({
      name: d.place_name,
      address: d.road_address_name || d.address_name,
      mapx: d.x,
      mapy: d.y,
    }))
  } catch {
    return []
  }
}

export async function searchKakaoPlace(keyword, x, y) {
  try {
    const url = new URL('/api/kakao', window.location.origin)
    url.searchParams.set('keyword', keyword)
    if (x && y) {
      url.searchParams.set('x', x)
      url.searchParams.set('y', y)
    }
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data = await res.json()
    const place = data.documents?.[0]
    if (!place) return null
    return {
      phone: place.phone || null,
      placeUrl: place.place_url || null,
      categoryName: place.category_name || null,
    }
  } catch {
    return null
  }
}
