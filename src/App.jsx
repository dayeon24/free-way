import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import TabBar from './components/TabBar'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import CoursePage from './pages/CoursePage'
import StampPage from './pages/StampPage'
import CommunityPage from './pages/CommunityPage'
import PostDetailPage from './pages/PostDetailPage'
import WritePostPage from './pages/WritePostPage'
import MyPage from './pages/MyPage'

function AppLayout() {
  const { pathname } = useLocation()
  const isMapPage = pathname === '/map'
  const isCommunityPage = pathname.startsWith('/community')

  return (
    <div className="app-layout">
      <Header />
      <main className={`app-content ${(isMapPage || isCommunityPage) ? 'no-scroll' : ''}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/course" element={<CoursePage />} />
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
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
