import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/': null,          // 지도 페이지는 헤더 숨김 (지도가 꽉 차야 함)
  '/course': '코스 플래너',
  '/stamp': '스탬프 투어',
  '/community': '커뮤니티',
  '/my': '내 정보',
}

export default function Header() {
  const { pathname } = useLocation()

  // 지도 페이지는 헤더 없이 지도만 표시
  if (pathname === '/') return null

  return (
    <header className="app-header">
      <div>
        <p className="logo">프리웨이</p>
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>
        {PAGE_TITLES[pathname] ?? ''}
      </p>
    </header>
  )
}
