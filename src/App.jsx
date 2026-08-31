import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import TabBar from './components/TabBar'
import MapPage from './pages/MapPage'
import CoursePage from './pages/CoursePage'
import StampPage from './pages/StampPage'
import CommunityPage from './pages/CommunityPage'
import MyPage from './pages/MyPage'
import { useAccessibility, AccessibilityContext } from './hooks/useAccessibility'

function AppLayout() {
  const { pathname } = useLocation()
  const isMapPage = pathname === '/'

  return (
    <div className="app-layout">
      <Header />
      <main className={`app-content ${isMapPage ? 'no-scroll' : ''}`}>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/course" element={<CoursePage />} />
          <Route path="/stamp" element={<StampPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/my" element={<MyPage />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}

export default function App() {
  const accessibility = useAccessibility()

  return (
    <AccessibilityContext.Provider value={accessibility}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AccessibilityContext.Provider>
  )
}
