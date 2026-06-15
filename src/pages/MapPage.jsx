import { useEffect, useRef, useState } from 'react'
import { useKakaoMap } from '../hooks/useKakaoMap'
import { getLocationBasedList, getBarrierFreeDetail } from '../utils/tourApi'
import { CATEGORIES, DEFAULT_CENTER, TYPE_COLOR } from '../utils/constants'
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

  const spots = CATEGORIES
    .filter(c => selectedTypes.has(c.id))
    .flatMap(c => dataCache[c.id] || [])

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
  }, [loaded, userLocation])

  // 카테고리 데이터 fetch
  useEffect(() => {
    if (!userLocation) return
    selectedTypes.forEach(typeId => {
      if (dataCache[typeId] !== undefined || loadingTypes.has(typeId)) return
      setLoadingTypes(prev => new Set([...prev, typeId]))
      getLocationBasedList({ mapX: userLocation.lng, mapY: userLocation.lat, radius: 5000, contentTypeId: typeId, numOfRows: 30 })
        .then(body => {
          const items = body?.items?.item
          setDataCache(prev => ({ ...prev, [typeId]: items ? [items].flat() : [] }))
        })
        .catch(() => setDataCache(prev => ({ ...prev, [typeId]: [] })))
        .finally(() => setLoadingTypes(prev => { const s = new Set(prev); s.delete(typeId); return s }))
    })
  }, [selectedTypes, userLocation])

  // 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return
    const { kakao } = window
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    spots.forEach(spot => {
      if (!spot.mapx || !spot.mapy) return
      const color = TYPE_COLOR[spot.contenttypeid] || '#2e7d32'
      const hasBarrier = barrierIndex && barrierIndex[spot.contentid]?.length > 0
      const marker = new kakao.maps.CustomOverlay({
        map: mapInstanceRef.current,
        position: new kakao.maps.LatLng(parseFloat(spot.mapy), parseFloat(spot.mapx)),
        content: `<div style="
          width:${hasBarrier ? 14 : 10}px;height:${hasBarrier ? 14 : 10}px;
          border-radius:50%;background:${color};border:2px solid white;
          box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;
          ${hasBarrier ? 'outline:2px solid ' + color + '55;' : ''}
        "></div>`,
        zIndex: 5,
      })
      markersRef.current.push(marker)
    })
  }, [spots, loaded, barrierIndex])

  // 장소 클릭 → 무장애 상세 API 호출 (캐시)
  function handleSpotClick(spot) {
    setSelectedSpot(spot)
    if (mapInstanceRef.current && spot.mapx && spot.mapy) {
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(parseFloat(spot.mapy), parseFloat(spot.mapx)))
    }

    const id = spot.contentid
    if (id in barrierDetail) return

    setDetailLoading(true)
    getBarrierFreeDetail(id)
      .then(data => setBarrierDetail(prev => ({ ...prev, [id]: data })))
      .catch(() => setBarrierDetail(prev => ({ ...prev, [id]: null })))
      .finally(() => setDetailLoading(false))
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
      gpsError={gpsError}
      dataCache={dataCache}
      loadingTypes={loadingTypes}
      selectedTypes={selectedTypes}
      selectedSpot={selectedSpot}
      barrierIndex={barrierIndex}
      barrierDetail={barrierDetail}
      detailLoading={detailLoading}
      spots={spots}
      onSpotClick={handleSpotClick}
      onToggleType={toggleType}
      onCloseSheet={() => setSelectedSpot(null)}
    />
  )
}

