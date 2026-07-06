import StampPageFront from '../components/StampPage_front'

/**
 * StampPage (BACK) - 기능/로직 담당
 *
 * 보유: 스탬프 데이터 (향후 Firebase 연동 예정)
 * front에 넘기는 데이터: stamps, earned
 */

export const STAMPS = [
  { id: 1, name: '국립아시아문화전당', earned: true, date: '2026.01.15', icon: '🏛️' },
  { id: 2, name: '광주 중앙공원', earned: true, date: '2026.01.15', icon: '🌳' },
  { id: 3, name: '펭귄마을', earned: false, icon: '🐧' },
  { id: 4, name: '1913 송정역 시장', earned: false, icon: '🛒' },
  { id: 5, name: '광주비엔날레전시관', earned: false, icon: '🎨' },
  { id: 6, name: '담양 죽녹원', earned: false, icon: '🎋' },
  { id: 7, name: '보성 녹차밭', earned: false, icon: '🍵' },
  { id: 8, name: '순천만 국가정원', earned: false, icon: '🌸' },
]

export default function StampPage() {
  const earned = STAMPS.filter(s => s.earned).length

  return <StampPageFront stamps={STAMPS} earned={earned} />
}
