import { useState, useRef, useEffect, useCallback } from 'react'

function timeAgo(ts) {
  if (!ts?.toMillis) return ''
  const m = Math.floor((Date.now() - ts.toMillis()) / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

const TYPE_CONFIG = {
  review:  { icon: '🗺️', label: '방문 후기',   color: 'var(--green-500)', bg: 'var(--green-50)' },
  report:  { icon: '📢', label: '접근성 제보', color: '#e65100',          bg: '#fff3e0' },
  certify: { icon: '🏅', label: '인증',         color: '#1565c0',          bg: '#e3f2fd' },
}

// ── 이미지 캐러셀 ───────────────────────────────────────────
function ImageCarousel({ urls }) {
  const [idx, setIdx] = useState(0)
  if (!urls?.length) return null
  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <img
        src={urls[idx]}
        alt={`사진 ${idx + 1}`}
        style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }}
      />
      {urls.length > 1 && (
        <>
          {[
            { dir: -1, side: 'left', disabled: idx === 0, label: '‹' },
            { dir:  1, side: 'right', disabled: idx === urls.length - 1, label: '›' },
          ].map(({ dir, side, disabled, label }) => (
            <button
              key={side}
              disabled={disabled}
              onClick={() => setIdx(i => i + dir)}
              style={{
                position: 'absolute', [side]: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.4)', border: 'none', color: 'white',
                borderRadius: '50%', width: 28, height: 28, cursor: disabled ? 'default' : 'pointer',
                fontSize: 16, opacity: disabled ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{label}</button>
          ))}
          <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {urls.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── 댓글 아이템 ─────────────────────────────────────────────
function CommentItem({ comment, currentUser, onEdit, onDelete, onLike }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.body)
  const liked = currentUser && comment.likes?.includes(currentUser.uid)

  if (comment.isDeleted) {
    return <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic', borderBottom: '1px solid var(--gray-100)' }}>삭제된 댓글입니다.</div>
  }

  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {comment.authorPhoto
          ? <img src={comment.authorPhoto} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
          : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--green-500)' }}>{comment.authorName?.[0] || '?'}</div>
        }
        <span style={{ fontSize: 12, fontWeight: 600 }}>{comment.authorName}</span>
        <span style={{ fontSize: 10, color: 'var(--gray-400)', marginLeft: 'auto' }}>{timeAgo(comment.createdAt)}</span>
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 6, marginLeft: 28 }}>
          <input
            value={editText}
            onChange={e => setEditText(e.target.value)}
            style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--gray-200)', fontSize: 12, outline: 'none' }}
          />
          <button onClick={() => { onEdit(comment.id, editText); setEditing(false) }} style={{ padding: '6px 10px', background: 'var(--green-500)', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>저장</button>
          <button onClick={() => setEditing(false)} style={{ padding: '6px 10px', background: 'var(--gray-100)', color: 'var(--gray-600)', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>취소</button>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--gray-800)', lineHeight: 1.6, marginLeft: 28 }}>{comment.body}</p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 4, marginLeft: 28 }}>
        <button
          onClick={() => onLike(comment.id, liked)}
          style={{ background: 'none', border: 'none', cursor: currentUser ? 'pointer' : 'default', fontSize: 11, color: liked ? '#e53935' : 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 2 }}
        >
          {liked ? '❤️' : '🤍'} {comment.likes?.length || 0}
        </button>
        {currentUser?.uid === comment.uid && !editing && (
          <>
            <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--gray-400)' }}>수정</button>
            <button onClick={() => onDelete(comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--gray-400)' }}>삭제</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── 댓글 섹션 ────────────────────────────────────────────────
function CommentSection({ postId, currentUser, onFetchComments, onAddComment, onEditComment, onDeleteComment, onCommentLike }) {
  const [comments, setComments] = useState(null)
  const [newBody, setNewBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    onFetchComments(postId)
      .then(data => setComments(data))
      .catch(() => setComments([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  async function handleAdd() {
    if (!newBody.trim() || submitting) return
    setSubmitting(true)
    try {
      const c = await onAddComment(postId, newBody)
      if (c) setComments(prev => [...(prev || []), c])
      setNewBody('')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(commentId, body) {
    onEditComment(postId, commentId, body)
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, body } : c))
  }

  function handleDelete(commentId) {
    onDeleteComment(postId, commentId)
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, isDeleted: true } : c))
  }

  function handleLike(commentId, liked) {
    onCommentLike(postId, commentId, liked)
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c
      const likes = liked ? c.likes.filter(u => u !== currentUser.uid) : [...(c.likes || []), currentUser.uid]
      return { ...c, likes }
    }))
  }

  if (comments === null) {
    return <div style={{ padding: 12, textAlign: 'center' }}><span className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)', width: 14, height: 14, borderWidth: 2 }} /></div>
  }

  return (
    <div>
      {comments.length === 0 && <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '8px 0' }}>댓글이 없어요</p>}
      {comments.map(c => (
        <CommentItem key={c.id} comment={c} currentUser={currentUser} onEdit={handleEdit} onDelete={handleDelete} onLike={handleLike} />
      ))}
      {currentUser && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="댓글을 입력하세요"
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 12, outline: 'none' }}
          />
          <button
            onClick={handleAdd}
            disabled={!newBody.trim() || submitting}
            style={{ padding: '8px 12px', background: 'var(--green-500)', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', opacity: !newBody.trim() ? 0.5 : 1 }}
          >
            {submitting ? '...' : '등록'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── 게시글 카드 ──────────────────────────────────────────────
function PostCard({ post, currentUser, userDoc, onLike, onFetchComments, onAddComment, onEditComment, onDeleteComment, onCommentLike, onReportStatus }) {
  const [showComments, setShowComments] = useState(false)
  const liked = currentUser && post.likes?.includes(currentUser.uid)
  const typeConf = TYPE_CONFIG[post.type] || TYPE_CONFIG.review
  const isAdmin = userDoc?.isAdmin

  const statusBadge = post.type === 'report' ? {
    pending:  { text: '⏳ 검수 중',   color: '#f57f17', bg: '#fffde7' },
    approved: { text: '✅ 검수 완료', color: 'var(--green-500)', bg: 'var(--green-50)' },
    rejected: { text: '❌ 반려',      color: '#c62828', bg: '#ffebee' },
  }[post.status] : null

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {post.authorPhoto
            ? <img src={post.authorPhoto} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--green-500)' }}>{post.authorName?.[0] || '?'}</div>
          }
          <div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{post.authorName}</p>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600, background: typeConf.bg, color: typeConf.color }}>
                {typeConf.icon} {typeConf.label}
              </span>
              {statusBadge && (
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600, background: statusBadge.bg, color: statusBadge.color }}>
                  {statusBadge.text}
                </span>
              )}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--gray-400)', flexShrink: 0 }}>{timeAgo(post.createdAt)}</p>
      </div>

      {/* 장소 태그 */}
      {post.locationTag && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 11 }}>📍</span>
          <span style={{ fontSize: 11, color: 'var(--green-500)', fontWeight: 600 }}>{post.locationTag}</span>
        </div>
      )}

      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{post.title}</p>
      <p style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: 8 }}>{post.body}</p>

      {/* 이미지 */}
      <ImageCarousel urls={post.imageUrls} />

      {/* 관리자 승인/반려 */}
      {isAdmin && post.type === 'report' && post.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button onClick={() => onReportStatus(post.id, 'approved')} style={{ flex: 1, padding: '6px 0', background: 'var(--green-50)', color: 'var(--green-500)', border: '1px solid var(--green-100)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✅ 승인</button>
          <button onClick={() => onReportStatus(post.id, 'rejected')} style={{ flex: 1, padding: '6px 0', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>❌ 반려</button>
        </div>
      )}

      {/* 액션 바 */}
      <div style={{ display: 'flex', gap: 14, paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
        <button
          onClick={() => onLike(post.id, liked)}
          style={{ background: 'none', border: 'none', cursor: currentUser ? 'pointer' : 'default', fontSize: 13, color: liked ? '#e53935' : 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: liked ? 600 : 400 }}
        >
          {liked ? '❤️' : '🤍'} {post.likes?.length || 0}
        </button>
        <button
          onClick={() => setShowComments(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: showComments ? 'var(--green-500)' : 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          💬 {post.commentCount || 0}
        </button>
      </div>

      {/* 댓글 영역 */}
      {showComments && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
          <CommentSection
            postId={post.id}
            currentUser={currentUser}
            onFetchComments={onFetchComments}
            onAddComment={onAddComment}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            onCommentLike={onCommentLike}
          />
        </div>
      )}
    </div>
  )
}

// ── 글 작성 모달 ─────────────────────────────────────────────
function WriteModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('review')
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [locationTag, setLocationTag] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  function handleImageChange(e) {
    const files = Array.from(e.target.files || []).slice(0, 5 - images.length)
    setImages(prev => [...prev, ...files])
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeImage(i) {
    URL.revokeObjectURL(previews[i])
    setImages(prev => prev.filter((_, j) => j !== i))
    setPreviews(prev => prev.filter((_, j) => j !== i))
  }

  async function handleSubmit() {
    if (!title.trim() || !body.trim() || loading) return
    setLoading(true)
    await onSubmit({ title, body, type, images, locationTag })
    setLoading(false)
    onClose()
  }

  const bodyPlaceholder = {
    review: '방문 후기를 작성해주세요. 무장애 시설 정보도 함께 남겨주시면 도움이 돼요!',
    report: '접근성 변경 사항을 제보해주세요. (예: 엘리베이터 고장, 경사로 공사 등)',
    certify: '무장애 여행 인증 내용을 작성해주세요.',
  }[type]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 700 }}>글 작성</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
        </div>

        {/* 타입 선택 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
            <button key={key} onClick={() => setType(key)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: type === key ? conf.color : 'var(--gray-100)', color: type === key ? 'white' : 'var(--gray-600)' }}>
              {conf.icon} {conf.label}
            </button>
          ))}
        </div>

        {/* 장소 태그 */}
        <input
          value={locationTag}
          onChange={e => setLocationTag(e.target.value)}
          placeholder="📍 장소 태그 (선택)"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
        />

        {/* 제목 */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          maxLength={50}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 14, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
        />

        {/* 본문 */}
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={bodyPlaceholder}
          maxLength={500}
          rows={5}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 4 }}
        />
        <p style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'right', marginBottom: 12 }}>{body.length}/500</p>

        {/* 사진 첨부 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {previews.map((src, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={src} alt="" style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 8 }} />
              <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: -6, right: -6, background: '#333', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          ))}
          {images.length < 5 && (
            <button
              onClick={() => fileRef.current?.click()}
              style={{ width: 68, height: 68, borderRadius: 8, border: '2px dashed var(--gray-200)', background: 'var(--gray-50)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}
            >
              <span style={{ fontSize: 22, color: 'var(--gray-400)', lineHeight: 1 }}>+</span>
              <span style={{ fontSize: 9, color: 'var(--gray-400)' }}>{images.length}/5</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !body.trim() || loading}
          className="btn btn-primary"
          style={{ width: '100%', opacity: (!title.trim() || !body.trim()) ? 0.5 : 1 }}
        >
          {loading ? <span className="spinner" /> : '게시하기'}
        </button>
      </div>
    </div>
  )
}

// ── 무한스크롤 센티넬 ────────────────────────────────────────
function ScrollSentinel({ onVisible, enabled }) {
  const ref = useRef()
  useEffect(() => {
    if (!enabled) return
    const ob = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) onVisible()
    }, { threshold: 0.1 })
    if (ref.current) ob.observe(ref.current)
    return () => ob.disconnect()
  }, [enabled, onVisible])
  return <div ref={ref} style={{ height: 1 }} />
}

// ── 메인 페이지 ──────────────────────────────────────────────
export default function CommunityPageFront({
  user, userDoc, posts, loading, loadingMore, hasMore,
  filter, sort, showWrite,
  onSubmit, onLike, onFilter, onSort, onShowWrite, onLoadMore,
  onFetchComments, onAddComment, onEditComment, onDeleteComment, onCommentLike, onReportStatus,
}) {
  const stableLoadMore = useCallback(onLoadMore, [onLoadMore])

  return (
    <div className="page">
      <p className="page-title">커뮤니티</p>
      <p className="page-subtitle">실제 방문자의 현장 접근성 정보</p>

      {/* 글 작성 버튼 */}
      <div style={{ marginBottom: 14 }}>
        {user
          ? <button className="btn btn-primary" style={{ width: '100%', fontSize: 13 }} onClick={() => onShowWrite(true)}>+ 글 작성</button>
          : <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 13, color: 'var(--gray-600)', background: 'var(--gray-100)', borderRadius: 8 }}>로그인 후 글을 작성할 수 있어요</div>
        }
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'all',     label: '전체' },
          { key: 'review',  label: '🗺️ 후기' },
          { key: 'report',  label: '📢 제보' },
          { key: 'certify', label: '🏅 인증' },
        ].map(f => (
          <button key={f.key} onClick={() => onFilter(f.key)} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === f.key ? 'var(--green-500)' : 'var(--gray-100)', color: filter === f.key ? 'white' : 'var(--gray-600)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* 정렬 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        {[{ key: 'latest', label: '최신순' }, { key: 'popular', label: '인기순' }].map(s => (
          <button key={s.key} onClick={() => onSort(s.key)} style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${sort === s.key ? 'var(--green-500)' : 'var(--gray-200)'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: sort === s.key ? 'var(--green-50)' : 'white', color: sort === s.key ? 'var(--green-500)' : 'var(--gray-600)' }}>
            {s.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray-600)' }}>{posts.length}개</span>
      </div>

      {/* 피드 */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <div className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)' }} />
        </div>
      )}
      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📝</p>
          <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>
            {user ? '아직 글이 없어요. 첫 번째 글을 작성해보세요!' : '로그인해서 정보를 공유해보세요!'}
          </p>
        </div>
      )}

      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={user}
          userDoc={userDoc}
          onLike={onLike}
          onFetchComments={onFetchComments}
          onAddComment={onAddComment}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          onCommentLike={onCommentLike}
          onReportStatus={onReportStatus}
        />
      ))}

      {/* 무한스크롤 */}
      <ScrollSentinel onVisible={stableLoadMore} enabled={hasMore && !loading && !loadingMore} />
      {loadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <div className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)', width: 16, height: 16, borderWidth: 2 }} />
        </div>
      )}

      {showWrite && <WriteModal onClose={() => onShowWrite(false)} onSubmit={onSubmit} />}
    </div>
  )
}
