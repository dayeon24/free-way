import { Link, useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/': '홈',
  '/map': '지도',
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
      </div>
    </header>
  )
}
