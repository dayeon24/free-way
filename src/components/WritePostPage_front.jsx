import { useRef } from 'react'
import { COMMUNITY_TYPES, WRITE_COLORS as C } from '../utils/constants'

const MAX_IMAGES = 5
const MAX_BODY = 500

/**
 * WritePostPage (FRONT) - 외견/UI 담당 (인라인 CSS)
 *
 * back에서 받는 데이터:
 *   user, title, body, type, place, images, typeDropdownOpen, placeSearchOpen,
 *   placeSearchQuery, placeResults, placeSearchLoading, cancelConfirmOpen, submitting, toast, canSubmit
 * back에서 받는 함수:
 *   onSetTitle, onSetBody, onToggleTypeDropdown, onSelectType, onOpenPlaceSearch, onClosePlaceSearch,
 *   onSetPlaceSearchQuery, onSelectPlace, onRemovePlace, onAddImages, onRemoveImage,
 *   onCancel, onConfirmLeave, onKeepEditing, onSubmit, onConfirmLogin
 */

// 비로그인 유도 화면 (기획서 "1. 개요 - 대상 사용자: 비로그인 시 로그인 유도 화면 표시")
function LoginGateScreen({ onConfirmLogin, onCancel }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', background: C.teal050, color: C.teal800,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>✓</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>로그인이 필요합니다</p>
      <p style={{ fontSize: 13, color: C.inkSoft }}>글을 작성하려면 먼저 로그인해주세요.</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onCancel} style={{ padding: '11px 20px', borderRadius: 8, border: `1px solid ${C.line}`, background: 'white', color: C.ink, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>돌아가기</button>
        <button onClick={onConfirmLogin} style={{ padding: '11px 20px', borderRadius: 8, border: 'none', background: C.teal800, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>로그인</button>
      </div>
    </div>
  )
}

export default function WritePostPageFront({
  user, title, body, type, place, images,
  typeDropdownOpen, placeSearchOpen, placeSearchQuery, placeResults, placeSearchLoading,
  cancelConfirmOpen, submitting, processingImages, canSubmit, toast,
  onSetTitle, onSetBody, onToggleTypeDropdown, onSelectType,
  onOpenPlaceSearch, onClosePlaceSearch, onSetPlaceSearchQuery, onSelectPlace, onRemovePlace,
  onAddImages, onRemoveImage, onCancel, onConfirmLeave, onKeepEditing, onSubmit, onConfirmLogin,
}) {
  const fileInputRef = useRef(null)
  const typeDef = COMMUNITY_TYPES.find(t => t.key === type)

  if (user === null) {
    return <LoginGateScreen onConfirmLogin={onConfirmLogin} onCancel={onCancel} />
  }

  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg || 'white' }}>
      {/* 작성 헤더 (FIX, 기획서 "3. 작성 헤더") */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.inkFaint, fontWeight: 600, minHeight: 44, padding: '0 4px' }}>취소</button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={onToggleTypeDropdown}
            aria-label="유형 선택"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: type ? C.ink : C.inkFaint, display: 'flex', alignItems: 'center', gap: 4, minHeight: 44 }}
          >
            {typeDef ? `${typeDef.icon} ${typeDef.label}` : '유형 선택'} ▾
          </button>
          {typeDropdownOpen && (
            <>
              <div onClick={onToggleTypeDropdown} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
              <div style={{
                position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '100%', marginTop: 6,
                background: 'white', borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', overflow: 'hidden',
                zIndex: 61, width: 220,
              }}>
                {COMMUNITY_TYPES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => onSelectType(t.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none',
                      background: type === t.key ? C.teal050 : 'white', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <span>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{t.label}</p>
                      <p style={{ fontSize: 11, color: C.inkSoft }}>{t.desc}</p>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          style={{
            background: 'none', border: 'none', fontSize: 14, fontWeight: 700, minHeight: 44, padding: '0 4px',
            cursor: canSubmit ? 'pointer' : 'default',
            color: canSubmit ? C.teal800 : C.inkFaint,
          }}
        >
          {submitting ? <span className="spinner" style={{ width: 14, height: 14, borderTopColor: C.teal800, borderColor: 'rgba(0,0,0,0.1)' }} /> : '등록'}
        </button>
      </div>

      {/* SCROLL 영역 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px' }}>
        <input
          value={title}
          onChange={e => onSetTitle(e.target.value)}
          placeholder="제목"
          maxLength={50}
          style={{ width: '100%', border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, color: C.ink, padding: '8px 0', boxSizing: 'border-box' }}
        />
        <hr style={{ border: 'none', borderTop: `1px solid ${C.line}`, margin: '4px 0 12px' }} />

        {place && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, background: C.teal050, color: C.teal700,
              borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {place.name}</span>
              <button onClick={onRemovePlace} aria-label="위치 삭제" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.teal700, fontSize: 15, padding: 0, minWidth: 24, minHeight: 24 }}>✕</button>
            </div>
            <hr style={{ border: 'none', borderTop: `1px solid ${C.line}`, margin: '0 0 12px' }} />
          </>
        )}

        <textarea
          value={body}
          onChange={e => onSetBody(e.target.value.slice(0, MAX_BODY))}
          placeholder="내용을 입력해주세요."
          rows={10}
          style={{
            width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 14, color: C.ink,
            lineHeight: 1.7, boxSizing: 'border-box', fontFamily: 'inherit',
          }}
        />

        {(images.length > 0 || processingImages) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {processingImages && (
              <div style={{ width: 76, height: 76, borderRadius: 10, background: C.teal050, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div className="spinner" style={{ width: 18, height: 18, borderTopColor: C.teal800, borderColor: 'rgba(0,0,0,0.1)' }} />
              </div>
            )}
            {images.map((img, i) => (
              <div key={i} style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
                <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                <button
                  onClick={() => onRemoveImage(i)}
                  aria-label="사진 삭제"
                  style={{
                    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.65)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 툴바 (FIX, 기획서 "4. 하단 툴바") */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderTop: `1px solid ${C.line}`, flexShrink: 0 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="사진 첨부"
          disabled={images.length >= MAX_IMAGES || processingImages}
          style={{
            background: 'none', border: 'none', cursor: (images.length >= MAX_IMAGES || processingImages) ? 'default' : 'pointer',
            color: (images.length >= MAX_IMAGES || processingImages) ? C.inkFaint : C.inkSoft, minWidth: 44, minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => { onAddImages(Array.from(e.target.files || [])); e.target.value = '' }}
          style={{ display: 'none' }}
        />
        <button
          onClick={onOpenPlaceSearch}
          aria-label="위치 추가"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: C.inkSoft, minWidth: 44, minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="6.5" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <line x1="12" y1="0.5" x2="12" y2="4" strokeLinecap="round" />
            <line x1="12" y1="20" x2="12" y2="23.5" strokeLinecap="round" />
            <line x1="0.5" y1="12" x2="4" y2="12" strokeLinecap="round" />
            <line x1="20" y1="12" x2="23.5" y2="12" strokeLinecap="round" />
          </svg>
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.inkFaint }}>{body.length} / {MAX_BODY}</span>
      </div>

      {/* 위치 검색 바텀시트 */}
      {placeSearchOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }} onClick={onClosePlaceSearch}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>위치 추가</p>
            <input
              autoFocus
              value={placeSearchQuery}
              onChange={e => onSetPlaceSearchQuery(e.target.value)}
              placeholder="장소명으로 검색 (예: 양림동 역사문화마을)"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {placeSearchLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                  <div className="spinner" style={{ borderTopColor: C.teal800, borderColor: 'rgba(0,0,0,0.1)', width: 16, height: 16 }} />
                </div>
              )}
              {!placeSearchLoading && placeSearchQuery.trim() && placeResults.length === 0 && (
                <p style={{ fontSize: 13, color: C.inkSoft, textAlign: 'center', padding: 20 }}>검색 결과가 없어요</p>
              )}
              {placeResults.map((p, i) => (
                <button
                  key={i}
                  onClick={() => onSelectPlace(p)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 4px', border: 'none', borderBottom: `1px solid ${C.line}`, background: 'none', cursor: 'pointer' }}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>📍 {p.name}</p>
                  <p style={{ fontSize: 11, color: C.inkSoft }}>{p.address}</p>
                </button>
              ))}
            </div>
            <button onClick={onClosePlaceSearch} className="btn" style={{ width: '100%', marginTop: 12, background: 'var(--gray-100)', color: 'var(--gray-700)' }}>취소</button>
          </div>
        </div>
      )}

      {/* 나가기 확인 팝업 (기획서 "3. 작성 헤더 - ①") */}
      {cancelConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px 20px', width: '100%', maxWidth: 300, textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, lineHeight: 1.5 }}>작성 중인 내용이 사라집니다.<br />나가시겠어요?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onKeepEditing} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: `1px solid ${C.line}`, background: 'white', color: C.ink, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>계속 작성</button>
              <button onClick={onConfirmLeave} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: '#B23B3B', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>나가기</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 250,
          background: 'rgba(30,30,30,0.9)', color: 'white', fontSize: 12,
          padding: '9px 16px', borderRadius: 20, whiteSpace: 'nowrap', maxWidth: '90%',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
