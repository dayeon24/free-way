// 코스탭 데이터 유틸 — 정적 코스 데이터, 카테고리/타입 정의, 운영시간 판정, TourAPI 후보 장소 조회, 편의시설/행사 조회
import { getDistanceKm, getAccessibilityGrade } from './constants'

// 코스탭 색상 토큰 (기획서 teal 계열)
export const TEAL = { 50: '#EFF7F4', 500: '#2E9580', 700: '#1C6354', 800: '#154A40' }

// 코스 카테고리 3종 (기획서 "5. 코스 카드 구성 요소")
export const COURSE_CATEGORIES = {
  nature:   { label: '자연/힐링',     color: '#2E7D32', bg: '#E5F6E8', icon: '🌿', from: '#2E9580', to: '#154A40' },
  activity: { label: '체험/액티비티', color: '#B45309', bg: '#FDEBD8', icon: '🎡', from: '#C98A3B', to: '#8A4A12' },
  culture:  { label: '인문기행',      color: '#1F5FBF', bg: '#E3EEFC', icon: '🏛️', from: '#3B7DD8', to: '#1B3F86' },
}

// TourAPI contenttypeid → 장소 유형 (라벨, 기본 체류시간(분))
export const PLACE_TYPES = {
  12: { label: '관광지',   minutes: 90 },
  14: { label: '문화시설', minutes: 60 },
  15: { label: '행사·축제', minutes: 90 },
  28: { label: '레포츠',   minutes: 120 },
  32: { label: '숙박',     minutes: 0 },
  38: { label: '쇼핑',     minutes: 45 },
  39: { label: '식사',     minutes: 60 },
}
export const typeLabel = t => PLACE_TYPES[Number(t)]?.label || '장소'
export const typeMinutes = t => PLACE_TYPES[Number(t)]?.minutes ?? 60

const sleep = ms => new Promise(r => setTimeout(r, ms))

/* ───────── 정적 데이터 로더 (한 번만 받아서 캐시) ───────── */

function cachedJson(url, pick) {
  let promise = null
  return () => {
    if (!promise) {
      promise = fetch(url)
        .then(r => { if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json() })
        .then(pick)
        .catch(e => { promise = null; throw e }) // 실패하면 다음에 재시도할 수 있게 캐시 비움
    }
    return promise
  }
}

export const loadTourCourses = cachedJson('/tour-courses.json', j => j.courses || [])
export const loadBarrierIndex = () => barrierLoader().catch(() => ({}))
const barrierLoader = cachedJson('/barrier-free-index.json', j => j.data || {})
export const loadToilets = cachedJson('/accessible-toilets.json', j => j)
export const loadChargers = cachedJson('/accessible-chargers.json', j => j)

export async function getTourCourse(id) {
  const all = await loadTourCourses()
  return all.find(c => String(c.id) === String(id)) || null
}

/* ───────── 접근성 ───────── */

export const GRADE_LABEL = { available: '적합', partial: '일부 가능', unknown: '확인 필요' }

// 등급별 경고 문구 (접근성이 중요한 여행자에게만)
export function warningFor(grade, sensitive = true) {
  if (!sensitive) return null
  if (grade === 'partial') return '출입구 접근 정보가 등록되지 않았어요. 방문 전 확인하세요'
  if (grade === 'unknown') return '관광공사에 등록된 접근성 정보가 없어요. 방문 전 전화로 확인하세요'
  return null
}

// 접근성 등급 + 경고 문구 (색 외 텍스트로도 상태 전달 — 기획서 접근성 요구사항)
export function accessInfo(contentid, barrierIndex, { sensitive = true } = {}) {
  const grade = getAccessibilityGrade(String(contentid), barrierIndex)
  return { grade, warning: warningFor(grade, sensitive) }
}

/* ───────── 운영시간 판정 (기획서 "운영 시간 (v2)": openTime → 운영중/휴무 배지) ───────── */

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토']

// { status: 'open' | 'closed' | 'ended', text } | null (정보 없음 → 배지 미표시)
export function parseOpenStatus(openTime, restDate, now = new Date()) {
  const rest = (restDate || '').replace(/\s+/g, ' ')
  const open = (openTime || '').replace(/\s+/g, ' ')
  const today = DAYS_KO[now.getDay()]

  // 휴무일 — "매주 월요일", "월요일" 같은 단순한 표기만 판정 ("첫째 주 월요일" 등 복잡한 규칙은 판정하지 않음)
  const noRule = !rest || /연중\s*무휴|없음|무휴/.test(rest)
  const complex = /첫째|둘째|셋째|넷째|격주|매월/.test(rest) // "매주 월요일 (공휴일이면 개관)"은 월요일 휴무로 판정
  if (!noRule && !complex) {
    const list = [...rest.matchAll(/([일월화수목금토])\s*요일/g)].map(m => m[1])
    if (list.includes(today)) return { status: 'closed', text: '오늘 휴무' }
  }

  if (/상시|24\s*시간|연중\s*개방|항시/.test(open)) return { status: 'open', text: '상시 개방 · 운영중' }

  const m = open.match(/(\d{1,2}):(\d{2})\s*[~\-–]\s*(\d{1,2}):(\d{2})/)
  if (!m) return null
  const pad = n => String(n).padStart(2, '0')
  const range = `${pad(m[1])}:${m[2]}~${pad(m[3])}:${m[4]}`
  const cur = now.getHours() * 60 + now.getMinutes()
  const s = Number(m[1]) * 60 + Number(m[2])
  const e = Number(m[3]) * 60 + Number(m[4])
  const isOpen = e > s ? cur >= s && cur < e : cur >= s || cur < e
  if (isOpen) return { status: 'open', text: `오늘 ${range} · 운영중` }
  return { status: 'ended', text: `오늘 ${range} · ${cur < s ? '운영 전' : '운영 종료'}` }
}

/* ───────── TourAPI 런타임 호출 (후보 장소/행사) ───────── */

// 관광공사 API는 초당 호출 제한이 있어서(LIMITED_NUMBER_OF_SERVICE_REQUESTS_PER_SECOND_EXCEEDS_ERROR) 잠깐 쉬고 재시도
export async function tourCall(endpoint, params = {}, base = 'default') {
  const url = new URL('/api/tour', window.location.origin)
  url.searchParams.set('endpoint', endpoint)
  if (base !== 'default') url.searchParams.set('base', base) // 'barrier-free' = 무장애 여행 정보 API
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`TourAPI HTTP ${res.status}`)
    const json = await res.json()
    if (json?.OpenAPI_ServiceResponse) { await sleep(1100); continue }
    if (json?.response?.header?.resultCode !== '0000') throw new Error(json?.response?.header?.resultMsg || 'TourAPI 오류')
    const items = json.response.body?.items?.item
    return items ? [items].flat() : []
  }
  throw new Error('TourAPI 호출 제한')
}

function toCandidate(it) {
  const x = parseFloat(it.mapx), y = parseFloat(it.mapy)
  if (!it.contentid || Number.isNaN(x) || Number.isNaN(y)) return null
  return {
    id: String(it.contentid), name: (it.title || '').trim(), type: Number(it.contenttypeid),
    x, y, addr: (it.addr1 || '').trim(), image: it.firstimage || '',
  }
}

// 중심 좌표 반경 안의 후보 장소를 유형별로 조회 (거리순)
export async function fetchCandidates({ center, radiusM, types }) {
  const out = new Map()
  let failed = 0
  for (const t of types) {
    try {
      const items = await tourCall('locationBasedList2', {
        mapX: center.lng, mapY: center.lat, radius: radiusM, contentTypeId: t,
        numOfRows: 60, pageNo: 1, arrange: 'E',
      })
      items.map(toCandidate).filter(Boolean).forEach(c => out.set(c.id, c))
    } catch { failed++ }
    await sleep(280)
  }
  return { list: [...out.values()], failed }
}

// 여행 날짜에 진행 중인 광주·전남 행사·축제 (기획서 "행사·축제 연동")
export async function fetchFestivals(date = new Date()) {
  const pad = n => String(n).padStart(2, '0')
  const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const target = ymd(date)
  const from = new Date(date.getTime() - 45 * 86400000) // 이미 시작해서 진행 중인 행사도 포함
  const found = new Map()
  for (const areaCode of [5, 38]) {
    try {
      const items = await tourCall('searchFestival2', { areaCode, eventStartDate: ymd(from), numOfRows: 40, pageNo: 1, arrange: 'A' })
      items.forEach(it => {
        if (it.eventstartdate <= target && (it.eventenddate || '99999999') >= target) {
          const c = toCandidate({ ...it, contenttypeid: 15 })
          if (c) found.set(c.id, { ...c, period: `${it.eventstartdate}~${it.eventenddate}` })
        }
      })
    } catch { /* 행사 정보는 부가 기능이라 실패해도 조용히 무시 */ }
    await sleep(280)
  }
  return [...found.values()]
}

/* ───────── 경로 중 편의시설 (기획서 "경로 중 편의시설 토글") ───────── */

// 두 지점의 중간 근처에 있는 편의시설 1곳 (반경 안에 없으면 null)
export async function nearestFacility(kind, point, maxKm = 0.8) {
  const list = kind === 'toilet' ? await loadToilets() : await loadChargers()
  let best = null
  for (const f of list) {
    const d = getDistanceKm(point.y, point.x, f.latitude, f.longitude)
    if (d <= maxKm && (!best || d < best.d)) best = { f, d }
  }
  if (!best) return null
  return {
    kind, name: best.f.name, addr: best.f.address, x: best.f.longitude, y: best.f.latitude,
    hours: kind === 'toilet' ? best.f.openHours : best.f.weekdayHours,
  }
}
