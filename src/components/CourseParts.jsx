import { Fragment, useState } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { WRITE_COLORS as C } from '../utils/constants'
import { TEAL, COURSE_CATEGORIES, GRADE_LABEL, parseOpenStatus } from '../utils/courseApi'
import { legLabel, FACILITY_KINDS } from '../utils/courseGen'

/**
 * 코스탭 공용 UI 부품 (front 전용, 로직 없음)
 *  - CategoryBadge / CourseThumb / PlacePill / HeartCount
 *  - Timeline (일정 타임라인 + dnd-kit 편집) / MetaRow
 *  - LoginPromptModal / Toast / SaveDialog / Sheet / ShareSheet
 */

/* ───────── 아이콘 ───────── */

export function HeartIcon({ filled, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export const PinIcon = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)

export const ArrowIcon = ({ dir = 'right', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ transform: dir === 'left' ? 'rotate(180deg)' : undefined }}>
    <polyline points="9 6 15 12 9 18" />
  </svg>
)

/* ───────── 코스 카드 부품 ───────── */

export function CategoryBadge({ category, onDark = false }) {
  const c = COURSE_CATEGORIES[category] || COURSE_CATEGORIES.nature
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
      background: onDark ? 'rgba(255,255,255,0.22)' : c.bg, color: onDark ? 'white' : c.color,
    }}>
      {c.label}
    </span>
  )
}

// 코스 대표 이미지 — 없으면 카테고리별 기본 이미지(그라디언트+아이콘). alt는 "카테고리명 + 코스명" 조합 (기획서 접근성)
export function CourseThumb({ course, size = 92, radius = 0 }) {
  const c = COURSE_CATEGORIES[course.category] || COURSE_CATEGORIES.nature
  const [broken, setBroken] = useState(false)
  const alt = `${c.label} ${course.title}`
  if (course.image && !broken) {
    return <img src={course.image.replace('http://', 'https://')} alt={alt} onError={() => setBroken(true)} loading="lazy"
      style={{ width: size, height: size, objectFit: 'cover', display: 'block', borderRadius: radius, flexShrink: 0 }} />
  }
  return (
    <div role="img" aria-label={alt} style={{
      width: size, height: size, flexShrink: 0, borderRadius: radius, background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38,
    }}>
      {c.icon}
    </div>
  )
}

// 장소 태그 pill — 탭하면 지도 탭으로 이동 (부모가 처리)
export function PlacePill({ name, onClick, large = false }) {
  return (
    <button
      type="button"
      onClick={e => { e.preventDefault(); e.stopPropagation(); onClick?.(name) }}
      aria-label={`${name} 지도에서 보기`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, background: TEAL[50], color: TEAL[700],
        border: 'none', borderRadius: 20, padding: large ? '6px 11px' : '3px 8px', fontSize: large ? 12 : 10.5, fontWeight: 600,
        cursor: 'pointer', maxWidth: '100%', minHeight: large ? 32 : undefined,
      }}
    >
      <PinIcon size={large ? 12 : 10} color="#D14B6A" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
    </button>
  )
}

/* ───────── 배지 ───────── */

const GRADE_STYLE = {
  available: { bg: '#E5F6E8', color: '#1B642B', icon: '♿' },
  partial:   { bg: '#FBF0DC', color: '#8C5300', icon: '△' },
  unknown:   { bg: '#EEF1EE', color: '#5C6B66', icon: '?' },
}

export function GradeBadge({ grade }) {
  const s = GRADE_STYLE[grade] || GRADE_STYLE.unknown
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.icon} {GRADE_LABEL[grade] || GRADE_LABEL.unknown}
    </span>
  )
}

function OpenBadge({ item }) {
  const st = parseOpenStatus(item.openTime, item.restDate)
  if (!st) return null // 정보 없음 → 배지 미표시 (기획서 예외처리)
  const color = st.status === 'open' ? { bg: '#E5F6E8', fg: '#1B642B' } : st.status === 'closed' ? { bg: '#FBE7E7', fg: '#B23B3B' } : { bg: '#EEF1EE', fg: '#5C6B66' }
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: color.bg, color: color.fg }}>
      {st.status === 'closed' ? '휴무' : st.status === 'open' ? '운영중' : '운영 종료'} · {st.text.replace(' · 운영중', '').replace(' · 운영 종료', '').replace(' · 운영 전', '')}
    </span>
  )
}

/* ───────── 타임라인 ───────── */

function SlotCard({ item, editing, dragHandle, onRemove, onPlaceClick, onAlternative }) {
  const isFacility = item.kind === 'facility'
  // 오늘 휴무로 확인된 장소도 경고 (기획서: 운영 시간 배지 "휴무" + 대체 장소 제안)
  const closedToday = !isFacility && parseOpenStatus(item.openTime, item.restDate)?.status === 'closed'
  const warn = !isFacility && (item.warning || closedToday)
  const kindInfo = isFacility ? FACILITY_KINDS[item.facilityKind] : null

  return (
    <div style={{
      flex: 1, minWidth: 0, background: isFacility ? TEAL[50] : 'white', borderRadius: 12, padding: '10px 12px',
      border: warn ? '1.5px solid #E8A33D' : `1px solid ${isFacility ? '#CFE6DF' : C.line}`, position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {editing && dragHandle}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, color: C.inkFaint, marginBottom: 2 }}>
            {isFacility ? `${kindInfo.icon} 경로 중 ${kindInfo.label}` : item.typeLabel}
          </p>
          <button
            type="button"
            onClick={() => onPlaceClick?.(item)}
            aria-label={`${item.name} 지도에서 보기`}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}
          >
            {item.name}
          </button>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 6 }}>
            {item.durationMin > 0 && <span style={{ fontSize: 10.5, color: C.inkSoft }}>🕐 약 {item.durationMin}분</span>}
            {isFacility
              ? (item.hours && <span style={{ fontSize: 10.5, color: C.inkSoft }}>· {item.hours}</span>)
              : item.grade !== 'unknown' && <GradeBadge grade={item.grade} />}
          </div>
          {!isFacility && item.accessTags?.length > 0 && (
            <p style={{ fontSize: 10.5, color: '#1B642B', marginTop: 5, lineHeight: 1.5 }}>✓ {item.accessTags.join(' · ')}</p>
          )}
          {!isFacility && <div style={{ marginTop: 5 }}><OpenBadge item={item} /></div>}
          {!isFacility && item.reason && <p style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 5 }}>💡 {item.reason}</p>}
        </div>
        {editing && !isFacility && (
          <button type="button" onClick={() => onRemove?.(item)} aria-label={`${item.name} 삭제`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.inkSoft, minWidth: 44, minHeight: 44, margin: '-10px -12px 0 0' }}>
            ✕
          </button>
        )}
      </div>

      {warn && (
        <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px dashed #EBC98F', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#8C5300', flex: 1, minWidth: 0, lineHeight: 1.5 }}>
            {closedToday && <span style={{ display: 'block', color: '#B23B3B' }}>⚠ 오늘은 휴무예요 — 다른 장소로 바꿔볼까요?</span>}
            {item.warning && <span style={{ display: 'block' }}>⚠ 접근성 정보를 확인하세요 — {item.warning}</span>}
          </span>
          {onAlternative && !editing && (
            <button type="button" onClick={() => onAlternative(item)} aria-label={`${item.name} 대체 장소 제안`}
              style={{ fontSize: 10.5, fontWeight: 700, color: TEAL[700], background: 'white', border: `1px solid ${TEAL[500]}`, borderRadius: 12, padding: '4px 9px', cursor: 'pointer', minHeight: 28 }}>
              대체 장소
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SortableSlot({ item, editing, ...rest }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key, disabled: !editing })
  const handle = (
    <button type="button" {...attributes} {...listeners}
      aria-label={`${item.name} 순서 변경 (스페이스로 잡고 방향키로 이동)`}
      style={{ background: 'none', border: 'none', cursor: 'grab', color: C.inkFaint, fontSize: 18, minWidth: 36, minHeight: 44, margin: '-10px 0 0 -8px', touchAction: 'none' }}>
      ≡
    </button>
  )
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 5 : 'auto', position: 'relative', flex: 1, minWidth: 0, display: 'flex' }}>
      <SlotCard item={item} editing={editing} dragHandle={handle} {...rest} />
    </div>
  )
}

/**
 * days: [{ day, items }]  (items의 kind: 'place' | 'facility')
 * editing=true 이면 장소 카드에 드래그 핸들(dnd-kit, 키보드 방향키 지원) + 삭제 버튼 + 장소 추가 버튼 표시
 */
export function Timeline({ days, editing = false, onReorder, onRemove, onAddPlace, onPlaceClick, onAlternative }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  return (
    <div>
      {days.map((day, di) => (
        <div key={day.day} style={{ marginBottom: 8 }}>
          {days.length > 1 && (
            <p style={{ fontSize: 12, fontWeight: 700, color: TEAL[700], margin: '14px 0 8px' }}>{day.day}일차</p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return
              const from = day.items.findIndex(i => i.key === active.id)
              const to = day.items.findIndex(i => i.key === over.id)
              if (from >= 0 && to >= 0) onReorder?.(di, from, to)
            }}
          >
            <SortableContext items={day.items.map(i => i.key)} strategy={verticalListSortingStrategy}>
              {day.items.map((it, i) => (
                <Fragment key={it.key}>
                  {it.leg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 6px 52px' }} aria-label={`이동 ${legLabel(it.leg)}`}>
                      <span style={{ flex: 1, borderTop: `1px dashed ${C.line}` }} />
                      <span style={{ fontSize: 10.5, color: C.inkSoft }}>{legLabel(it.leg)}</span>
                      <span style={{ flex: 1, borderTop: `1px dashed ${C.line}` }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                    <span style={{ width: 44, flexShrink: 0, fontSize: 11, color: C.inkSoft, paddingTop: 12, fontWeight: 600 }}>{it.time}</span>
                    <SortableSlot item={it} editing={editing && it.kind === 'place'} onRemove={onRemove && (x => onRemove(di, x))} onPlaceClick={onPlaceClick} onAlternative={onAlternative} />
                  </div>
                </Fragment>
              ))}
            </SortableContext>
          </DndContext>
          {editing && (
            <button type="button" onClick={() => onAddPlace?.(di)} aria-label={`${day.day}일차 장소 추가`}
              style={{ width: '100%', marginTop: 10, minHeight: 44, borderRadius: 12, border: `1.5px dashed ${TEAL[500]}`, background: 'white', color: TEAL[700], fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ＋ 장소 추가
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/* ───────── 메타 칸 ───────── */

export function MetaRow({ cells }) {
  return (
    <div style={{ display: 'flex', background: 'white', borderBottom: `1px solid ${C.line}` }}>
      {cells.map((c, i) => (
        <div key={c.label} style={{ flex: 1, padding: '12px 4px', textAlign: 'center', borderLeft: i ? `1px solid ${C.line}` : 'none' }}>
          <p style={{ fontSize: 10.5, color: C.inkFaint, marginBottom: 3 }}>{c.label}</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{c.value}</p>
        </div>
      ))}
    </div>
  )
}

/* ───────── 오버레이 ───────── */

export function Toast({ message }) {
  if (!message) return null
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 400, maxWidth: 'min(90vw, 400px)',
      background: 'rgba(30,30,30,0.92)', color: 'white', fontSize: 12, padding: '10px 16px', borderRadius: 20, textAlign: 'center', lineHeight: 1.5,
    }}>
      {message}
    </div>
  )
}

export function LoginPromptModal({ onCancel, onConfirm }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="로그인 필요" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '28px 20px 20px', width: '100%', maxWidth: 300, textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: TEAL[800], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 14px' }}>✓</div>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>로그인이 필요합니다</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, minHeight: 44, borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-800)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
          <button onClick={onConfirm} style={{ flex: 1, minHeight: 44, borderRadius: 8, border: 'none', background: '#2E4D9A', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>확인</button>
        </div>
      </div>
    </div>
  )
}

// 하단 시트 공통 껍데기 — 배경 탭으로 닫힘
export function Sheet({ title, subtitle, onClose, children, maxHeight = '88vh' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430, maxHeight, display: 'flex', flexDirection: 'column', animation: 'fabSlideUp 0.22s ease' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.line, margin: '8px auto 0', flexShrink: 0 }} />
        <div style={{ padding: '10px 20px 8px', flexShrink: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{title}</p>
          {subtitle && <p style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}>{subtitle}</p>}
        </div>
        <div style={{ overflowY: 'auto', padding: '4px 20px 20px', flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

// 코스 저장 다이얼로그 (이름·메모 입력 — 기획서 "일정 저장")
export function SaveDialog({ defaultName, saving, onCancel, onSave }) {
  const [name, setName] = useState(defaultName || '')
  const [memo, setMemo] = useState('')
  return (
    <Sheet title="코스 저장하기" subtitle="내 코스에 저장해두고 언제든 다시 볼 수 있어요" onClose={saving ? undefined : onCancel} maxHeight="70vh">
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.inkSoft, margin: '8px 0 5px' }}>코스 이름</label>
      <input value={name} onChange={e => setName(e.target.value)} maxLength={40} aria-label="코스 이름"
        style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 12px', fontSize: 14, outline: 'none' }} />
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.inkSoft, margin: '12px 0 5px' }}>메모 (선택)</label>
      <textarea value={memo} onChange={e => setMemo(e.target.value)} maxLength={100} rows={3} aria-label="메모"
        placeholder="함께 가는 사람, 챙길 것 등을 적어두세요"
        style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
      <p style={{ fontSize: 11, color: C.inkFaint, textAlign: 'right', marginBottom: 14 }}>{memo.length}/100</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} disabled={saving} style={{ flex: 1, minHeight: 46, borderRadius: 10, border: `1px solid ${C.line}`, background: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
        <button onClick={() => onSave({ name, memo })} disabled={saving} aria-label="코스 저장"
          style={{ flex: 2, minHeight: 46, borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${TEAL[500]}, ${TEAL[800]})`, color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? '저장 중…' : '저장하기'}
        </button>
      </div>
    </Sheet>
  )
}

// 상세/결과 화면 상단 바 (Teal #154A40 고정) — 뒤로가기 / 제목 / 공유(저장 완료 후 활성화) / 더보기
export function DetailHeader({ title, onBack, onShare, shareEnabled, onMore }) {
  const btn = { width: 40, height: 40, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.14)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: TEAL[800], padding: '8px 12px', flexShrink: 0 }}>
      <button onClick={onBack} aria-label="목록으로 돌아가기" style={btn}><ArrowIcon dir="left" size={20} /></button>
      <p style={{ flex: 1, fontSize: 15, fontWeight: 800, color: 'white', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
      {onShare && (
        <button onClick={onShare} aria-label="URL 공유" aria-disabled={!shareEnabled} style={{ ...btn, opacity: shareEnabled ? 1 : 0.4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
          </svg>
        </button>
      )}
      {onMore && <button onClick={onMore} aria-label="더보기" style={{ ...btn, fontSize: 18, letterSpacing: 1 }}>⋯</button>}
    </div>
  )
}

// URL 공유 시트 — 복사 / (지원 기기) 공유하기
export function ShareSheet({ url, kind, onCopy, onNativeShare, onClose }) {
  return (
    <Sheet title="URL 공유하기" subtitle={kind === 'inline' ? '링크에 코스가 담겨 있어요. 링크만 있으면 누구나 볼 수 있어요.' : '링크만 있으면 로그인하지 않아도 누구나 볼 수 있어요.'} onClose={onClose} maxHeight="50vh">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gray-50)', borderRadius: 10, padding: '10px 12px', margin: '8px 0 14px' }}>
        <span style={{ flex: 1, fontSize: 12, color: C.inkSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
        <button onClick={onCopy} aria-label="링크 복사" style={{ fontSize: 12.5, fontWeight: 800, color: TEAL[700], background: 'none', border: 'none', cursor: 'pointer', minHeight: 32, flexShrink: 0 }}>복사</button>
      </div>
      {typeof navigator !== 'undefined' && navigator.share && (
        <button onClick={onNativeShare} style={{ width: '100%', minHeight: 46, borderRadius: 10, border: 'none', background: TEAL[800], color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', marginBottom: 8 }}>다른 앱으로 공유</button>
      )}
      <button onClick={onClose} className="btn" style={{ width: '100%', background: 'var(--gray-100)', color: 'var(--gray-700)', minHeight: 46 }}>닫기</button>
    </Sheet>
  )
}

// 더보기(…) 메뉴 — 신고하기 / 문의하기 (기획서 "더보기(…)")
export function MoreSheet({ onClose, onReport, onInquiry }) {
  const row = (label, sub, fn, danger) => (
    <button onClick={fn} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 4px', cursor: 'pointer', borderBottom: `1px solid ${C.line}` }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: danger ? '#B23B3B' : C.ink }}>{label}</p>
      <p style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>{sub}</p>
    </button>
  )
  return (
    <Sheet title="더보기" onClose={onClose} maxHeight="50vh">
      {row('신고하기', '코스 정보가 사실과 다르거나 부적절해요', onReport, true)}
      {row('문의하기', '코스에 대해 궁금한 점이 있어요', onInquiry)}
      <button onClick={onClose} className="btn" style={{ width: '100%', marginTop: 14, background: 'var(--gray-100)', color: 'var(--gray-700)', minHeight: 46 }}>닫기</button>
    </Sheet>
  )
}
