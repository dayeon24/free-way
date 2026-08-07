import { Link, useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/': '코스 플래너',   // 기획서 FIX 영역 표기 (변경 가능성 있음)
  '/map': null,       // 지도 페이지는 타이틀 없이 로고 + 홈 버튼만 (기획서 MAP-01 FIX 영역)
  '/course': '코스 플래너',
  '/stamp': '스탬프 투어',
  '/community': '커뮤니티',
  '/my': '내 정보',
}

export default function Header() {
  const { pathname } = useLocation()

  return (
    <header className="app-header">
      <div>
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>프리웨이</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>
          {PAGE_TITLES[pathname] ?? ''}
        </p>
        {/* 홈 버튼 (기획서 FIX 영역) */}
        <Link
          to="/"
          aria-label="홈으로 이동"
          style={{
            width: 34, height: 34, borderRadius: 10, border: '1.5px solid var(--gray-800)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--white)', flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-800)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 10.5 L12 3.5 L20.5 10.5" />
            <path d="M5.5 9.5 V20 H18.5 V9.5" />
          </svg>
        </Link>
      </div>
    </header>
  )
}
