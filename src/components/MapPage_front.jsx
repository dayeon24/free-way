import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, MAP_FILTER_CATEGORIES, TYPE_COLOR, BARRIER_ICONS, ACCESSIBILITY_GRADES, getAccessibilityGrade, AMENITY_FILTERS, USER_TYPES, DISTANCE_OPTIONS, AMENITY_BADGE, SORT_OPTIONS, getDistanceKm } from '../utils/constants'

/**
 * MapPage (FRONT) - 외견/UI 담당 (인라인 CSS)
 *
 * back(MapPage.jsx)에서 받는 데이터:
 *   mapRef, loaded, sdkError, userLocation, gpsError,
 *   dataCache, loadingTypes, selectedTypes, selectedSpot,
 *   barrierIndex, barrierDetail, detailLoading, spots
 *   searchQuery, filterOpen, gradeFilter, amenityFilter, userType, distanceKm,
 *   activeFilterCount, filteredSpots (검색+필터+지도 핀 모두 이 리스트 기준)
 *   showResearchButton, sortBy
 *   fabOpen, showChargingStations, showRestrooms, toast
 * back에서 받는 함수:
 *   onSpotClick, onToggleType, onCloseSheet
 *   onSearchChange, onOpenFilter, onCloseFilter, onToggleGrade, onToggleAmenity,
 *   onSetUserType, onSetDistanceKm, onResetFilters, onResearchArea, onSetSortBy
 *   onToggleFab, onCloseFab, onToggleChargingStations, onToggleRestrooms, onMyLocation
 */
export default function MapPageFront({
  mapRef,
  loaded,
  sdkError,
  userLocation,
  fetchCenter,
  gpsError,
  dataCache,
  loadingTypes,
  fetchErrors = {},
  onRetryFetch = () => {},
  selectedTypes,
  selectedSpot,
  barrierIndex,
  barrierDetail,
  detailLoading,
  placeInfo = {},
  spots,
  onSpotClick,
  onToggleType,
  onCloseSheet,
  searchQuery = '',
  onSearchChange = () => {},
  filterOpen = false,
  onOpenFilter = () => {},
  onCloseFilter = () => {},
  gradeFilter = new Set(['available', 'partial', 'unknown']),
  onToggleGrade = () => {},
  amenityFilter = new Set(),
  onToggleAmenity = () => {},
  userType = 'all',
  onSetUserType = () => {},
  distanceKm = 5,
  onSetDistanceKm = () => {},
  activeFilterCount = 0,
  onResetFilters = () => {},
  filteredSpots,
  showResearchButton = false,
  onResearchArea = () => {},
  sortBy = 'distance',
  onSetSortBy = () => {},
  fabOpen = false,
  onToggleFab = () => {},
  onCloseFab = () => {},
  showChargingStations = false,
  onToggleChargingStations = () => {},
  showRestrooms = false,
  onToggleRestrooms = () => {},
  selectedRestroom = null,
  onCloseRestroom = () => {},
  selectedCharger = null,
  onCloseCharger = () => {},
  onMyLocation = () => {},
  toast = null,
}) {
  const visibleSpots = filteredSpots ?? spots
  const isLoading = loadingTypes.size > 0
  const barrierIndexReady = barrierIndex !== null
  const failedTypes = [...selectedTypes].filter(id => fetchErrors[id])
  const hasFetchError = failedTypes.length > 0

  // 핀↔카드 동기화: 선택된 장소 카드로 자동 스크롤 (기획서 MAP-05 강조상태)
  const cardRefs = useRef({})
  useEffect(() => {
    if (!selectedSpot) return
    cardRefs.current[selectedSpot.contentid]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedSpot])

  // 하단 시트 3단계 드래그 (기획서 MAP-05: 최소=핸들만 / 중간=카드2 / 최대=풀리스트)
  const containerRef = useRef(null)
  const [sheetStage, setSheetStage] = useState('mid')
  const [dragHeight, setDragHeight] = useState(null)
  const dragInfo = useRef(null)
  const STAGE_PERCENT = { min: 0.06, mid: 0.48, max: 0.88 }

  function stageHeightPx(stage) {
    const total = containerRef.current?.clientHeight || 0
    return total * STAGE_PERCENT[stage]
  }

  function handleHandlePointerDown(e) {
    dragInfo.current = { startY: e.clientY, startHeight: dragHeight ?? stageHeightPx(sheetStage), moved: false }
    e.target.setPointerCapture(e.pointerId)
  }

  function handleHandlePointerMove(e) {
    if (!dragInfo.current) return
    const deltaY = dragInfo.current.startY - e.clientY
    if (Math.abs(deltaY) > 4) dragInfo.current.moved = true
    const next = Math.min(Math.max(dragInfo.current.startHeight + deltaY, stageHeightPx('min')), stageHeightPx('max'))
    setDragHeight(next)
  }

  function handleHandlePointerUp() {
    if (!dragInfo.current) return
    if (!dragInfo.current.moved) {
      setSheetStage(prev => (prev === 'min' ? 'mid' : prev === 'mid' ? 'max' : 'min'))
    } else {
      const current = dragHeight ?? stageHeightPx(sheetStage)
      const nearest = Object.keys(STAGE_PERCENT)
        .map(key => [key, Math.abs(current - stageHeightPx(key))])
        .sort((a, b) => a[1] - b[1])[0][0]
      setSheetStage(nearest)
    }
    setDragHeight(null)
    dragInfo.current = null
  }

  // FAB/내위치 버튼은 하단 시트 높이에 연동해서 위치 이동, 시트 최대화 시 숨김 (기획서 MAP-06)
  const currentSheetHeight = dragHeight !== null ? `${dragHeight}px` : `${STAGE_PERCENT[sheetStage] * 100}%`
  const hideFab = sheetStage === 'max' && dragHeight === null

  return (
    <div ref={containerRef} style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* 지도 (배경 전체) */}
      <div style={{ position: 'absolute', inset: 0 }}>
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

        {/* 검색바 + 필터 버튼 (지도 위 플로팅) */}
        <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', gap: 8, zIndex: 15 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'white', borderRadius: 20, padding: '9px 14px', boxShadow: '0 1px 6px rgba(0,0,0,0.18)' }}>
            <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>🔍</span>
            <input
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="전남 광주 무장애 장소 검색"
              style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, background: 'transparent' }}
            />
          </div>
          <button
            onClick={onOpenFilter}
            aria-label="상세 필터 열기"
            style={{
              position: 'relative', width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'white', border: 'none', boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--gray-800)" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="17" x2="14" y2="17" />
            </svg>
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: '50%',
                background: 'var(--green-500)', color: 'white', fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* 이 지역 재검색 */}
        {showResearchButton && (
          <button
            onClick={onResearchArea}
            style={{
              position: 'absolute', top: 58, left: '50%', transform: 'translateX(-50%)', zIndex: 15,
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20,
              background: 'var(--green-500)', color: 'white', border: 'none', fontSize: 12, fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)', cursor: 'pointer',
            }}
          >
            ↻ 이 지역 재검색
          </button>
        )}

        {/* 내 위치로 이동 + FAB 이동지원 버튼 (기획서 MAP-01/06) */}
        {!hideFab && (
          <div style={{
            position: 'absolute', right: 12, zIndex: 15,
            bottom: `calc(${currentSheetHeight} + 16px)`,
            transition: dragHeight !== null ? 'none' : 'bottom 0.25s ease',
            display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
          }}>
            <button
              onClick={onMyLocation}
              aria-label="내 위치로 이동"
              style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                position: 'relative', overflow: 'hidden', padding: 0,
                background: 'radial-gradient(circle at 35% 30%, #2f7a9e 0%, #123a54 55%, #061a29 100%)',
                boxShadow: '0 3px 8px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.4)',
              }}
            >
              {/* 유리 반사광 효과 */}
              <div style={{
                position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)',
                width: '72%', height: '42%', borderRadius: '50%', pointerEvents: 'none',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))',
              }} />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" style={{ position: 'relative' }}>
                <circle cx="12" cy="12" r="6.5" />
                <circle cx="12" cy="12" r="1.6" fill="white" stroke="none" />
                <line x1="12" y1="0.5" x2="12" y2="4" strokeLinecap="round" />
                <line x1="12" y1="20" x2="12" y2="23.5" strokeLinecap="round" />
                <line x1="0.5" y1="12" x2="4" y2="12" strokeLinecap="round" />
                <line x1="20" y1="12" x2="23.5" y2="12" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={onToggleFab}
              aria-label="이동지원 메뉴 열기"
              className="fab-btn"
              style={{
                width: 56, height: 56, borderRadius: '50%', border: '3px solid white', cursor: 'pointer',
                background: 'linear-gradient(135deg, #2E9580, #154A40)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}
            >
              ♿
            </button>
          </div>
        )}

        {/* 토스트 */}
        {toast && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 250,
            background: 'rgba(30,30,30,0.9)', color: 'white', fontSize: 12,
            padding: '9px 16px', borderRadius: 20, whiteSpace: 'nowrap', maxWidth: '90%',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {toast}
          </div>
        )}

        {/* FAB 이동지원 패널 */}
        {fabOpen && (
          <div
            onClick={onCloseFab}
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,37,32,0.42)', zIndex: 220 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="fab-panel"
              style={{
                position: 'absolute', right: 12,
                bottom: `calc(${currentSheetHeight} + 80px)`,
                width: 220, background: 'white', borderRadius: 14, padding: 14,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700 }}>이동지원</p>
                <button
                  onClick={onCloseFab}
                  aria-label="이동지원 패널 닫기"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--gray-400)', lineHeight: 1, padding: 2 }}
                >
                  ✕
                </button>
              </div>

              <a
                href="tel:1622-2222"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0',
                  textDecoration: 'none', color: 'var(--gray-900)', borderBottom: '1px solid var(--gray-100)',
                }}
              >
                <span style={{ fontSize: 16 }}>📞</span>
                <span style={{ fontSize: 13, flex: 1 }}>새빛콜 연결</span>
                <span style={{ fontSize: 11, color: 'var(--green-500)', fontWeight: 600 }}>전화</span>
              </a>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <span style={{ fontSize: 13, flex: 1 }}>전동휠체어 충전소</span>
                <div
                  onClick={onToggleChargingStations}
                  role="switch"
                  aria-checked={showChargingStations}
                  style={{
                    width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative',
                    background: showChargingStations ? 'var(--green-500)' : 'var(--gray-200)', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute',
                    top: 2, left: showChargingStations ? 18 : 2, transition: 'left 0.2s',
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                {/* 장애인화장실(휠체어+WC) 픽토그램 - 기획서 지정 아이콘 이미지 */}
                <img
                  src="/icons/accessible-restroom.png"
                  alt=""
                  width={22}
                  height={22}
                  style={{ flexShrink: 0, display: 'block' }}
                />
                <span style={{ fontSize: 13, flex: 1 }}>장애인화장실 표시</span>
                <div
                  onClick={onToggleRestrooms}
                  role="switch"
                  aria-checked={showRestrooms}
                  style={{
                    width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative',
                    background: showRestrooms ? 'var(--green-500)' : 'var(--gray-200)', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute',
                    top: 2, left: showRestrooms ? 18 : 2, transition: 'left 0.2s',
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 시트 (3단계 드래그) */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10,
        height: dragHeight !== null ? `${dragHeight}px` : `${STAGE_PERCENT[sheetStage] * 100}%`,
        transition: dragHeight !== null ? 'none' : 'height 0.25s ease',
        background: 'white', borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* 드래그 핸들 */}
        <div
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 8px', flexShrink: 0, cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--gray-200)' }} />
        </div>

      {/* 카테고리 필터 */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--gray-100)', padding: '10px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {MAP_FILTER_CATEGORIES.map(cat => {
            const active = selectedTypes.has(cat.id)
            const loading = loadingTypes.has(cat.id)
            return (
              <button key={cat.id} onClick={() => onToggleType(cat.id)} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 20, fontSize: 12,
                fontWeight: active ? 600 : 400, cursor: 'pointer', border: 'none',
                background: active ? TYPE_COLOR[cat.id] : 'var(--gray-100)',
                color: active ? 'white' : 'var(--gray-600)', transition: 'all 0.15s',
              }}>
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {loading
                  ? <span style={{ width: 8, height: 8, border: '1.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  : active && dataCache[cat.id] && <span style={{ fontSize: 10, opacity: 0.85 }}>{dataCache[cat.id].length}</span>
                }
              </button>
            )
          })}
        </div>
      </div>

      {/* 목록 헤더 */}
      <div style={{ background: 'white', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700 }}>{isLoading ? '불러오는 중...' : `총 ${visibleSpots.length}곳`}</p>
        <select
          value={sortBy}
          onChange={e => onSetSortBy(e.target.value)}
          aria-label="정렬 기준"
          style={{
            fontSize: 12, color: 'var(--gray-700)', border: 'none', background: 'transparent',
            fontWeight: 600, cursor: 'pointer', outline: 'none',
          }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.key} value={o.key}>{o.label} ▾</option>
          ))}
        </select>
      </div>

      {/* 네트워크 오류 배너 (캐시 있으면 캐시 데이터로 폴백 표시중) */}
      {hasFetchError && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 16px', background: '#FFF3E0', borderBottom: '1px solid #FFE0B2', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: '#8C5300' }}>
            ⚠️ 장소 정보를 불러오지 못했습니다{spots.length > 0 ? ' (저장된 정보 표시 중)' : ''}
          </p>
          <button onClick={() => failedTypes.forEach(onRetryFetch)} className="btn btn-outline" style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}>
            재시도
          </button>
        </div>
      )}

      {/* 카드 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--gray-50)', padding: '8px 16px 16px' }}>
        {!isLoading && spots.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>주변 5km 내 결과가 없어요</p>
          </div>
        )}
        {!isLoading && spots.length > 0 && visibleSpots.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>해당 조건의 장소가 없습니다</p>
            <button onClick={onResetFilters} className="btn btn-outline" style={{ fontSize: 12 }}>필터 초기화</button>
          </div>
        )}
        {visibleSpots.map(spot => {
          const cat = CATEGORIES.find(c => c.id === Number(spot.contenttypeid))
          const color = TYPE_COLOR[spot.contenttypeid] || '#2e7d32'
          const barrierKeys = barrierIndexReady ? (barrierIndex[spot.contentid] || []) : null
          const grade = barrierIndexReady ? ACCESSIBILITY_GRADES[getAccessibilityGrade(spot.contentid, barrierIndex)] : null
          const distanceOrigin = fetchCenter || userLocation
          const distance = (distanceOrigin && spot.mapx && spot.mapy)
            ? getDistanceKm(distanceOrigin.lat, distanceOrigin.lng, parseFloat(spot.mapy), parseFloat(spot.mapx))
            : null

          const isSelected = selectedSpot?.contentid === spot.contentid
          return (
            <div
              key={spot.contentid}
              ref={el => { cardRefs.current[spot.contentid] = el }}
              onClick={() => onSpotClick(spot)}
              style={{
                background: isSelected ? '#EFF7F4' : 'white', borderRadius: 12, marginBottom: 10,
                border: isSelected ? `1.5px solid ${color}` : '1px solid var(--gray-200)',
                display: 'flex', gap: 12, padding: 12, cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              {spot.firstimage2
                ? <img src={spot.firstimage2} alt={spot.title} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                : <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--gray-100)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{cat?.icon || '📍'}</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.title}</p>
                  {distance !== null && (
                    <span style={{ fontSize: 11, color: 'var(--gray-600)', flexShrink: 0 }}>{distance.toFixed(1)}km</span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.addr1 || '주소 정보 없음'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', background: color + '18', color, borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
                    {cat?.icon} {cat?.label}
                  </span>
                  {grade && (
                    <span style={{ fontSize: 10, padding: '2px 8px', background: grade.bg, color: grade.textColor, borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
                      {grade.symbol} {grade.label}
                    </span>
                  )}
                  {barrierKeys === null && (
                    [1,2].map(i => <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--gray-100)' }} />)
                  )}
                  {barrierKeys && barrierKeys.length > 0 && barrierKeys.map(key => {
                    const b = BARRIER_ICONS.find(x => x.key === key)
                    return b ? (
                      <span key={key} title={b.label} style={{ fontSize: 13, background: AMENITY_BADGE.bg, borderRadius: 4, padding: '1px 3px' }}>
                        {b.icon}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      </div>

      {/* 바텀시트 */}
      {selectedSpot && (() => {
        const detail = barrierDetail[selectedSpot.contentid]
        const available = detail ? BARRIER_ICONS.filter(b => detail[b.key]?.trim()) : []
        const distanceOrigin = fetchCenter || userLocation
        const distance = (distanceOrigin && selectedSpot.mapx && selectedSpot.mapy)
          ? getDistanceKm(distanceOrigin.lat, distanceOrigin.lng, parseFloat(selectedSpot.mapy), parseFloat(selectedSpot.mapx))
          : null
        const place = placeInfo[selectedSpot.contentid]
        return (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'white', borderRadius: '16px 16px 0 0',
            padding: 16, boxShadow: '0 -4px 20px rgba(0,0,0,0.12)', zIndex: 100,
            maxHeight: '50%', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{selectedSpot.title}</p>
                <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                  {selectedSpot.addr1}{distance !== null && ` · ${distance.toFixed(1)}km`}
                </p>
              </div>
              <button onClick={onCloseSheet} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            {detailLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 8, marginBottom: 10 }}>
                <div className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)', width: 16, height: 16 }} />
                <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>무장애 정보 불러오는 중...</p>
              </div>
            )}
            {!detailLoading && available.length > 0 && (
              <div style={{ background: 'var(--green-50)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-500)', marginBottom: 8 }}>♿ 무장애 편의시설 상세</p>
                {available.map(b => (
                  <div key={b.key} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 6 }}>
                    <span style={{ flexShrink: 0, fontWeight: 600 }}>{b.icon} {b.label}</span>
                    <span style={{ color: 'var(--gray-700)', lineHeight: 1.5 }}>{detail[b.key]}</span>
                  </div>
                ))}
              </div>
            )}
            {!detailLoading && detail === null && (
              <div style={{ padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 8, marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>등록된 무장애 정보가 없어요</p>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>🕐 영업시간 정보 없음</span>
              {place?.phone && (
                <a href={`tel:${place.phone}`} style={{ fontSize: 12, color: 'var(--green-500)', fontWeight: 600, textDecoration: 'none', marginLeft: 'auto' }}>
                  📞 {place.phone}
                </a>
              )}
            </div>

            {selectedSpot.firstimage && (
              <img src={selectedSpot.firstimage} alt={selectedSpot.title} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }}>코스에 추가</button>
              {selectedSpot.mapx && selectedSpot.mapy && (
                <a
                  href={`https://map.kakao.com/link/to/${encodeURIComponent(selectedSpot.title)},${selectedSpot.mapy},${selectedSpot.mapx}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline" style={{ flex: 1, fontSize: 12, textDecoration: 'none', textAlign: 'center' }}
                >
                  🧭 길찾기
                </a>
              )}
              {place?.placeUrl && (
                <a href={place.placeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ flex: 1, fontSize: 12, textDecoration: 'none', textAlign: 'center' }}>
                  카카오맵
                </a>
              )}
            </div>
          </div>
        )
      })()}

      {/* 장애인화장실 바텀시트 */}
      {selectedRestroom && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'white', borderRadius: '16px 16px 0 0',
          padding: 16, boxShadow: '0 -4px 20px rgba(0,0,0,0.12)', zIndex: 100,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', background: '#e3f0fd', padding: '2px 8px', borderRadius: 20 }}>🚻 장애인화장실</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{selectedRestroom.name}</p>
              <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>{selectedRestroom.address}</p>
            </div>
            <button onClick={onCloseRestroom} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {selectedRestroom.maleDisabledToilet > 0 && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#e3f0fd', color: '#1565c0', fontWeight: 600 }}>
                남성 장애인칸 {selectedRestroom.maleDisabledToilet}개
              </span>
            )}
            {selectedRestroom.maleDisabledUrinal > 0 && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#e3f0fd', color: '#1565c0', fontWeight: 600 }}>
                남성 소변기 {selectedRestroom.maleDisabledUrinal}개
              </span>
            )}
            {selectedRestroom.femaleDisabledToilet > 0 && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fce4ec', color: '#c62828', fontWeight: 600 }}>
                여성 장애인칸 {selectedRestroom.femaleDisabledToilet}개
              </span>
            )}
            {selectedRestroom.emergencyBell && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fff3e0', color: '#e65100', fontWeight: 600 }}>🔔 비상벨</span>
            )}
            {selectedRestroom.diaperTable && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}>👶 기저귀교환대</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {selectedRestroom.openHours && (
              <div style={{ flex: 1, padding: '8px 10px', background: 'var(--gray-50)', borderRadius: 8, fontSize: 12, color: 'var(--gray-600)' }}>
                🕐 {selectedRestroom.openHours}
              </div>
            )}
            {selectedRestroom.phone && (
              <a href={`tel:${selectedRestroom.phone}`} className="btn btn-outline" style={{ fontSize: 12, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
                📞 전화
              </a>
            )}
            <a
              href={`https://map.kakao.com/link/to/${encodeURIComponent(selectedRestroom.name)},${selectedRestroom.latitude},${selectedRestroom.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-outline" style={{ fontSize: 12, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}
            >
              🧭 길찾기
            </a>
          </div>
        </div>
      )}

      {/* 전동휠체어 충전소 바텀시트 */}
      {selectedCharger && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'white', borderRadius: '16px 16px 0 0',
          padding: 16, boxShadow: '0 -4px 20px rgba(0,0,0,0.12)', zIndex: 100,
          maxHeight: '55%', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e65100', background: '#fff3e0', padding: '2px 8px', borderRadius: 20 }}>⚡ 전동휠체어 충전소</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{selectedCharger.name}</p>
              <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>{selectedCharger.address}</p>
            </div>
            <button onClick={onCloseCharger} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fff3e0', color: '#e65100', fontWeight: 600 }}>
              동시 {selectedCharger.simultaneousUse}대 충전
            </span>
            {selectedCharger.airInjector && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#e3f0fd', color: '#1565c0', fontWeight: 600 }}>💨 공기주입기</span>
            )}
            {selectedCharger.phoneCharging && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}>📱 핸드폰충전</span>
            )}
          </div>

          {selectedCharger.locationDesc && (
            <div style={{ padding: '8px 12px', background: '#fff8f0', borderRadius: 8, marginBottom: 10, fontSize: 12, color: '#8c4a00', lineHeight: 1.5 }}>
              📌 {selectedCharger.locationDesc}
            </div>
          )}

          <div style={{ padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.8 }}>
            {selectedCharger.weekdayHours && <div>평일 🕐 {selectedCharger.weekdayHours}</div>}
            {selectedCharger.satHours && <div>토요일 🕐 {selectedCharger.satHours}</div>}
            {selectedCharger.holidayHours && <div>공휴일 🕐 {selectedCharger.holidayHours}</div>}
            {!selectedCharger.weekdayHours && !selectedCharger.satHours && !selectedCharger.holidayHours && (
              <div style={{ color: 'var(--gray-400)' }}>운영시간 정보 없음</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {selectedCharger.phone && (
              <a href={`tel:${selectedCharger.phone}`} className="btn btn-outline" style={{ fontSize: 12, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
                📞 전화
              </a>
            )}
            <a
              href={`https://map.kakao.com/link/to/${encodeURIComponent(selectedCharger.name)},${selectedCharger.latitude},${selectedCharger.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-outline" style={{ flex: 1, fontSize: 12, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}
            >
              🧭 길찾기
            </a>
          </div>
        </div>
      )}

      {/* 필터 옵션 패널 */}
      {filterOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 700 }}>필터 옵션</p>
              <button onClick={onCloseFilter} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>휠체어 접근성</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(ACCESSIBILITY_GRADES).map(([key, g]) => {
                  const active = gradeFilter.has(key)
                  return (
                    <button key={key} onClick={() => onToggleGrade(key)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: active ? `1.5px solid ${g.color}` : '1px solid var(--gray-200)',
                      background: active ? g.bg : 'white', color: active ? g.textColor : 'var(--gray-600)',
                    }}>
                      {g.symbol} {g.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>편의시설</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {AMENITY_FILTERS.map(a => {
                  const active = amenityFilter.has(a.key)
                  return (
                    <button key={a.key} onClick={() => onToggleAmenity(a.key)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: active ? '1.5px solid var(--green-500)' : '1px solid var(--gray-200)',
                      background: active ? 'var(--green-50)' : 'white', color: active ? 'var(--green-500)' : 'var(--gray-600)',
                    }}>
                      {a.icon} {a.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>사용자 유형</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {USER_TYPES.map(u => {
                  const active = userType === u.key
                  return (
                    <button key={u.key} onClick={() => onSetUserType(u.key)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: active ? '1.5px solid var(--green-500)' : '1px solid var(--gray-200)',
                      background: active ? 'var(--green-50)' : 'white', color: active ? 'var(--green-500)' : 'var(--gray-600)',
                    }}>
                      {u.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>거리 범위</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {DISTANCE_OPTIONS.map(km => {
                  const active = distanceKm === km
                  return (
                    <button key={km} onClick={() => onSetDistanceKm(km)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: active ? '1.5px solid var(--green-500)' : '1px solid var(--gray-200)',
                      background: active ? 'var(--green-50)' : 'white', color: active ? 'var(--green-500)' : 'var(--gray-600)',
                    }}>
                      {km}km
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onResetFilters} className="btn btn-outline" style={{ flex: 1 }}>초기화</button>
              <button onClick={onCloseFilter} className="btn btn-primary" style={{ flex: 2 }}>
                적용 ({visibleSpots.length}곳)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
