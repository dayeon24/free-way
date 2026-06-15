// 카테고리, 색상, 무장애 아이콘 등 back/front 공용 상수
import { CONTENT_TYPES } from './tourApi'

export const DEFAULT_CENTER = { lat: 35.1595, lng: 126.8526 } // 광주 중심

export const CATEGORIES = [
  { id: CONTENT_TYPES.TOURIST_SPOT,      label: '관광지',   icon: '🏞️' },
  { id: CONTENT_TYPES.CULTURAL_FACILITY, label: '문화시설', icon: '🏛️' },
  { id: CONTENT_TYPES.FESTIVAL,          label: '행사/축제', icon: '🎪' },
  { id: CONTENT_TYPES.TOUR_COURSE,       label: '여행코스', icon: '🗺️' },
  { id: CONTENT_TYPES.LEISURE,           label: '레포츠',   icon: '🏄' },
  { id: CONTENT_TYPES.ACCOMMODATION,     label: '숙박',     icon: '🏨' },
  { id: CONTENT_TYPES.SHOPPING,          label: '쇼핑',     icon: '🛍️' },
  { id: CONTENT_TYPES.RESTAURANT,        label: '음식점',   icon: '🍽️' },
]

export const TYPE_COLOR = {
  12: '#2e7d32', 14: '#1565c0', 15: '#6a1b9a',
  25: '#e65100', 28: '#00695c', 32: '#ad1457',
  38: '#f57f17', 39: '#4e342e',
}

export const BARRIER_ICONS = [
  { key: 'wheelchair',    icon: '♿', label: '휠체어' },
  { key: 'restroom',      icon: '🚻', label: '장애인화장실' },
  { key: 'parking',       icon: '🅿️', label: '장애인주차' },
  { key: 'elevator',      icon: '🛗', label: '엘리베이터' },
  { key: 'stroller',      icon: '👶', label: '유모차' },
  { key: 'lactationroom', icon: '🍼', label: '수유실' },
]
