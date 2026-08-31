import { Link } from 'react-router-dom'
import { useRef, useState } from 'react'

const DUST_LABEL = {
  good: { text: '좋음', color: 'var(--green-500)' },
  normal: { text: '보통', color: '#f9a825' },
  bad: { text: '나쁨', color: '#e53935' },
  veryBad: { text: '매우나쁨', color: '#8e24aa' },
}

const POST_TAG = {
  review: { text: '후기', color: '#7b1fa2', bg: '#f3e5f5' },
  report: { text: '제보', color: '#f9a825', bg: '#fff8e1' },
}

function truncateTitle(title) {
  if (!title) return ''
  return title.length > 20 ? title.slice(0, 20) + '...' : title
}

function postTimeAgo(ts) {
  if (!ts?.toMillis) return ''
  const diff = Date.now() - ts.toMillis()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${Math.max(m, 1)}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

/**
 * HomePage (FRONT) - 외견/UI 담당 (인라인 CSS)
 *
 * back에서 받는 데이터: weather, stampTour, courses, coursesLoading, coursesError, categories
 */
export default function HomePageFront({
  weather,
  stampTour,
  courses,
  coursesLoading,
  coursesError,
  categories,
  posts,
  postsLoading,
  postsError,
}) {
  const scrollRef = useRef(null)
  const [pageIndex, setPageIndex] = useState(1)

  function handleScroll() {
    const el = scrollRef.current
    if (!el || !el.firstChild) return
    const cardWidth = el.firstChild.offsetWidth + 10 // gap 포함
    const idx = Math.round(el.scrollLeft / cardWidth) + 1
    setPageIndex(Math.min(Math.max(idx, 1), courses.length || 1))
  }

  const dust = DUST_LABEL[weather.dustLevel] ?? DUST_LABEL.good

  const wheelchairOk = !weather.rain

  return (
    <div className="page">
      {/* 날씨 카드 */}
      <div className="card section" style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 24 }}>{weather.icon}</span>
          <span style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{weather.temp}°C</span>
          <span style={{ fontSize: 10, color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>
            최저 {weather.tempMin}° / 최고 {weather.tempMax}°
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.5, marginBottom: 8 }}>
            {weather.message}
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="badge" style={{ background: wheelchairOk ? 'var(--green-50)' : '#fff3e0', color: wheelchairOk ? 'var(--green-500)' : '#e65100' }}>
              ♿ 휠체어 이동 {wheelchairOk ? '양호' : '주의'}
            </span>
            <span className="badge" style={{ background: dust.color + '18', color: dust.color }}>
              😷 미세먼지 {dust.text}
            </span>
          </div>
        </div>
      </div>

      {/* 스탬프 투어 */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="section-title" style={{ marginBottom: 0 }}>🏅 스탬프 투어</p>
          <Link to="/stamp" style={{ fontSize: 12, color: 'var(--gray-600)', textDecoration: 'none' }}>
            전체보기 &gt;
          </Link>
        </div>
        {stampTour.earned === 0 && (
          <Link to="/stamp" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 10 }}>
              아직 시작한 투어가 없어요
            </p>
            <span className="btn btn-primary" style={{ display: 'inline-flex' }}>
              첫 투어를 시작해보세요!
            </span>
          </Link>
        )}

        {stampTour.earned > 0 && stampTour.earned < stampTour.total && (
          <Link to="/stamp" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              border: '2px solid var(--green-500)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-500)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{stampTour.name}</p>
              <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 8 }}>
                {stampTour.earned}/{stampTour.total} 완료
              </p>
              <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(stampTour.earned / stampTour.total) * 100}%`,
                  background: 'var(--green-500)', borderRadius: 4,
                }} />
              </div>
            </div>
          </Link>
        )}

        {stampTour.earned > 0 && stampTour.earned === stampTour.total && (
          <Link to="/stamp" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              border: '2px solid var(--green-500)', background: 'var(--green-500)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{stampTour.name}</p>
              <p style={{ fontSize: 12, color: 'var(--green-500)', fontWeight: 600 }}>
                🎉 모든 스탬프를 모았어요!
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* 오늘의 무장애 AI 추천 코스 */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p className="section-title" style={{ marginBottom: 0 }}>💡 오늘의 무장애 AI 추천 코스</p>
            {courses.length > 0 && (
              <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--gray-100)', borderRadius: 20, color: 'var(--gray-600)' }}>
                {pageIndex} | {courses.length}
              </span>
            )}
          </div>
          <Link to="/course" style={{ fontSize: 12, color: 'var(--gray-600)', textDecoration: 'none', flexShrink: 0 }}>
            전체보기 &gt;
          </Link>
        </div>

        {coursesLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)' }} />
          </div>
        )}
        {!coursesLoading && coursesError && (
          <p style={{ fontSize: 12, color: '#c62828' }}>{coursesError}</p>
        )}
        {!coursesLoading && !coursesError && courses.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>추천 코스가 아직 없어요</p>
        )}

        {!coursesLoading && courses.length > 0 && (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}
          >
            {courses.map(item => {
              const cat = categories.find(c => c.id === Number(item.contenttypeid))
              const region = item.addr1?.split(' ')[0] || ''
              return (
                <div key={item.contentid} className="card" style={{ flexShrink: 0, width: 160, padding: 0, overflow: 'hidden' }}>
                  {item.firstimage
                    ? <img src={item.firstimage} alt={item.title} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: 100, background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                        {cat?.icon || '📍'}
                      </div>
                  }
                  <div style={{ padding: 10 }}>
                    <p style={{ fontSize: 10, color: 'var(--gray-600)', marginBottom: 3 }}>
                      {region} · {cat?.label || ''}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 커뮤니티 최신 제보 */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="section-title" style={{ marginBottom: 0 }}>💬 커뮤니티 최신 제보</p>
          <Link to="/community" style={{ fontSize: 12, color: 'var(--gray-600)', textDecoration: 'none' }}>
            더보기 +
          </Link>
        </div>

        {postsLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="spinner" style={{ borderTopColor: '#2e7d32', borderColor: 'rgba(0,0,0,0.1)' }} />
          </div>
        )}
        {!postsLoading && postsError && (
          <p style={{ fontSize: 12, color: '#c62828' }}>{postsError}</p>
        )}
        {!postsLoading && !postsError && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 10 }}>
              아직 글이 없어요. 첫 글을 남겨보세요!
            </p>
            <Link to="/community" className="btn btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
              글 작성하러 가기
            </Link>
          </div>
        )}

        {!postsLoading && !postsError && posts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posts.map(post => {
              const tag = POST_TAG[post.type] ?? POST_TAG.review
              const likeCount = post.likes?.length || 0
              const ariaLabel = `${tag.text} ${post.title} 작성자 ${post.authorName} 좋아요 ${likeCount}개`
              return (
                <Link
                  key={post.id}
                  to="/community"
                  aria-label={ariaLabel}
                  className="card"
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600, background: tag.bg, color: tag.color }}>
                      {tag.text}
                    </span>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{truncateTitle(post.title)}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 11, color: 'var(--gray-600)' }}>
                      {post.authorName} · {postTimeAgo(post.createdAt)}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--gray-600)' }}>♥ {likeCount}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
