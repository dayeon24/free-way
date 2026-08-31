import { useState } from 'react'
import { COMMUNITY_TYPES, REPORT_STATUS, REPORT_REASONS, getAvatarColor, formatDateTime } from '../utils/constants'

/**
 * PostDetailPage (FRONT) - 외견/UI 담당 (인라인 CSS)
 *
 * back에서 받는 데이터:
 *   post, loading, notFound, loadError, user, comments(트리), commentLoading, commentLoadError,
 *   optionsStep, reportReason, replyingTo, commentOptionsFor, commentOptionsStep, commentReportReason,
 *   editingComment, loginPromptReason, toast, shareUrl
 * back에서 받는 함수:
 *   onBack, onRetryPost, onLike, onSubmitComment, onRetryComments,
 *   onOpenOptions, onCloseOptions, onOptionsBack, onGoShare, onGoReportList, onSelectReportReason, onConfirmReport,
 *   onCopyShareLink, onShare, onConfirmLogin, onCancelLoginPrompt, onPlaceTagClick, onRequireCommentLogin,
 *   onStartReply, onCancelReply, onSubmitReply,
 *   onOpenCommentOptions, onCloseCommentOptions, onCommentOptionsBack, onStartEditComment, onCancelEditComment,
 *   onSaveEditComment, onDeleteComment, onLikeComment, onGoCommentReportList, onSelectCommentReportReason, onConfirmCommentReport
 */

// 조회수 아이콘 (단색 라인 아이콘 - 이모지 대신)
function EyeIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// 좋아요 아이콘 - 하트 이모지는 폰트마다 크기/기준선이 달라 옆 아이콘과 줄이 안 맞아서 SVG로 통일
function HeartIcon({ filled, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

// 로그인 필요 안내 팝업
function LoginPromptModal({ onCancel, onConfirm }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '28px 20px 20px', width: '100%', maxWidth: 300, textAlign: 'center' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: 'var(--green-500)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 14px',
        }}>✓</div>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>로그인이 필요합니다</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-800)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: '#2E4D9A', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>확인</button>
        </div>
      </div>
    </div>
  )
}

// 이미지 캐러셀 (4:3, 최대 5장, "1|3" 표시)
function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0)
  if (!images?.length) return null
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 12, overflow: 'hidden', background: 'var(--gray-100)', marginBottom: 14 }}>
      <img src={images[idx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {images.length > 1 && (
        <>
          <button aria-label="이전 사진" onClick={() => setIdx(i => (i - 1 + images.length) % images.length)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', background: 'none', border: 'none', cursor: 'pointer' }} />
          <button aria-label="다음 사진" onClick={() => setIdx(i => (i + 1) % images.length)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', background: 'none', border: 'none', cursor: 'pointer' }} />
          <span style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
            {idx + 1} | {images.length}
          </span>
        </>
      )}
    </div>
  )
}

// 게시글 옵션 바텀시트 (기획서 "4. 게시글 옵션")
function PostOptionsSheet({ step, reportReason, shareUrl, onClose, onBack, onGoShare, onGoReportList, onSelectReportReason, onConfirmReport, onCopyShareLink, onShare }) {
  if (step === 'reportConfirm') {
    const reasonDef = REPORT_REASONS.find(r => r.key === reportReason)
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '26px 20px 20px', width: '100%', maxWidth: 300, textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FBE7E7', color: '#B23B3B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 14px' }}>{reasonDef?.icon || '🚩'}</div>
          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>해당 게시글을 신고하시겠어요?</p>
          <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>신고 유형 <b>{reasonDef?.label}</b></p>
          <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 20 }}>신고 후에는 취소할 수 없어요.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onBack} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-800)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>아니오</button>
            <button onClick={onConfirmReport} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: '#B23B3B', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>예, 신고할게요</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '75vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {step === 'menu' && (
          <>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>게시글 옵션</p>
            <button onClick={onGoShare} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 20 }}>🔗</span>
              <span><p style={{ fontSize: 14, fontWeight: 600 }}>공유하기</p><p style={{ fontSize: 11, color: 'var(--gray-500)' }}>링크를 복사하거나 외부 앱으로 공유해요</p></span>
            </button>
            <button onClick={onGoReportList} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span><p style={{ fontSize: 14, fontWeight: 600, color: '#B23B3B' }}>신고하기</p><p style={{ fontSize: 11, color: 'var(--gray-500)' }}>부적절한 게시글을 운영자에게 알려요</p></span>
            </button>
            <button onClick={onClose} className="btn" style={{ width: '100%', marginTop: 10, background: 'var(--gray-100)', color: 'var(--gray-700)' }}>취소</button>
          </>
        )}

        {step === 'share' && (
          <>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>공유하기</p>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
              {[
                { label: '카카오톡', bg: '#FEE500', fg: '#3C1E1E', icon: '💬' },
                { label: '인스타그램', bg: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)', fg: 'white', icon: '📷' },
                { label: '페이스북', bg: '#1877F2', fg: 'white', icon: 'f' },
                { label: 'X', bg: '#000', fg: 'white', icon: '✕' },
              ].map(s => (
                <button key={s.label} onClick={onShare} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 48, height: 48, borderRadius: '50%', background: s.bg, color: s.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>{s.icon}</span>
                  <span style={{ fontSize: 11, color: 'var(--gray-600)' }}>{s.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareUrl}</span>
              <button onClick={onCopyShareLink} style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-600)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>복사</button>
            </div>
            <button onClick={onClose} className="btn" style={{ width: '100%', background: 'var(--gray-100)', color: 'var(--gray-700)' }}>취소</button>
          </>
        )}

        {step === 'reportList' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <button onClick={onBack} aria-label="이전으로" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}>‹</button>
              <p style={{ fontSize: 15, fontWeight: 700 }}>신고 유형 선택</p>
            </div>
            {REPORT_REASONS.map(r => (
              <button key={r.key} onClick={() => onSelectReportReason(r.key)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{r.icon}</span>
                <span style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</p><p style={{ fontSize: 11, color: 'var(--gray-500)' }}>{r.desc}</p></span>
                <span style={{ color: 'var(--gray-300)' }}>›</span>
              </button>
            ))}
            <button onClick={onClose} className="btn" style={{ width: '100%', marginTop: 10, background: 'var(--gray-100)', color: 'var(--gray-700)' }}>취소</button>
          </>
        )}
      </div>
    </div>
  )
}

// 댓글 옵션 바텀시트 (기획서 "6. 게시글 댓글" - 본인: 수정/삭제, 타인: 댓글 신고하기)
function CommentOptionsSheet({ step, isOwn, reportReason, onClose, onBack, onStartEdit, onDelete, onGoReportList, onSelectReportReason, onConfirmReport }) {
  if (step === 'reportConfirm') {
    const reasonDef = REPORT_REASONS.find(r => r.key === reportReason)
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '26px 20px 20px', width: '100%', maxWidth: 300, textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FBE7E7', color: '#B23B3B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 14px' }}>{reasonDef?.icon || '🚩'}</div>
          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>해당 댓글을 신고하시겠어요?</p>
          <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>신고 유형 <b>{reasonDef?.label}</b></p>
          <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 20 }}>신고 후에는 취소할 수 없어요.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onBack} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-800)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>아니오</button>
            <button onClick={onConfirmReport} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: '#B23B3B', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>예, 신고할게요</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '75vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {step === 'menu' && (
          isOwn ? (
            <>
              <button onClick={onStartEdit} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>✏️ 수정</button>
              <button onClick={onDelete} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#B23B3B' }}>🗑 삭제</button>
              <button onClick={onClose} className="btn" style={{ width: '100%', marginTop: 10, background: 'var(--gray-100)', color: 'var(--gray-700)' }}>취소</button>
            </>
          ) : (
            <>
              <button onClick={onGoReportList} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#B23B3B' }}>⚠️ 댓글 신고하기</button>
              <button onClick={onClose} className="btn" style={{ width: '100%', marginTop: 10, background: 'var(--gray-100)', color: 'var(--gray-700)' }}>취소</button>
            </>
          )
        )}
        {step === 'reportList' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <button onClick={onBack} aria-label="이전으로" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}>‹</button>
              <p style={{ fontSize: 15, fontWeight: 700 }}>신고 유형 선택</p>
            </div>
            {REPORT_REASONS.map(r => (
              <button key={r.key} onClick={() => onSelectReportReason(r.key)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{r.icon}</span>
                <span style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</p><p style={{ fontSize: 11, color: 'var(--gray-500)' }}>{r.desc}</p></span>
                <span style={{ color: 'var(--gray-300)' }}>›</span>
              </button>
            ))}
            <button onClick={onClose} className="btn" style={{ width: '100%', marginTop: 10, background: 'var(--gray-100)', color: 'var(--gray-700)' }}>취소</button>
          </>
        )}
      </div>
    </div>
  )
}

// 메인 댓글 입력창 (FIX)
function CommentInput({ onSubmit, onRequireLogin }) {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  async function submit() {
    if (!text.trim() || posting) return
    setPosting(true)
    const ok = await onSubmit(text)
    setPosting(false)
    if (ok) setText('')
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--gray-100)', background: 'white', flexShrink: 0 }}>
      <input
        value={text}
        onFocus={onRequireLogin}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder="댓글을 남겨보세요"
        style={{ flex: 1, border: '1px solid var(--gray-200)', borderRadius: 20, padding: '9px 14px', fontSize: 13, outline: 'none' }}
      />
      <button
        onClick={submit}
        aria-label="댓글 등록"
        aria-disabled={!text.trim()}
        style={{
          width: 36, height: 36, borderRadius: '50%', border: 'none', color: 'white',
          background: text.trim() ? 'var(--green-600)' : 'var(--gray-300)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 14,
        }}
      >
        {posting ? <span className="spinner" style={{ width: 12, height: 12 }} /> : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
      </button>
    </div>
  )
}

// 인라인 답글 입력창
function ReplyInput({ onSubmit, onCancel, onRequireLogin }) {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  async function submit() {
    if (!text.trim() || posting) return
    setPosting(true)
    await onSubmit(text)
    setPosting(false)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 10 }}>
      <input
        autoFocus
        value={text}
        onFocus={onRequireLogin}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
        placeholder="답글을 남겨보세요"
        style={{ flex: 1, border: '1px solid var(--gray-200)', borderRadius: 20, padding: '7px 12px', fontSize: 12, outline: 'none' }}
      />
      <button onClick={submit} disabled={!text.trim() || posting} style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-600)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>등록</button>
      <button onClick={onCancel} style={{ fontSize: 12, color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>취소</button>
    </div>
  )
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts.toMillis()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return `${Math.floor(d / 7)}주 전`
}

function CommentItem({
  comment, currentUser, depth = 0,
  replyingTo, editingComment, onStartReply, onCancelReply, onSubmitReply, onRequireCommentLogin,
  onOpenOptions, onLikeComment, onSaveEditComment, onCancelEditComment,
}) {
  const liked = currentUser && comment.likes?.includes(currentUser.uid)
  const likeCount = comment.likes?.length || 0
  const isEditing = editingComment === comment.id
  const [editText, setEditText] = useState(comment.text)

  return (
    <div style={{ marginBottom: 14, marginLeft: depth * 32 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div aria-hidden="true" style={{ width: 26, height: 26, borderRadius: '50%', background: getAvatarColor(comment.uid || comment.authorName), flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
            <p style={{ fontSize: 12, fontWeight: 600 }}>{comment.authorName}</p>
            <button onClick={() => onOpenOptions(comment.id)} aria-label="댓글 더보기" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 14, padding: '2px 6px', minWidth: 24, minHeight: 24, flexShrink: 0 }}>⋯</button>
          </div>

          {isEditing ? (
            <div style={{ marginTop: 4 }}>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={2}
                style={{ width: '100%', border: '1px solid var(--gray-200)', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => onSaveEditComment(comment.id, editText)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-600)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>저장</button>
                <button onClick={onCancelEditComment} style={{ fontSize: 12, color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>취소</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--gray-800)', lineHeight: 1.5 }}>{comment.text}</p>
          )}

          {!isEditing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => onLikeComment(comment.id, liked)}
                aria-label={liked ? '좋아요 취소' : '좋아요'}
                aria-pressed={!!liked}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1, fontSize: 11, color: liked ? '#e53935' : 'var(--gray-600)', fontWeight: liked ? 600 : 400, padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}
              >
                <HeartIcon filled={liked} size={12} /> {likeCount > 0 ? likeCount : '좋아요'}
              </button>
              {depth === 0 && (
                <button onClick={() => onStartReply(comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1, fontSize: 11, color: 'var(--gray-600)', padding: 0 }}>답글달기</button>
              )}
              <span style={{ fontSize: 11, lineHeight: 1, color: 'var(--gray-600)', marginLeft: 'auto' }}>{timeAgo(comment.createdAt)}</span>
            </div>
          )}

          {replyingTo === comment.id && (
            <ReplyInput
              onSubmit={text => onSubmitReply(comment.id, text)}
              onCancel={onCancelReply}
              onRequireLogin={onRequireCommentLogin}
            />
          )}
        </div>
      </div>

      {comment.replies?.map(r => (
        <CommentItem
          key={r.id}
          comment={r}
          currentUser={currentUser}
          depth={depth + 1}
          replyingTo={replyingTo}
          editingComment={editingComment}
          onStartReply={onStartReply}
          onCancelReply={onCancelReply}
          onSubmitReply={onSubmitReply}
          onRequireCommentLogin={onRequireCommentLogin}
          onOpenOptions={onOpenOptions}
          onLikeComment={onLikeComment}
          onSaveEditComment={onSaveEditComment}
          onCancelEditComment={onCancelEditComment}
        />
      ))}
    </div>
  )
}

export default function PostDetailPageFront({
  post, loading, notFound, loadError, user, comments, commentLoading, commentLoadError,
  optionsStep, reportReason, replyingTo, commentOptionsFor, commentOptionsStep, commentReportReason,
  editingComment, loginPromptReason, toast, shareUrl,
  onBack, onRetryPost, onLike, onSubmitComment, onRetryComments,
  onOpenOptions, onCloseOptions, onOptionsBack, onGoShare, onGoReportList, onSelectReportReason, onConfirmReport,
  onCopyShareLink, onShare, onConfirmLogin, onCancelLoginPrompt, onPlaceTagClick, onRequireCommentLogin,
  onStartReply, onCancelReply, onSubmitReply,
  onOpenCommentOptions, onCloseCommentOptions, onCommentOptionsBack, onStartEditComment, onCancelEditComment,
  onSaveEditComment, onDeleteComment, onLikeComment, onGoCommentReportList, onSelectCommentReportReason, onConfirmCommentReport,
}) {
  const liked = user && post?.likes?.includes(user.uid)
  const likeCount = post?.likes?.length || 0
  const typeDef = post ? (COMMUNITY_TYPES.find(t => t.key === post.type) || COMMUNITY_TYPES[0]) : null
  const statusDef = post?.type === 'report' ? REPORT_STATUS[post.reportStatus || 'pending'] : null

  const activeComment = commentOptionsFor
    ? [...comments, ...comments.flatMap(c => c.replies || [])].find(c => c.id === commentOptionsFor)
    : null

  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="page" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <button onClick={onBack} aria-label="목록으로 돌아가기" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--gray-700)', fontWeight: 600, marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          ‹ 목록으로
        </button>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)' }} />
          </div>
        )}

        {!loading && notFound && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🙁</p>
            <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>삭제되었거나 존재하지 않는 게시글입니다</p>
          </div>
        )}

        {!loading && !notFound && loadError && !post && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>⚠️</p>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>게시글을 불러오지 못했어요. 다시 시도해주세요.</p>
            <button onClick={onRetryPost} className="btn btn-outline">다시 시도</button>
          </div>
        )}

        {!loading && post && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {statusDef && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: statusDef.bg, color: statusDef.textColor }}>
                    {statusDef.label === '처리완료' ? '✓' : '↻'} {statusDef.label}
                  </span>
                )}
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: typeDef.bg, color: typeDef.color }}>
                  {typeDef.icon} {typeDef.label}
                </span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <EyeIcon /> {post.viewCount || 0}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4 }}>{post.title}</p>
              <button onClick={onOpenOptions} aria-label="게시글 옵션" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--gray-500)', padding: '4px 6px', flexShrink: 0, letterSpacing: 1 }}>⋯</button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 14 }}>
              {post.authorName} · {formatDateTime(post.createdAt)}
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid var(--gray-100)', marginBottom: 14 }} />

            <ImageCarousel images={post.images} />

            <p style={{ fontSize: 14, color: 'var(--gray-800)', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: post.placeName ? 12 : 20 }}>{post.body}</p>

            {post.placeName && (
              <button onClick={() => onPlaceTagClick(post.placeName)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--green-500)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}>
                📍 {post.placeName} ›
              </button>
            )}

            <button
              onClick={() => onLike(liked)}
              aria-label={liked ? '좋아요 취소' : '좋아요'}
              aria-pressed={!!liked}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
                padding: '14px 0', marginBottom: 20, borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${liked ? '#F5C6C6' : 'var(--gray-200)'}`,
                background: liked ? '#FBEEEE' : 'white',
                color: liked ? '#e53935' : 'var(--gray-700)',
                fontSize: 15, fontWeight: 700,
              }}
            >
              <HeartIcon filled={liked} size={17} /> {likeCount}
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid var(--gray-100)', marginBottom: 14 }} />

            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
              댓글 {comments.length + comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0)}
            </p>

            {commentLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <div className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)', width: 16, height: 16 }} />
              </div>
            )}
            {!commentLoading && commentLoadError && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 8 }}>댓글을 불러오지 못했어요.</p>
                <button onClick={onRetryComments} className="btn btn-outline" style={{ fontSize: 12, padding: '6px 14px' }}>재시도</button>
              </div>
            )}
            {!commentLoading && !commentLoadError && comments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-500)', fontSize: 13, lineHeight: 1.7 }}>
                아직 댓글이 없어요.<br />첫 댓글을 남겨주세요!
              </div>
            )}
            {!commentLoadError && comments.map(c => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUser={user}
                replyingTo={replyingTo}
                editingComment={editingComment}
                onStartReply={onStartReply}
                onCancelReply={onCancelReply}
                onSubmitReply={onSubmitReply}
                onRequireCommentLogin={onRequireCommentLogin}
                onOpenOptions={onOpenCommentOptions}
                onLikeComment={onLikeComment}
                onSaveEditComment={onSaveEditComment}
                onCancelEditComment={onCancelEditComment}
              />
            ))}
          </>
        )}
      </div>

      {!loading && post && (
        <CommentInput onSubmit={onSubmitComment} onRequireLogin={onRequireCommentLogin} />
      )}

      {toast && (
        <div style={{ position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 250, background: 'rgba(30,30,30,0.9)', color: 'white', fontSize: 12, padding: '9px 16px', borderRadius: 20, whiteSpace: 'nowrap', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {toast}
        </div>
      )}

      {optionsStep && (
        <PostOptionsSheet
          step={optionsStep} reportReason={reportReason} shareUrl={shareUrl}
          onClose={onCloseOptions} onBack={onOptionsBack} onGoShare={onGoShare} onGoReportList={onGoReportList}
          onSelectReportReason={onSelectReportReason} onConfirmReport={onConfirmReport}
          onCopyShareLink={onCopyShareLink} onShare={onShare}
        />
      )}

      {commentOptionsStep && (
        <CommentOptionsSheet
          step={commentOptionsStep}
          isOwn={!!user && activeComment?.uid === user.uid}
          reportReason={commentReportReason}
          onClose={onCloseCommentOptions}
          onBack={onCommentOptionsBack}
          onStartEdit={onStartEditComment}
          onDelete={onDeleteComment}
          onGoReportList={onGoCommentReportList}
          onSelectReportReason={onSelectCommentReportReason}
          onConfirmReport={onConfirmCommentReport}
        />
      )}

      {loginPromptReason && <LoginPromptModal onCancel={onCancelLoginPrompt} onConfirm={onConfirmLogin} />}
    </div>
  )
}
