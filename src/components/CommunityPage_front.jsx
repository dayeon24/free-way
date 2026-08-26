import { Link } from 'react-router-dom'
import { COMMUNITY_TYPES, REPORT_STATUS, CURRENT_NOTICE, getAvatarColor, formatDate } from '../utils/constants'

/**
 * CommunityPage (FRONT) - 외견/UI 담당 (인라인 CSS)
 *
 * back에서 받는 데이터:
 *   user, posts, totalCount, loading, filter, sortBy, sortOpen, sortOptions,
 *   searchQuery, loginPromptReason, toast
 * back에서 받는 함수:
 *   onLike, onFilter, onSetSortBy, onToggleSortOpen, onSearchChange,
 *   onFabTap, onConfirmLogin, onCancelLoginPrompt, onPlaceTagClick, onNoticeClick
 */

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
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}주 전`
  return `${Math.floor(d / 30)}달 전`
}

// 로그인 필요 안내 팝업 (기획서 "4. 글쓰기 FAB [비로그인]")
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
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-800)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: '#2E4D9A', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

// 공지 배너 (기획서 "3. 공지 배너" - FIX)
function NoticeBanner({ onClick }) {
  const text = CURRENT_NOTICE.text.length > 25 ? CURRENT_NOTICE.text.slice(0, 25) + '…' : CURRENT_NOTICE.text
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        background: '#FBF0DC', border: 'none', cursor: 'pointer',
        padding: '10px 16px', flexShrink: 0, textAlign: 'left',
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: 700, color: '#8C5300', background: 'rgba(255,255,255,0.6)',
        padding: '2px 8px', borderRadius: 20, flexShrink: 0,
      }}>🔔 공지</span>
      <span style={{ fontSize: 12, color: '#5A4321', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {text}
      </span>
      <span style={{ fontSize: 14, color: '#8C5300', flexShrink: 0 }}>›</span>
    </button>
  )
}

// 게시글 카드
function PostCard({ post, currentUser, onLike, onPlaceTagClick }) {
  const liked = currentUser && post.likes?.includes(currentUser.uid)
  const likeCount = post.likes?.length || 0
  const typeDef = COMMUNITY_TYPES.find(t => t.key === post.type) || COMMUNITY_TYPES[0]
  const statusDef = post.type === 'report' ? REPORT_STATUS[post.reportStatus || 'pending'] : null

  return (
    <Link
      to={`/community/${post.id}`}
      className="card"
      style={{ marginBottom: 10, display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            aria-hidden="true"
            style={{
              width: 32, height: 32, borderRadius: '50%', background: getAvatarColor(post.uid || post.authorName), flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700,
            }}
          >
            {post.authorName?.[0] || '?'}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{post.authorName} <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: 11 }}>{timeAgo(post.createdAt)}</span></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {statusDef && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: statusDef.bg, color: statusDef.textColor }}>
              {statusDef.label === '처리완료' ? '✓' : '↻'} {statusDef.label}
            </span>
          )}
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: typeDef.bg, color: typeDef.color }}>
            {typeDef.icon} {typeDef.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{post.title}</p>
          <p style={{
            fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: post.placeName ? 8 : 0,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{post.body}</p>

          {post.placeName && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onPlaceTagClick(post.placeName) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onPlaceTagClick(post.placeName) } }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--green-500)', fontWeight: 600, cursor: 'pointer' }}
            >
              📍 {post.placeName}
            </span>
          )}
        </div>
        {post.images?.[0] && (
          <img
            src={post.images[0]}
            alt=""
            style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-100)' }}>
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onLike(post.id, liked) }}
          aria-label={liked ? '좋아요 취소' : '좋아요'}
          aria-pressed={!!liked}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: liked ? '#e53935' : 'var(--gray-600)',
            display: 'flex', alignItems: 'center', gap: 4, fontWeight: liked ? 600 : 400,
            minWidth: 44, minHeight: 24, padding: 0,
          }}
        >
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
        <span style={{ fontSize: 13, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
          👁 {post.viewCount || 0}
        </span>
        <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 'auto' }}>{formatDate(post.createdAt)}</span>
      </div>
    </Link>
  )
}

export default function CommunityPageFront({
  user,
  posts,
  totalCount,
  loading,
  filter,
  sortBy,
  sortOpen,
  sortOptions,
  searchQuery,
  loginPromptReason,
  toast,
  onLike,
  onFilter,
  onSetSortBy,
  onToggleSortOpen,
  onSearchChange,
  onFabTap,
  onConfirmLogin,
  onCancelLoginPrompt,
  onPlaceTagClick,
  onNoticeClick,
}) {
  const currentSortLabel = sortOptions.find(s => s.key === sortBy)?.label || '최신순'

  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 공지 배너 (FIX) */}
      <NoticeBanner onClick={onNoticeClick} />

      {/* 스크롤 영역: 타이틀 + 검색 + 필터 + 정렬 + 카드 목록 */}
      <div className="page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 90 }}>
        <p className="page-title">커뮤니티</p>
        <p className="page-subtitle">실제 방문자의 현장 접근성 정보</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gray-50)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>🔍</span>
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="장소·키워드로 검색"
            style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--gray-900)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, position: 'relative' }}>
          <button
            onClick={() => onFilter('all')}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
              fontWeight: filter === 'all' ? 700 : 500,
              background: filter === 'all' ? 'var(--green-600)' : 'var(--gray-100)',
              color: filter === 'all' ? 'white' : 'var(--gray-600)',
            }}
          >
            전체
          </button>
          {COMMUNITY_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => onFilter(t.key)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
                fontWeight: filter === t.key ? 700 : 500,
                background: filter === t.key ? t.color : 'var(--gray-100)',
                color: filter === t.key ? 'white' : 'var(--gray-600)',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              onClick={onToggleSortOpen}
              aria-label="정렬 방식 선택"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--gray-700)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2, minHeight: 44 }}
            >
              {currentSortLabel} ▾
            </button>
            {sortOpen && (
              <>
                <div onClick={onToggleSortOpen} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'white',
                  borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', overflow: 'hidden', zIndex: 61, minWidth: 110,
                }}>
                  {sortOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => onSetSortBy(opt.key)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                        background: sortBy === opt.key ? 'var(--green-50)' : 'white', cursor: 'pointer', fontSize: 13,
                        color: sortBy === opt.key ? 'var(--green-600)' : 'var(--gray-800)',
                        fontWeight: sortBy === opt.key ? 700 : 400,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 10 }}>총 {posts.length}개</p>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)' }} />
          </div>
        )}
        {!loading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📝</p>
            <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>해당하는 글이 없어요</p>
          </div>
        )}
        {posts.map(post => (
          <PostCard key={post.id} post={post} currentUser={user} onLike={onLike} onPlaceTagClick={onPlaceTagClick} />
        ))}
      </div>

      {/* 글쓰기 FAB (FIX, 기획서 "4. 글쓰기 FAB") */}
      <button
        onClick={onFabTap}
        aria-label="글쓰기"
        className="fab-btn"
        style={{
          position: 'absolute', right: 18, bottom: 14, width: 52, height: 52, borderRadius: '50%',
          border: 'none', cursor: 'pointer', background: 'var(--green-600)', color: 'white', fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
        }}
      >
        ✏️
      </button>

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 78, left: '50%', transform: 'translateX(-50%)', zIndex: 250,
          background: 'rgba(30,30,30,0.9)', color: 'white', fontSize: 12,
          padding: '9px 16px', borderRadius: 20, whiteSpace: 'nowrap', maxWidth: '90%',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {toast}
        </div>
      )}

      {loginPromptReason && <LoginPromptModal onCancel={onCancelLoginPrompt} onConfirm={onConfirmLogin} />}
    </div>
  )
}
