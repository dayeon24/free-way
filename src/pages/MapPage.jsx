import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useKakaoMap } from '../hooks/useKakaoMap'
import { getLocationBasedList, getBarrierFreeDetail } from '../utils/tourApi'
import { searchKakaoPlace } from '../utils/kakaoLocal'
import { saveCachedSpots, loadCachedSpots } from '../utils/offlineCache'
import { CATEGORIES, DEFAULT_CENTER, ACCESSIBILITY_GRADES, getAccessibilityGrade, filterSpots, sortSpots, clusterSpots, getDistanceKm } from '../utils/constants'
import MapPageFront from '../components/MapPage_front'

/**
 * MapPage (BACK) - 기능/로직 담당
 *
 * 보유: GPS 위치, TourAPI 호출, 무장애 API, 마커 데이터, 캐시
 * front에 넘기는 데이터:
 *   mapRef, mapInstanceRef, markersRef, loaded, sdkError,
 *   userLocation, gpsError, dataCache, loadingTypes, selectedTypes,
 *   selectedSpot, barrierIndex, barrierDetail, detailLoading, spots
 * front에 넘기는 함수:
 *   handleSpotClick, toggleType, setSelectedSpot
 */
export default function MapPage() {
  const location = useLocation()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const { loaded, error: sdkError } = useKakaoMap()

  const [userLocation, setUserLocation] = useState(null)
  const [gpsError, setGpsError] = useState(null)
  const [dataCache, setDataCache] = useState({})
  const [loadingTypes, setLoadingTypes] = useState(new Set())
  const [selectedTypes, setSelectedTypes] = useState(new Set([12]))
  const [selectedSpot, setSelectedSpot] = useState(null)

  // 무장애 인덱스 (JSON, 앱 시작 시 1회 로드)
  const [barrierIndex, setBarrierIndex] = useState(null)

  // 바텀시트용 무장애 상세 (클릭 시 API 호출, 캐시)
  const [barrierDetail, setBarrierDetail] = useState({})
  const [detailLoading, setDetailLoading] = useState(false)

  // 바텀시트용 카카오 장소 정보 (전화번호/카카오맵 링크, 캐시) — 영업시간은 API 미제공
  const [placeInfo, setPlaceInfo] = useState({})

  const spots = CATEGORIES
    .filter(c => selectedTypes.has(c.id))
    .flatMap(c => dataCache[c.id] || [])

  // 이 지역 재검색 (기획서 MAP-01) — 지도 드래그/줌 시 버튼 노출, 탭 시 현재 중심 반경 2km 재검색
  // fetchCenter: 최초=GPS 위치, "이 지역 재검색" 클릭 후=그 지도 중심. 거리 필터/정렬/표시 모두 이 기준을 써야
  // 재검색으로 GPS 위치에서 멀리 이동해도 "거리 범위 필터"에 걸려 결과가 다 사라지지 않음
  const [searchCenter, setSearchCenter] = useState(null)
  const [searchRadius, setSearchRadius] = useState(5000)
  const [showResearchButton, setShowResearchButton] = useState(false)
  const fetchCenter = searchCenter || userLocation

  // 검색/필터 상태 (기획서 MAP-01/02)
  // 커뮤니티 탭 "장소 태그" 클릭 시 navigate state로 검색어를 넘겨 지도탭 진입 시 자동 채움
  const [searchQuery, setSearchQuery] = useState(() => location.state?.searchQuery || '')
  const [filterOpen, setFilterOpen] = useState(false)
  const [gradeFilter, setGradeFilter] = useState(new Set(['available', 'partial', 'unknown']))
  const [amenityFilter, setAmenityFilter] = useState(new Set())
  const [userType, setUserType] = useState('all')
  const [distanceKm, setDistanceKm] = useState(5)

  const activeFilterCount =
    (gradeFilter.size < 3 ? 1 : 0) +
    (amenityFilter.size > 0 ? 1 : 0) +
    (userType !== 'all' ? 1 : 0) +
    (distanceKm !== 5 ? 1 : 0)

  const [sortBy, setSortBy] = useState('distance')

  const filteredSpots = sortSpots(
    filterSpots(spots, {
      query: searchQuery, gradeSet: gradeFilter, amenitySet: amenityFilter,
      userType, distanceKm, userLocation: fetchCenter, barrierIndex,
    }),
    { sortBy, userLocation: fetchCenter, barrierIndex }
  )

  // 커뮤니티 "장소 태그"로 진입 시, 검색 결과가 정확히 1건이면 자동으로 상세 열고 카메라 이동
  const navSearchFocusedRef = useRef(false)
  useEffect(() => {
    if (!location.state?.searchQuery || navSearchFocusedRef.current) return
    if (filteredSpots.length === 1) {
      navSearchFocusedRef.current = true
      handleSpotClick(filteredSpots[0])
    }
  }, [filteredSpots])

  function toggleGrade(key) {
    setGradeFilter(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size > 1) next.delete(key) } else next.add(key)
      return next
    })
  }

  function toggleAmenity(key) {
    setAmenityFilter(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function resetFilters() {
    setGradeFilter(new Set(['available', 'partial', 'unknown']))
    setAmenityFilter(new Set())
    setUserType('all')
    setDistanceKm(5)
  }

  // 마커 클러스터링 (기획서 MAP-05) — 줌 레벨에 따라 핀을 묶어서 표시
  const [zoomLevel, setZoomLevel] = useState(5)

  function handleResearchArea() {
    if (!mapInstanceRef.current) return
    const center = mapInstanceRef.current.getCenter()
    setSearchCenter({ lat: center.getLat(), lng: center.getLng() })
    setSearchRadius(2000)
    setDataCache({})
    // 이전 위치로 아직 응답 대기 중인 요청이 있으면 "로딩 중" 상태 때문에
    // 새 요청이 막혀버리는 레이스 컨디션 방지 — 로딩 플래그도 같이 초기화
    setLoadingTypes(new Set())
    setShowResearchButton(false)
  }

  // 무장애 인덱스 JSON 로드 (1회)
  useEffect(() => {
    fetch('/barrier-free-index.json')
      .then(r => r.json())
      .then(json => setBarrierIndex(json.data || {}))
      .catch(() => setBarrierIndex({}))
  }, [])

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('위치 서비스 미지원. 광주 중심으로 표시합니다.')
      setUserLocation(DEFAULT_CENTER)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { setGpsError('위치 권한 없음. 광주 중심으로 표시합니다.'); setUserLocation(DEFAULT_CENTER) },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  // 카카오맵 초기화
  useEffect(() => {
    if (!loaded || !mapRef.current || !userLocation) return
    const { kakao } = window
    const center = new kakao.maps.LatLng(userLocation.lat, userLocation.lng)
    const map = new kakao.maps.Map(mapRef.current, { center, level: 5 })
    mapInstanceRef.current = map
    new kakao.maps.CustomOverlay({
      map, position: center,
      content: `<div style="width:14px;height:14px;border-radius:50%;background:#2e7d32;border:3px solid white;box-shadow:0 0 0 3px rgba(46,125,50,0.3);"></div>`,
      zIndex: 10,
    })
    // 지도 이동/확대축소 시 "이 지역 재검색" 버튼 노출
    kakao.maps.event.addListener(map, 'dragend', () => setShowResearchButton(true))
    kakao.maps.event.addListener(map, 'zoom_changed', () => {
      setShowResearchButton(true)
      setZoomLevel(map.getLevel())
    })
  }, [loaded, userLocation])

  // 카테고리 데이터 fetch (searchCenter: 최초=GPS 위치, 이후="이 지역 재검색" 클릭 시 지도 중심으로 갱신)
  // 네트워크 오류 시 IndexedDB에 저장해둔 최근 성공 데이터로 폴백 (기획서 MAP-05 "네트워크 오류")
  const [fetchErrors, setFetchErrors] = useState({}) // typeId -> true(오류, 폴백 캐시 사용중) | false(정상)

  // fetchCenter/searchRadius가 바뀔 때마다 세대(generation)를 올려서, 이전 위치로 보낸
  // 요청이 늦게 응답해도 새 데이터를 덮어쓰지 못하게 막음 ("이 지역 재검색" 레이스 컨디션 방지)
  const locationGenerationRef = useRef(0)
  useEffect(() => {
    locationGenerationRef.current += 1
  }, [fetchCenter, searchRadius])

  useEffect(() => {
    if (!fetchCenter) return
    const generation = locationGenerationRef.current
    selectedTypes.forEach(typeId => {
      if (dataCache[typeId] !== undefined || loadingTypes.has(typeId)) return
      setLoadingTypes(prev => new Set([...prev, typeId]))
      const cacheKey = `spots-${typeId}`
      getLocationBasedList({ mapX: fetchCenter.lng, mapY: fetchCenter.lat, radius: searchRadius, contentTypeId: typeId, numOfRows: 30 })
        .then(body => {
          if (generation !== locationGenerationRef.current) return // 그 사이 재검색으로 위치가 바뀜 - 무시
          const items = body?.items?.item ? [body.items.item].flat() : []
          setDataCache(prev => ({ ...prev, [typeId]: items }))
          setFetchErrors(prev => ({ ...prev, [typeId]: false }))
          saveCachedSpots(cacheKey, items)
        })
        .catch(async () => {
          if (generation !== locationGenerationRef.current) return
          const cached = await loadCachedSpots(cacheKey)
          setDataCache(prev => ({ ...prev, [typeId]: cached?.data || [] }))
          setFetchErrors(prev => ({ ...prev, [typeId]: true }))
        })
        .finally(() => {
          if (generation !== locationGenerationRef.current) return
          setLoadingTypes(prev => { const s = new Set(prev); s.delete(typeId); return s })
        })
    })
  }, [selectedTypes, fetchCenter, searchRadius])

  // 재시도: 캐시 비우고 오류 플래그 해제 → 위 effect가 다시 fetch
  function retryFetch(typeId) {
    setDataCache(prev => { const next = { ...prev }; delete next[typeId]; return next })
    setFetchErrors(prev => ({ ...prev, [typeId]: false }))
  }

  // FAB 이동지원 버튼 (기획서 MAP-06) — 새빛콜/전동충전소/장애인화장실
  const [fabOpen, setFabOpen] = useState(false)
  const [showChargingStations, setShowChargingStations] = useState(false)
  const [showRestrooms, setShowRestrooms] = useState(false)
  const [toast, setToast] = useState(null)

  // 장애인화장실 데이터 (public/accessible-toilets.json)
  const [restroomData, setRestroomData] = useState([])
  const restroomMarkersRef = useRef([])
  const [selectedRestroom, setSelectedRestroom] = useState(null)

  useEffect(() => {
    fetch('/accessible-toilets.json')
      .then(r => r.json())
      .then(data => setRestroomData(data))
      .catch(() => {})
  }, [])

  // 전동휠체어 충전소 데이터 (public/accessible-chargers.json)
  const [chargerData, setChargerData] = useState([])
  const chargerMarkersRef = useRef([])
  const [selectedCharger, setSelectedCharger] = useState(null)

  useEffect(() => {
    fetch('/accessible-chargers.json')
      .then(r => r.json())
      .then(data => setChargerData(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  function toggleChargingStations() {
    setShowChargingStations(prev => !prev)
  }

  function toggleRestrooms() {
    setShowRestrooms(prev => !prev)
  }

  // 장애인화장실 마커 그리기 (showRestrooms 토글 또는 위치 변경 시 갱신)
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return
    const { kakao } = window

    restroomMarkersRef.current.forEach(m => m.setMap(null))
    restroomMarkersRef.current = []

    if (!showRestrooms || !fetchCenter || restroomData.length === 0) return

    const radiusKm = Math.max(searchRadius / 1000, 2)
    const nearby = restroomData.filter(t =>
      getDistanceKm(fetchCenter.lat, fetchCenter.lng, t.latitude, t.longitude) <= radiusKm
    )

    nearby.forEach((toilet, i) => {
      const pinId = `restroom-pin-${i}`
      const overlay = new kakao.maps.CustomOverlay({
        map: mapInstanceRef.current,
        position: new kakao.maps.LatLng(toilet.latitude, toilet.longitude),
        xAnchor: 0.5,
        yAnchor: 0.5,
        content: `<div id="${pinId}" style="
          width:30px;height:30px;border-radius:50%;
          background:#1565c0;border:2px solid white;
          box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer;
          display:flex;align-items:center;justify-content:center;font-size:14px;
        ">🚻</div>`,
        zIndex: 4,
      })
      setTimeout(() => {
        document.getElementById(pinId)?.addEventListener('click', () => {
          setSelectedRestroom(toilet)
          setSelectedSpot(null)
          setSelectedCharger(null)
        })
      }, 0)
      restroomMarkersRef.current.push(overlay)
    })
  }, [showRestrooms, restroomData, fetchCenter, searchRadius, loaded])

  // 전동휠체어 충전소 마커 그리기
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return
    const { kakao } = window

    chargerMarkersRef.current.forEach(m => m.setMap(null))
    chargerMarkersRef.current = []

    if (!showChargingStations || !fetchCenter || chargerData.length === 0) return

    const radiusKm = Math.max(searchRadius / 1000, 2)
    const nearby = chargerData.filter(c =>
      getDistanceKm(fetchCenter.lat, fetchCenter.lng, c.latitude, c.longitude) <= radiusKm
    )

    nearby.forEach((charger, i) => {
      const pinId = `charger-pin-${i}`
      const overlay = new kakao.maps.CustomOverlay({
        map: mapInstanceRef.current,
        position: new kakao.maps.LatLng(charger.latitude, charger.longitude),
        xAnchor: 0.5,
        yAnchor: 0.5,
        content: `<div id="${pinId}" style="
          width:30px;height:30px;border-radius:50%;
          background:#e65100;border:2px solid white;
          box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer;
          display:flex;align-items:center;justify-content:center;font-size:14px;
        ">⚡</div>`,
        zIndex: 4,
      })
      setTimeout(() => {
        document.getElementById(pinId)?.addEventListener('click', () => {
          setSelectedCharger(charger)
          setSelectedSpot(null)
          setSelectedRestroom(null)
        })
      }, 0)
      chargerMarkersRef.current.push(overlay)
    })
  }, [showChargingStations, chargerData, fetchCenter, searchRadius, loaded])

  // 내 위치로 이동 (기획서 MAP-01 FIX 영역)
  function handleMyLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(loc.lat, loc.lng))
        }
      },
      () => setToast('위치 정보를 가져오지 못했어요')
    )
  }

  // 마커 업데이트 (줌 레벨에 따라 클러스터 또는 개별 핀)
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return
    const { kakao } = window
    markersRef.current.forEach(m => {
      if (m.overlay) m.overlay.setMap(null)
      else m.setMap(null)
    })
    markersRef.current = []

    const clusters = clusterSpots(filteredSpots, zoomLevel)

    clusters.forEach((item, i) => {
      if (item.type === 'cluster') {
        const elId = `cluster-pin-${i}-${Math.round(item.lat * 1e5)}-${Math.round(item.lng * 1e5)}`
        const overlay = new kakao.maps.CustomOverlay({
          map: mapInstanceRef.current,
          position: new kakao.maps.LatLng(item.lat, item.lng),
          xAnchor: 0.5,
          yAnchor: 0.5,
          content: `<div id="${elId}" style="
            width:40px;height:40px;border-radius:50%;background:#2e7d32;
            border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35);cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:14px;font-weight:700;
          ">${item.count}</div>`,
          zIndex: 6,
        })
        // CustomOverlay는 kakao.maps.event로 클릭을 못 받아서 실제 DOM 엘리먼트에 직접 바인딩
        // 클러스터 클릭 시 해당 위치로 확대
        setTimeout(() => {
          document.getElementById(elId)?.addEventListener('click', () => {
            mapInstanceRef.current.setLevel(Math.max(zoomLevel - 2, 3))
            mapInstanceRef.current.panTo(new kakao.maps.LatLng(item.lat, item.lng))
          })
        }, 0)
        markersRef.current.push({ overlay })
        return
      }

      const spot = item.spot
      const grade = ACCESSIBILITY_GRADES[getAccessibilityGrade(spot.contentid, barrierIndex)]
      const pinId = `spot-pin-${spot.contentid}`
      // 물방울 형태 핀 (26x32dp), 하단 중앙 anchor — 기획서 MAP-03
      const marker = new kakao.maps.CustomOverlay({
        map: mapInstanceRef.current,
        position: new kakao.maps.LatLng(parseFloat(spot.mapy), parseFloat(spot.mapx)),
        xAnchor: 0.5,
        yAnchor: 1,
        content: `<div id="${pinId}" style="position:relative;width:26px;height:32px;cursor:pointer;">
          <div style="
            position:absolute;top:0;left:1px;width:24px;height:24px;
            background:${grade.color};border:2px solid white;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.35);
          "></div>
          <div style="
            position:absolute;top:2px;left:1px;width:24px;height:24px;
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:11px;font-weight:700;line-height:1;pointer-events:none;
          ">${grade.symbol}</div>
        </div>`,
        zIndex: 5,
      })
      // 핀 클릭 → 팝업(바텀시트) 표시 (기획서 MAP-03) — CustomOverlay라 DOM에 직접 바인딩
      setTimeout(() => {
        document.getElementById(pinId)?.addEventListener('click', () => handleSpotClick(spot))
      }, 0)
      markersRef.current.push(marker)
    })
  }, [filteredSpots, loaded, barrierIndex, zoomLevel])

  // 장소 클릭 → 무장애 상세 API + 카카오 장소 정보(전화/링크) 호출 (각각 캐시)
  function handleSpotClick(spot) {
    setSelectedSpot(spot)
    setSelectedRestroom(null)
    setSelectedCharger(null)
    if (mapInstanceRef.current && spot.mapx && spot.mapy) {
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(parseFloat(spot.mapy), parseFloat(spot.mapx)))
    }

    const id = spot.contentid

    if (!(id in barrierDetail)) {
      setDetailLoading(true)
      getBarrierFreeDetail(id)
        .then(data => setBarrierDetail(prev => ({ ...prev, [id]: data })))
        .catch(() => setBarrierDetail(prev => ({ ...prev, [id]: null })))
        .finally(() => setDetailLoading(false))
    }

    if (!(id in placeInfo)) {
      searchKakaoPlace(spot.title, spot.mapx, spot.mapy)
        .then(data => setPlaceInfo(prev => ({ ...prev, [id]: data })))
        .catch(() => setPlaceInfo(prev => ({ ...prev, [id]: null })))
    }
  }

  function toggleType(typeId) {
    setSelectedSpot(null)
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(typeId)) { if (next.size === 1) return next; next.delete(typeId) }
      else next.add(typeId)
      return next
    })
  }

  return (
    <MapPageFront
      mapRef={mapRef}
      loaded={loaded}
      sdkError={sdkError}
      userLocation={userLocation}
      fetchCenter={fetchCenter}
      gpsError={gpsError}
      dataCache={dataCache}
      loadingTypes={loadingTypes}
      fetchErrors={fetchErrors}
      onRetryFetch={retryFetch}
      selectedTypes={selectedTypes}
      selectedSpot={selectedSpot}
      barrierIndex={barrierIndex}
      barrierDetail={barrierDetail}
      detailLoading={detailLoading}
      placeInfo={placeInfo}
      spots={spots}
      onSpotClick={handleSpotClick}
      onToggleType={toggleType}
      onCloseSheet={() => setSelectedSpot(null)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filterOpen={filterOpen}
      onOpenFilter={() => setFilterOpen(true)}
      onCloseFilter={() => setFilterOpen(false)}
      gradeFilter={gradeFilter}
      onToggleGrade={toggleGrade}
      amenityFilter={amenityFilter}
      onToggleAmenity={toggleAmenity}
      userType={userType}
      onSetUserType={setUserType}
      distanceKm={distanceKm}
      onSetDistanceKm={setDistanceKm}
      activeFilterCount={activeFilterCount}
      onResetFilters={resetFilters}
      filteredSpots={filteredSpots}
      showResearchButton={showResearchButton}
      onResearchArea={handleResearchArea}
      sortBy={sortBy}
      onSetSortBy={setSortBy}
      fabOpen={fabOpen}
      onToggleFab={() => setFabOpen(prev => !prev)}
      onCloseFab={() => setFabOpen(false)}
      showChargingStations={showChargingStations}
      onToggleChargingStations={toggleChargingStations}
      showRestrooms={showRestrooms}
      onToggleRestrooms={toggleRestrooms}
      selectedRestroom={selectedRestroom}
      onCloseRestroom={() => setSelectedRestroom(null)}
      selectedCharger={selectedCharger}
      onCloseCharger={() => setSelectedCharger(null)}
      onMyLocation={handleMyLocation}
      toast={toast}
    />
  )
}

