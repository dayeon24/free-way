import { useState } from 'react'

/**
 * CommunityPage (FRONT) - 외견/UI 담당 (인라인 CSS)
 *
 * back에서 받는 데이터: user, posts, loading, filter, showWrite
 * back에서 받는 함수: onSubmit, onLike, onFilter, onShowWrite
 */

// 글 작성 모달
function WriteModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('review')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return
    setLoading(true)
    await onSubmit({ title: title.trim(), body: body.trim(), type })
    setLoading(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px 20px 0 0',
        padding: 20, width: '100%', maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 700 }}>글 작성</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'review', label: '🗺️ 방문 후기' },
            { key: 'report', label: '📢 접근성 제보' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: type === t.key ? 'var(--green-500)' : 'var(--gray-100)',
                color: type === t.key ? 'white' : 'var(--gray-600)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          maxLength={50}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid var(--gray-200)', fontSize: 14,
            marginBottom: 10, outline: 'none', boxSizing: 'border-box',
          }}
        />

        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={type === 'review'
            ? '방문 후기를 작성해주세요. 무장애 시설 정보도 함께 남겨주시면 도움이 돼요!'
            : '접근성 변경 사항을 제보해주세요. (예: 엘리베이터 고장, 경사로 공사 등)'}
          maxLength={500}
          rows={6}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid var(--gray-200)', fontSize: 13,
            resize: 'none', outline: 'none', lineHeight: 1.6,
            boxSizing: 'border-box', marginBottom: 6,
          }}
        />
        <p style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'right', marginBottom: 16 }}>
          {body.length}/500
        </p>

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

// 게시글 카드
function PostCard({ post, currentUser, onLike }) {
  const liked = currentUser && post.likes?.includes(currentUser.uid)
  const likeCount = post.likes?.length || 0

  const timeAgo = (ts) => {
    if (!ts) return ''
    const diff = Date.now() - ts.toMillis()
    const m = Math.floor(diff / 60000)
    if (m < 1) return '방금 전'
    if (m < 60) return `${m}분 전`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}시간 전`
    return `${Math.floor(h / 24)}일 전`
  }

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {post.authorPhoto
            ? <img src={post.authorPhoto} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--green-500)' }}>
                {post.authorName?.[0] || '?'}
              </div>
          }
          <div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{post.authorName}</p>
            <span style={{
              fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600,
              background: post.type === 'report' ? '#fff3e0' : 'var(--green-50)',
              color: post.type === 'report' ? '#e65100' : 'var(--green-500)',
            }}>
              {post.type === 'report' ? '📢 접근성 제보' : '🗺️ 방문 후기'}
            </span>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>{timeAgo(post.createdAt)}</p>
      </div>

      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{post.title}</p>
      <p style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.7 }}>{post.body}</p>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-100)' }}>
        <button
          onClick={() => onLike(post.id, liked)}
          style={{
            background: 'none', border: 'none', cursor: currentUser ? 'pointer' : 'default',
            fontSize: 13, color: liked ? '#e53935' : 'var(--gray-600)',
            display: 'flex', alignItems: 'center', gap: 4, fontWeight: liked ? 600 : 400,
          }}
        >
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
      </div>
    </div>
  )
}

export default function CommunityPageFront({
  user,
  posts,
  loading,
  filter,
  showWrite,
  onSubmit,
  onLike,
  onFilter,
  onShowWrite,
}) {
  return (
    <div className="page">
      <p className="page-title">커뮤니티</p>
      <p className="page-subtitle">실제 방문자의 현장 접근성 정보</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {user
          ? <button className="btn btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={() => onShowWrite(true)}>+ 글 작성</button>
          : <div style={{ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 13, color: 'var(--gray-600)', background: 'var(--gray-100)', borderRadius: 8 }}>
              로그인 후 글을 작성할 수 있어요
            </div>
        }
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { key: 'all', label: '전체' },
          { key: 'review', label: '🗺️ 후기' },
          { key: 'report', label: '📢 제보' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: filter === f.key ? 'var(--green-500)' : 'var(--gray-100)',
              color: filter === f.key ? 'white' : 'var(--gray-600)',
            }}
          >
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray-600)', alignSelf: 'center' }}>
          {posts.length}개
        </span>
      </div>

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
        <PostCard key={post.id} post={post} currentUser={user} onLike={onLike} />
      ))}

      {showWrite && <WriteModal onClose={() => onShowWrite(false)} onSubmit={onSubmit} />}
    </div>
  )
}
