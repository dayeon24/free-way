import { useEffect, useRef, useState } from 'react'
import { useKakaoMap } from '../hooks/useKakaoMap'
import { getLocationBasedList, CONTENT_TYPES } from '../utils/tourApi'

const DEFAULT_CENTER = { lat: 35.1595, lng: 126.8526 }

const CATEGORIES = [
  { id: CONTENT_TYPES.TOURIST_SPOT,      label: '관광지',   icon: '🏞️' },
  { id: CONTENT_TYPES.CULTURAL_FACILITY, label: '문화시설', icon: '🏛️' },
  { id: CONTENT_TYPES.FESTIVAL,          label: '행사/축제', icon: '🎪' },
  { id: CONTENT_TYPES.TOUR_COURSE,       label: '여행코스', icon: '🗺️' },
  { id: CONTENT_TYPES.LEISURE,           label: '레포츠',   icon: '🏄' },
  { id: CONTENT_TYPES.ACCOMMODATION,     label: '숙박',     icon: '🏨' },
  { id: CONTENT_TYPES.SHOPPING,          label: '쇼핑',     icon: '🛍️' },
  { id: CONTENT_TYPES.RESTAURANT,        label: '음식점',   icon: '🍽️' },
]

const TYPE_COLOR = {
  12: '#2e7d32', 14: '#1565c0', 15: '#6a1b9a',
  25: '#e65100', 28: '#00695c', 32: '#ad1457',
  38: '#f57f17', 39: '#4e342e',
}

export default function MapPage() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const { loaded, error: sdkError } = useKakaoMap()

  const [userLocation, setUserLocation] = useState(null)
  const [gpsError, setGpsError] = useState(null)

  // 카테고리별 데이터 캐시
  const [dataCache, setDataCache] = useState({})
  const [loadingTypes, setLoadingTypes] = useState(new Set())
  const [selectedTypes, setSelectedTypes] = useState(new Set([12])) // 기본: 관광지
  const [selectedSpot, setSelectedSpot] = useState(null)

  // 현재 보이는 spots = 선택된 타입들의 데이터 합산
  const spots = CATEGORIES
    .filter(c => selectedTypes.has(c.id))
    .flatMap(c => dataCache[c.id] || [])

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('위치 서비스 미지원. 광주 중심으로 표시합니다.')
      setUserLocation(DEFAULT_CENTER)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setGpsError('위치 권한 없음. 광주 중심으로 표시합니다.')
        setUserLocation(DEFAULT_CENTER)
      },
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

    // 내 위치 표시
    new kakao.maps.CustomOverlay({
      map,
      position: center,
      content: `<div style="width:14px;height:14px;border-radius:50%;background:#2e7d32;border:3px solid white;box-shadow:0 0 0 3px rgba(46,125,50,0.3);"></div>`,
      zIndex: 10,
    })
  }, [loaded, userLocation])

  // 카테고리 선택 시 데이터 fetch (캐시 없을 때만)
  useEffect(() => {
    if (!userLocation) return
    selectedTypes.forEach(typeId => {
      if (dataCache[typeId] !== undefined) return // 캐시 있으면 스킵
      if (loadingTypes.has(typeId)) return

      setLoadingTypes(prev => new Set([...prev, typeId]))
      getLocationBasedList({
        mapX: userLocation.lng,
        mapY: userLocation.lat,
        radius: 5000,
        contentTypeId: typeId,
        numOfRows: 30,
      })
        .then(body => {
          const items = body?.items?.item
          setDataCache(prev => ({ ...prev, [typeId]: items ? [items].flat() : [] }))
        })
        .catch(() => {
          setDataCache(prev => ({ ...prev, [typeId]: [] }))
        })
        .finally(() => {
          setLoadingTypes(prev => { const s = new Set(prev); s.delete(typeId); return s })
        })
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
      const marker = new kakao.maps.CustomOverlay({
        map: mapInstanceRef.current,
        position: new kakao.maps.LatLng(parseFloat(spot.mapy), parseFloat(spot.mapx)),
        content: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;"></div>`,
        zIndex: 5,
      })
      markersRef.current.push(marker)
    })
  }, [spots, loaded])

  // 카테고리 토글
  function toggleType(typeId) {
    setSelectedSpot(null)
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(typeId)) {
        if (next.size === 1) return next // 최소 1개 선택 유지
        next.delete(typeId)
      } else {
        next.add(typeId)
      }
      return next
    })
  }

  const isLoading = loadingTypes.size > 0

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* 지도 */}
      <div style={{ position: 'relative', flexShrink: 0, height: '42%' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', background: 'var(--gray-100)' }}>
          {(!loaded || !userLocation) && !sdkError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10 }}>
              <div className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)' }} />
              <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>{!userLocation ? '위치 확인 중...' : '지도 불러오는 중...'}</p>
            </div>
          )}
          {sdkError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 28 }}>🗺️</span>
              <p style={{ fontSize: 12, color: '#c62828', textAlign: 'center' }}>{sdkError}</p>
            </div>
          )}
        </div>
        {gpsError && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(245,158,11,0.92)', padding: '5px 12px', fontSize: 11, color: 'white', textAlign: 'center' }}>
            📍 {gpsError}
          </div>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--gray-100)', padding: '10px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {CATEGORIES.map(cat => {
            const active = selectedTypes.has(cat.id)
            const loading = loadingTypes.has(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => toggleType(cat.id)}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 20,
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', border: 'none',
                  background: active ? TYPE_COLOR[cat.id] : 'var(--gray-100)',
                  color: active ? 'white' : 'var(--gray-600)',
                  transition: 'all 0.15s',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {loading && <span style={{ width: 8, height: 8, border: '1.5px solid rgba(255,255,255,0.5)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />}
                {active && !loading && dataCache[cat.id] && (
                  <span style={{ fontSize: 10, opacity: 0.85 }}>{dataCache[cat.id].length}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 목록 헤더 */}
      <div style={{ background: 'white', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700 }}>
          {isLoading ? '불러오는 중...' : `총 ${spots.length}곳`}
        </p>
        <span style={{ fontSize: 11, color: 'var(--gray-600)' }}>반경 5km · 탭으로 중복선택</span>
      </div>

      {/* 카드 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--gray-50)', padding: '8px 16px 16px' }}>
        {!isLoading && spots.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>주변 5km 내 결과가 없어요</p>
          </div>
        )}
        {spots.map((spot) => {
          const cat = CATEGORIES.find(c => c.id === Number(spot.contenttypeid))
          const color = TYPE_COLOR[spot.contenttypeid] || '#2e7d32'
          return (
            <div
              key={spot.contentid}
              onClick={() => {
                setSelectedSpot(spot)
                if (mapInstanceRef.current && spot.mapx && spot.mapy) {
                  mapInstanceRef.current.panTo(
                    new window.kakao.maps.LatLng(parseFloat(spot.mapy), parseFloat(spot.mapx))
                  )
                }
              }}
              style={{
                background: 'white', borderRadius: 12, marginBottom: 10,
                border: selectedSpot?.contentid === spot.contentid ? `1.5px solid ${color}` : '1px solid var(--gray-200)',
                display: 'flex', gap: 12, padding: 12, cursor: 'pointer',
              }}
            >
              {spot.firstimage2 ? (
                <img src={spot.firstimage2} alt={spot.title} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--gray-100)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                  {cat?.icon || '📍'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.title}</p>
                <p style={{ fontSize: 11, color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{spot.addr1 || '주소 정보 없음'}</p>
                <span style={{ fontSize: 10, padding: '2px 8px', background: color + '18', color, borderRadius: 20, fontWeight: 600 }}>
                  {cat?.icon} {cat?.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 바텀시트 */}
      {selectedSpot && (
        <div style={{
          position: 'absolute', bottom: 64, left: 0, right: 0,
          background: 'white', borderRadius: '16px 16px 0 0',
          padding: 16, boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{selectedSpot.title}</p>
              <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>{selectedSpot.addr1}</p>
            </div>
            <button onClick={() => setSelectedSpot(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
          </div>
          {selectedSpot.firstimage && (
            <img src={selectedSpot.firstimage} alt={selectedSpot.title} style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }}>코스에 추가</button>
            <button className="btn btn-outline" style={{ flex: 1, fontSize: 12 }}>상세 보기</button>
          </div>
        </div>
      )}
    </div>
  )
}
