const POSTS = [
  {
    id: 1,
    author: '이♣연',
    badge: '스탬프 인증',
    title: '국립아시아문화전당 완벽 무장애!',
    body: '전동휠체어로 방문했는데 전 구간 이동 가능했어요. 엘리베이터 4대 모두 정상 운행 중입니다.',
    date: '2026.01.15',
    likes: 24,
    comments: 3,
    verified: true,
  },
  {
    id: 2,
    author: '박♠우',
    badge: '제보',
    title: '1913 송정역 시장 - 입구 경사로 공사 중',
    body: '메인 입구 경사로가 1월 말까지 공사 예정이에요. 옆 골목 대안 경로로 진입 가능합니다.',
    date: '2026.01.14',
    likes: 41,
    comments: 15,
    verified: false,
  },
]

export default function CommunityPage() {
  return (
    <div className="page">
      <p className="page-title">커뮤니티</p>
      <p className="page-subtitle">실제 방문자의 현장 접근성 정보</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }}>+ 후기 작성</button>
        <button className="btn btn-outline" style={{ flex: 1, fontSize: 12 }}>📷 접근성 제보</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {POSTS.map(post => (
          <div key={post.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--green-500)' }}>
                  {post.author[0]}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600 }}>{post.author}</p>
                  <span className="badge badge-green" style={{ fontSize: 10, padding: '2px 8px' }}>{post.badge}</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>{post.date}</p>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{post.title}</p>
            <p style={{ fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.6 }}>{post.body}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-100)' }}>
              <button style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--gray-600)', cursor: 'pointer' }}>❤️ {post.likes}</button>
              <button style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--gray-600)', cursor: 'pointer' }}>💬 {post.comments}</button>
              <button style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--gray-600)', cursor: 'pointer', marginLeft: 'auto' }}>공유 →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
