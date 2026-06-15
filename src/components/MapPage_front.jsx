import { CATEGORIES, TYPE_COLOR, BARRIER_ICONS } from '../utils/constants'

/**
 * MapPage (FRONT) - 외견/UI 담당 (인라인 CSS)
 *
 * back(MapPage.jsx)에서 받는 데이터:
 *   mapRef, loaded, sdkError, userLocation, gpsError,
 *   dataCache, loadingTypes, selectedTypes, selectedSpot,
 *   barrierIndex, barrierDetail, detailLoading, spots
 * back에서 받는 함수:
 *   onSpotClick, onToggleType, onCloseSheet
 */
export default function MapPageFront({
  mapRef,
  loaded,
  sdkError,
  userLocation,
  gpsError,
  dataCache,
  loadingTypes,
  selectedTypes,
  selectedSpot,
  barrierIndex,
  barrierDetail,
  detailLoading,
  spots,
  onSpotClick,
  onToggleType,
  onCloseSheet,
}) {
  const isLoading = loadingTypes.size > 0
  const barrierIndexReady = barrierIndex !== null

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
        <p style={{ fontSize: 13, fontWeight: 700 }}>{isLoading ? '불러오는 중...' : `총 ${spots.length}곳`}</p>
        <span style={{ fontSize: 11, color: 'var(--gray-600)' }}>반경 5km · 탭으로 중복선택</span>
      </div>

      {/* 카드 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--gray-50)', padding: '8px 16px 16px' }}>
        {!isLoading && spots.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>주변 5km 내 결과가 없어요</p>
          </div>
        )}
        {spots.map(spot => {
          const cat = CATEGORIES.find(c => c.id === Number(spot.contenttypeid))
          const color = TYPE_COLOR[spot.contenttypeid] || '#2e7d32'
          const barrierKeys = barrierIndexReady ? (barrierIndex[spot.contentid] || []) : null

          return (
            <div
              key={spot.contentid}
              onClick={() => onSpotClick(spot)}
              style={{
                background: 'white', borderRadius: 12, marginBottom: 10,
                border: selectedSpot?.contentid === spot.contentid ? `1.5px solid ${color}` : '1px solid var(--gray-200)',
                display: 'flex', gap: 12, padding: 12, cursor: 'pointer',
              }}
            >
              {spot.firstimage2
                ? <img src={spot.firstimage2} alt={spot.title} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                : <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--gray-100)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{cat?.icon || '📍'}</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.title}</p>
                <p style={{ fontSize: 11, color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.addr1 || '주소 정보 없음'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', background: color + '18', color, borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
                    {cat?.icon} {cat?.label}
                  </span>
                  {barrierKeys === null && (
                    [1,2].map(i => <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--gray-100)' }} />)
                  )}
                  {barrierKeys && barrierKeys.length > 0 && barrierKeys.map(key => {
                    const b = BARRIER_ICONS.find(x => x.key === key)
                    return b ? (
                      <span key={key} title={b.label} style={{ fontSize: 13, background: 'var(--green-50)', borderRadius: 4, padding: '1px 3px' }}>
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

      {/* 바텀시트 */}
      {selectedSpot && (() => {
        const detail = barrierDetail[selectedSpot.contentid]
        const available = detail ? BARRIER_ICONS.filter(b => detail[b.key]?.trim()) : []
        return (
          <div style={{
            position: 'absolute', bottom: 64, left: 0, right: 0,
            background: 'white', borderRadius: '16px 16px 0 0',
            padding: 16, boxShadow: '0 -4px 20px rgba(0,0,0,0.12)', zIndex: 100,
            maxHeight: '50%', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{selectedSpot.title}</p>
                <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>{selectedSpot.addr1}</p>
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

            {selectedSpot.firstimage && (
              <img src={selectedSpot.firstimage} alt={selectedSpot.title} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }}>코스에 추가</button>
              <button className="btn btn-outline" style={{ flex: 1, fontSize: 12 }}>상세 보기</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
