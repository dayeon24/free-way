import { Link, useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/': '코스 플래너',   // 기획서 FIX 영역 표기 (변경 가능성 있음)
  '/map': null,       // 지도 페이지는 헤더 숨김 (지도가 꽉 차야 함)
  '/course': '코스 플래너',
  '/stamp': '스탬프 투어',
  '/community': '커뮤니티',
  '/my': '내 정보',
}

export default function Header() {
  const { pathname } = useLocation()

  // 지도 페이지는 헤더 없이 지도만 표시
  if (pathname === '/map') return null

  return (
    <header className="app-header">
      <div>
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>프리웨이</Link>
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>
        {PAGE_TITLES[pathname] ?? ''}
      </p>
    </header>
  )
}
