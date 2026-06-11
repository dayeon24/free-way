export default function MyPage() {
  return (
    <div className="page">
      <p className="page-title">내 정보</p>

      {/* 프로필 */}
      <div className="card section" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'var(--green-500)', flexShrink: 0 }}>
          김
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16 }}>김♥은남</p>
          <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 8 }}>♿ 휠체어 · 함께 시작자</p>
          <div style={{ display: 'flex', gap: 16 }}>
            {[['4', '스탬프'], ['2', '완료 코스'], ['12', '방문지']].map(([n, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-500)' }}>{n}</p>
                <p style={{ fontSize: 10, color: 'var(--gray-600)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 이동 약자 유형 설정 */}
      <div className="section">
        <p className="section-title">내 여행 유형</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '♿', label: '휠체어', active: true },
            { icon: '👶', label: '유모차', active: false },
            { icon: '🧓', label: '고령자', active: false },
          ].map(item => (
            <div key={item.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, border: item.active ? '1.5px solid var(--green-500)' : undefined }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
              {item.active && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>선택됨</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 접근성 설정 */}
      <div className="section">
        <p className="section-title">접근성 설정</p>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: '음성 안내 (TTS)', on: true },
            { label: '고대비 모드', on: false },
            { label: '글자 크기 조절', on: true },
            { label: '스탬프 알림', on: true },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>{item.label}</span>
              <div style={{ width: 40, height: 22, borderRadius: 11, background: item.on ? 'var(--green-500)' : 'var(--gray-200)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: item.on ? 20 : 2, transition: 'left 0.2s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
