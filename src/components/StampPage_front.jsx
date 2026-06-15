/**
 * StampPage (FRONT) - 외견/UI 담당 (인라인 CSS)
 *
 * back에서 받는 데이터: stamps, earned
 */
export default function StampPageFront({ stamps, earned }) {
  return (
    <div className="page">
      <p className="page-title">스탬프 투어</p>
      <p className="page-subtitle">광주·전남 무장애 여행 궤적을 기록하세요</p>

      <div className="card section" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 4 }}>광주 무장애 시티투어</p>
          <p style={{ fontSize: 22, fontWeight: 700 }}>
            <span style={{ color: 'var(--green-500)' }}>{earned}</span>
            <span style={{ fontSize: 16, color: 'var(--gray-600)' }}> / {stamps.length} 완료</span>
          </p>
          <div style={{ marginTop: 8, height: 6, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(earned / stamps.length) * 100}%`, background: 'var(--green-500)', borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 40 }}>🏅</span>
          <p style={{ fontSize: 10, color: 'var(--gray-600)', marginTop: 2 }}>{earned >= stamps.length ? '완주!' : `${stamps.length - earned}개 남음`}</p>
        </div>
      </div>

      <div className="section">
        <p className="section-title">스탬프 목록</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {stamps.map(stamp => (
            <div key={stamp.id} style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28,
                background: stamp.earned ? 'var(--green-50)' : 'var(--gray-100)',
                border: stamp.earned ? '2px solid var(--green-500)' : '2px dashed var(--gray-300)',
                filter: stamp.earned ? 'none' : 'grayscale(1)',
                opacity: stamp.earned ? 1 : 0.5,
              }}>
                {stamp.icon}
              </div>
              <p style={{ fontSize: 10, color: stamp.earned ? 'var(--gray-900)' : 'var(--gray-400)', fontWeight: stamp.earned ? 600 : 400, wordBreak: 'keep-all', lineHeight: 1.3 }}>
                {stamp.name}
              </p>
              {stamp.earned && (
                <p style={{ fontSize: 9, color: 'var(--green-500)', marginTop: 2 }}>{stamp.date}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
