import { NavLink, useLocation } from 'react-router-dom'

const TABS = [
  {
    to: '/map',
    label: '지도',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="tab-icon">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
      </svg>
    ),
  },
  {
    to: '/course',
    label: '코스',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="tab-icon">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    to: '/',
    label: '홈',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="tab-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 10.5 L12 3.5 L20.5 10.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 9.5 V20 H18.5 V9.5" />
      </svg>
    ),
  },
  {
    to: '/community',
    label: '커뮤니티',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="tab-icon">
        <path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
  {
    to: '/my',
    label: '내 정보',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="tab-icon">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function TabBar() {
  const location = useLocation()

  return (
    <nav className="tab-bar">
      {TABS.map((tab) => {
        const active = tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to)
        return (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={`tab-item ${active ? 'active' : ''}`}>
            {tab.icon(active)}
            <span className="tab-label">{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
