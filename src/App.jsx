import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import TabBar from './components/TabBar'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import CoursePage from './pages/CoursePage'
import CourseDetailPage from './pages/CourseDetailPage'
import AiCoursePage from './pages/AiCoursePage'
import StampPage from './pages/StampPage'
import CommunityPage from './pages/CommunityPage'
import PostDetailPage from './pages/PostDetailPage'
import WritePostPage from './pages/WritePostPage'
import MyPage from './pages/MyPage'
import { useAccessibility, AccessibilityContext } from './hooks/useAccessibility'

function AppLayout() {
  const { pathname } = useLocation()
  const isMapPage = pathname === '/map'
  const isCommunityPage = pathname.startsWith('/community')
  const isCourseSubPage = pathname.startsWith('/course/') // 코스 상세/AI 결과: 상단 바 고정 + 내부 스크롤

  return (
    <div className="app-layout">
      <Header />
      <main className={`app-content ${(isMapPage || isCommunityPage || isCourseSubPage) ? 'no-scroll' : ''}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/course" element={<CoursePage />} />
          <Route path="/course/ai" element={<AiCoursePage />} />
          <Route path="/course/share/:shareId" element={<AiCoursePage />} />
          <Route path="/course/:id" element={<CourseDetailPage />} />
          <Route path="/stamp" element={<StampPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/community/write" element={<WritePostPage />} />
          <Route path="/community/:id" element={<PostDetailPage />} />
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
