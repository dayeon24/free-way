// AI 코스 생성 로직 — 후보 수집(TourAPI) → Claude 선택(/api/course) → 검증 → 실패 시 규칙 기반 대체 → 이동시간/시간표 계산
import { getDistanceKm, DEFAULT_CENTER } from './constants'
import {
  fetchCandidates, accessInfo, loadBarrierIndex, typeLabel, typeMinutes,
  tourCall, nearestFacility,
} from './courseApi'
import { auth } from '../firebase'

/* ───────── 바텀시트 선택지 (기획서 "AI 코스 만들기 — 바텀시트 v2 확정") ───────── */

export const TRAVELER_TYPES = [
  { key: 'wheelchair', icon: '♿', label: '휠체어', sub: '전동·수동 휠체어 이용자', sensitive: true, suffix: '휠체어 이용자 맞춤' },
  { key: 'stroller',   icon: '🍼', label: '유모차', sub: '영유아 동반 가족 여행자', sensitive: true, suffix: '유모차 동반 가족 맞춤' },
  { key: 'senior',     icon: '🧓', label: '고령자', sub: '어르신 동반 여행자',     sensitive: true, suffix: '고령자 맞춤' },
  { key: 'other',      icon: '😊', label: '기타',   sub: '일반 무장애 여행자',     sensitive: false, suffix: '무장애 여행자 맞춤' },
]
export const TRANSPORTS = [
  { key: 'car',       icon: '🚗', label: '개인 차량' },
  { key: 'transit',   icon: '🚌', label: '대중교통' },
  { key: 'saebitcall', icon: '📞', label: '새빛콜' }, // 광주 교통약자 이동지원센터 1622-2222
]
// 체력 수준 = 하루 이동 거리 상한 (기획서 "체력/거리 상한": AI 프롬프트에 총 이동 거리 상한 전달)
export const STAMINAS = [
  { key: 'S', label: 'S · 3km',  km: 3,  slots: 4 },
  { key: 'M', label: 'M · 6km',  km: 6,  slots: 5 },
  { key: 'L', label: 'L · 10km', km: 10, slots: 6 },
]
export const DURATIONS = [
  { key: 'day', label: '당일',     days: 1 },
  { key: 'n1',  label: '1박 2일', days: 2 },
  { key: 'n2',  label: '2박 3일', days: 3 },
]

/* ───────── 이동 수단별 이동시간 ───────── */

const ROAD_FACTOR = 1.35 // 직선거리 → 실제 도로 거리 보정
export const legLabel = leg => {
  if (!leg) return ''
  const name = { walk: '도보', car: '차량', transit: '대중교통', saebitcall: '새빛콜' }[leg.mode] || '이동'
  const icon = { walk: '🚶', car: '🚗', transit: '🚌', saebitcall: '📞' }[leg.mode] || '➜'
  return `${icon} ${name} ${leg.minutes}분`
}

// 거리 기반 추정 (카카오 길찾기는 자동차 경로만 제공 → 대중교통/새빛콜/도보는 추정)
export function estimateLeg(a, b, mode) {
  const km = getDistanceKm(a.y, a.x, b.y, b.x) * ROAD_FACTOR
  let kind = mode, minutes
  if (km <= 0.8) { kind = 'walk'; minutes = (km / 3) * 60 }
  else if (mode === 'car') minutes = (km / 28) * 60 + 3           // 시내 평균 + 주차
  else if (mode === 'transit') minutes = (km / 18) * 60 + 8       // 평균 속도 + 대기
  else minutes = (km / 24) * 60 + 15                              // 새빛콜: 배차 대기 포함
  return { mode: kind, minutes: Math.max(5, Math.round(minutes / 5) * 5), km: Math.round(km * 10) / 10, estimated: true }
}

let directionsAvailable = true // 키/권한이 없으면 한 번만 실패 확인 후 더 호출하지 않음
const legCache = new Map()

export async function getLeg(a, b, mode) {
  const key = `${mode}|${a.x.toFixed(4)},${a.y.toFixed(4)}|${b.x.toFixed(4)},${b.y.toFixed(4)}`
  if (legCache.has(key)) return legCache.get(key)

  let leg = estimateLeg(a, b, mode)
  if (mode === 'car' && leg.mode !== 'walk' && directionsAvailable) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 4000)
      const url = new URL('/api/directions', window.location.origin)
      url.searchParams.set('ox', a.x); url.searchParams.set('oy', a.y)
      url.searchParams.set('dx', b.x); url.searchParams.set('dy', b.y)
      const res = await fetch(url.toString(), { signal: ctrl.signal })
      clearTimeout(timer)
      if (res.ok) {
        const d = await res.json()
        leg = { mode: 'car', minutes: Math.max(5, Math.round(d.duration / 60 / 5) * 5), km: Math.round(d.distance / 100) / 10, estimated: false }
      } else if (res.status === 503 || res.status === 401 || res.status === 403) {
        directionsAvailable = false
      }
    } catch { /* 네트워크 실패 → 추정값 사용 */ }
  }
  legCache.set(key, leg)
  return leg
}

/* ───────── 시간표 계산 ───────── */

export const fmtTime = min => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const round5 = n => Math.ceil(n / 5) * 5
const DAY_START = 9 * 60

// 각 일차의 장소에 leg(이전 장소→이 장소)가 채워져 있다는 전제로 시간 채우기
export function applyTimeline(days) {
  return days.map(day => {
    let cursor = DAY_START
    const items = day.items.map((it, i) => {
      const start = i === 0 ? DAY_START : round5(cursor + (it.leg?.minutes || 0))
      cursor = start + (it.durationMin || 0)
      return { ...it, time: fmtTime(start) }
    })
    return { ...day, items }
  })
}

// 이동 정보(leg) 다시 계산 후 시간표 갱신 — 순서 변경/삭제/추가/재생성 뒤에 호출
export async function relayoutDays(days, mode) {
  const withLegs = await Promise.all(days.map(async day => ({
    ...day,
    items: await Promise.all(day.items.map(async (it, i) => ({
      ...it, leg: i === 0 ? null : await getLeg(day.items[i - 1], it, mode),
    }))),
  })))
  return applyTimeline(withLegs)
}

/* ───────── 코스 요약 (메타 칸) ───────── */

export function courseMeta(course) {
  const items = course.days.flatMap(d => d.items).filter(it => it.kind === 'place')
  const places = items.filter(it => it.type !== 32) // 숙박은 장소 수에서 제외
  const totalKm = items.reduce((s, it) => s + (it.leg?.km || 0), 0)
  const accessible = places.filter(it => it.grade === 'available').length
  let minutes = 0
  course.days.forEach(d => {
    const list = d.items.filter(it => it.kind === 'place')
    if (list.length < 2) return
    const [h, m] = list[0].time.split(':').map(Number)
    const [h2, m2] = list[list.length - 1].time.split(':').map(Number)
    minutes += (h2 * 60 + m2 + (list[list.length - 1].durationMin || 0)) - (h * 60 + m)
  })
  return {
    placeCount: places.length,
    totalKm: Math.round(totalKm * 10) / 10,
    accessible,
    accessibleRatio: places.length ? accessible / places.length : 0,
    hours: Math.max(1, Math.round(minutes / 60)),
  }
}

/* ───────── 아이템 만들기 ───────── */

let seq = 0
export function makeItem(c, barrier, sensitive, extra = {}) {
  const { grade, warning } = accessInfo(c.id, barrier, { sensitive })
  return {
    key: `${c.id}-${(seq++).toString(36)}`,
    kind: 'place', contentid: String(c.id), name: c.name, type: c.type, typeLabel: typeLabel(c.type),
    x: c.x, y: c.y, addr: c.addr || '', image: c.image || '',
    durationMin: typeMinutes(c.type), grade, warning,
    openTime: c.openTime || '', restDate: c.restDate || '',
    reason: '', leg: null, time: '09:00', ...extra,
  }
}

/* ───────── 후보 → 일정 계획 ───────── */

const KIND_TYPES = { place: [12, 14], meal: [39], stay: [32] }

export function buildSlotPlan({ stamina, days }) {
  const s = STAMINAS.find(x => x.key === stamina) || STAMINAS[1]
  const base = s.key === 'S' ? ['place', 'place', 'meal', 'place']
    : s.key === 'M' ? ['place', 'place', 'meal', 'place', 'place']
    : ['place', 'place', 'meal', 'place', 'place', 'meal']
  return Array.from({ length: days }, (_, i) => (i === days - 1 ? base : [...base, 'stay']))
}

// 규칙 기반 생성기 (Claude 미연결/실패 시 대체) — 가까운 순서 + 접근성 우선
function heuristicPlan(slotPlan, pool, { sensitive, indoorPreferred, budgetKm, start }) {
  const used = new Set()
  const gradePenalty = { available: 0, partial: 1.2, unknown: 2.5 }
  const penalty = c => (sensitive ? gradePenalty[c.grade] : 0) + (indoorPreferred && c.type === 12 ? 1.5 : 0)
  const dist = (a, b) => getDistanceKm(a.y, a.x, b.y, b.x) * ROAD_FACTOR

  // 시작 장소가 정해졌을 때 나머지 슬롯을 "가까운 곳 + 접근성 좋은 곳" 순으로 이어 붙인 하루 묶음
  function chainFrom(kinds, anchor) {
    const local = new Set([anchor.id])
    const picks = [anchor]
    let cur = anchor, km = 0, pen = penalty(anchor)
    for (const kind of kinds.slice(1)) {
      const cands = pool.filter(c => KIND_TYPES[kind].includes(c.type) && !used.has(c.id) && !local.has(c.id))
      if (!cands.length) { picks.push(null); pen += 5; continue }
      const best = cands.map(c => ({ c, d: dist(cur, c) })).sort((a, b) => (a.d + penalty(a.c)) - (b.d + penalty(b.c)))[0]
      local.add(best.c.id); picks.push(best.c)
      km += best.d; pen += penalty(best.c); cur = best.c
    }
    return { picks, km, cost: km + pen + (km > budgetKm ? (km - budgetKm) * 10 : 0) }
  }

  let dayStart = start // 1일차는 출발점, 2일차부터는 전날 마지막 장소(숙소)에서 시작
  return slotPlan.map(kinds => {
    // 시작 후보를 여러 개 시도해서 하루 이동거리(상한 초과 시 큰 페널티)가 가장 작은 묶음을 선택
    const anchors = pool
      .filter(c => KIND_TYPES[kinds[0]].includes(c.type) && !used.has(c.id))
      .sort((a, b) => dist(dayStart, a) - dist(dayStart, b))
      .slice(0, 30)
    let best = null
    for (const a of anchors) {
      const ch = chainFrom(kinds, a)
      if (!best || ch.cost < best.cost) best = ch
    }
    if (!best) return kinds.map(() => null)
    best.picks.filter(Boolean).forEach(c => used.add(c.id))
    dayStart = best.picks.filter(Boolean).slice(-1)[0] || dayStart
    return best.picks
  })
}

// Claude가 준 계획 검증 — 후보에 없는 id, 종류가 안 맞는 슬롯, 중복, 누락이 하나라도 있으면 통째로 버림
function validateClaudePlan(plan, slotPlan, poolMap) {
  if (!plan?.days || plan.days.length !== slotPlan.length) return null
  const used = new Set()
  const result = []
  for (let d = 0; d < slotPlan.length; d++) {
    const items = plan.days[d]?.items
    if (!Array.isArray(items)) return null
    const day = []
    for (let s = 0; s < slotPlan[d].length; s++) {
      const it = items.find(x => Number(x.slot) === s)
      const c = it && poolMap.get(String(it.id))
      if (!c || used.has(c.id) || !KIND_TYPES[slotPlan[d][s]].includes(c.type)) return null
      used.add(c.id)
      day.push({ ...c, reason: String(it.reason || '').slice(0, 40) })
    }
    result.push(day)
  }
  return result
}

async function askClaude({ conditions, slotPlan, pool, options }) {
  const slim = ['place12', 'place14', 'meal', 'stay'].flatMap(g => {
    const types = g === 'place12' ? [12] : g === 'place14' ? [14] : g === 'meal' ? [39] : [32]
    const cap = g === 'place12' ? 30 : g === 'place14' ? 15 : g === 'meal' ? 25 : 12
    return pool.filter(c => types.includes(c.type)).slice(0, cap)
  }).map(c => ({
    id: c.id, name: c.name, type: c.type, grade: c.grade,
    x: Math.round(c.x * 1e4) / 1e4, y: Math.round(c.y * 1e4) / 1e4, addr: (c.addr || '').replace(/^(전남광주통합특별시|광주광역시|전라남도)\s*/, '').slice(0, 22),
  }))

  // 로그인 안 된 사용자(예: 공유 링크로 들어온 비로그인 방문자)는 토큰이 없어 서버에서 401로 거절됨
  // → catch에서 규칙 기반으로 자동 대체되므로 여기서 따로 에러 처리 안 해도 됨
  const idToken = await auth.currentUser?.getIdToken().catch(() => null)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 55000)
  try {
    const res = await fetch('/api/course', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ conditions, slotPlan, candidates: slim, options }), signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`AI ${res.status}`)
    return await res.json() // { plan, model }
  } finally {
    clearTimeout(timer)
  }
}

/* ───────── 코스 생성 (기획서 "AI 코스 생성 플로우 3단계") ───────── */

export async function generateCourse(conditions, { center = DEFAULT_CENTER, indoorPreferred = false } = {}) {
  const traveler = TRAVELER_TYPES.find(t => t.key === conditions.travelerType) || TRAVELER_TYPES[3]
  const stamina = STAMINAS.find(s => s.key === conditions.stamina) || STAMINAS[1]
  const dur = DURATIONS.find(d => d.key === conditions.duration) || DURATIONS[0]
  const barrier = await loadBarrierIndex()
  const slotPlan = buildSlotPlan({ stamina: stamina.key, days: dur.days })
  const needed = slotPlan.flat().length

  // 1) 후보 장소 수집 (TourAPI 위치 기반, 유형별)
  const types = [12, 14, 39, ...(dur.days > 1 ? [32] : [])]
  let radiusM = Math.min(9000, Math.max(3000, stamina.km * 1000))
  let got = await fetchCandidates({ center, radiusM, types })
  if (got.list.length < needed * 1.5) got = await fetchCandidates({ center, radiusM: radiusM * 2, types })
  if (!got.list.length) throw new Error('NO_CANDIDATES')
  const pool = got.list.map(c => ({ ...c, grade: accessInfo(c.id, barrier, { sensitive: traveler.sensitive }).grade }))
  const poolMap = new Map(pool.map(c => [c.id, c]))
  const budgetKm = stamina.km

  // 2) Claude에게 후보 중 선택·정렬 요청 → 검증
  let chosen = null
  let generatedBy = 'rules'
  let title = '', summary = ''
  try {
    const { plan } = await askClaude({
      conditions: { travelerType: traveler.key, transport: conditions.transport, stamina: stamina.key, days: dur.days },
      slotPlan, pool,
      options: { budgetKm, indoorPreferred, startPoint: { x: center.lng, y: center.lat } },
    })
    chosen = validateClaudePlan(plan, slotPlan, poolMap)
    if (chosen) { generatedBy = 'claude'; title = String(plan.title || '').slice(0, 40); summary = String(plan.summary || '').slice(0, 60) }
  } catch { /* 키 없음/타임아웃/응답 오류 → 규칙 기반으로 대체 */ }

  // 3) 대체: 규칙 기반 생성
  const build = plan => plan.map((cands, di) => ({
    day: di + 1,
    items: cands.filter(Boolean).map(c => makeItem(c, barrier, traveler.sensitive, { reason: c.reason || '' })),
  }))
  const start = { x: center.lng, y: center.lat }
  const heur = () => heuristicPlan(slotPlan, pool, { sensitive: traveler.sensitive, indoorPreferred, budgetKm, start })

  let days = await relayoutDays(build(chosen || heur()), conditions.transport)

  // Claude 계획이 하루 이동 거리 상한을 크게 넘으면 규칙 기반으로 다시 짬 (체력 수준 상한 보장)
  const overBudget = ds => ds.some(d => d.items.reduce((s, it) => s + (it.leg?.km || 0), 0) > budgetKm * 1.4)
  if (chosen && overBudget(days)) {
    generatedBy = 'rules'; title = ''; summary = ''
    days = await relayoutDays(build(heur()), conditions.transport)
  }
  if (days.every(d => d.items.length === 0)) throw new Error('NO_CANDIDATES')

  const firstAddr = days[0].items[0]?.addr || ''
  const region = (() => {
    const a = firstAddr.replace(/^(전남광주통합특별시|광주광역시|전라남도|전남)\s*/, '')
    const m = a.match(/^(\S+?)([시군구])(?:\s|$)/)
    if (!m) return null
    return m[2] === '구' ? `광주 ${m[1]}${m[2]}` : `전남 ${m[1]}`
  })()

  return {
    id: `ai-${Date.now().toString(36)}`,
    source: 'ai', generatedBy,
    title: title || `광주 무장애 ${dur.label} 코스 — ${traveler.suffix}`,
    summary,
    conditions: { travelerType: traveler.key, transport: conditions.transport, stamina: stamina.key, duration: dur.key },
    chips: [traveler.label, TRANSPORTS.find(t => t.key === conditions.transport)?.label, `${stamina.key} · ${stamina.km}km 이내`, dur.label,
      ...(region ? [region] : []), ...(stamina.key === 'S' ? ['이동 최소화'] : [])].filter(Boolean),
    options: { indoorPreferred },
    center: { x: center.lng, y: center.lat },
    days,
    pool, // 대체 장소 제안/장소 추가에 사용 (저장·공유 시에는 제외)
    createdAt: Date.now(),
  }
}

/* ───────── 관광공사 추천 코스(정적 데이터) → 화면용 코스 ───────── */

// 박 수 추론 — 관광공사 소요시간 필드가 비어 있는 코스가 많아서 제목·소개의 "1박 2일" 표기도 함께 사용
export function nightsOf(tc) {
  const m = `${tc.takeTime || ''} ${tc.title || ''} ${tc.overview || ''}`.match(/(\d)\s*박\s*(\d)?\s*일?/)
  return m ? Math.min(2, Number(m[1])) : 0
}

export function tourToCourse(tc, barrier) {
  const nights = nightsOf(tc)
  const nDays = Math.min(3, nights + 1)
  const per = Math.ceil(tc.places.length / nDays)
  const days = Array.from({ length: nDays }, (_, i) => ({
    day: i + 1,
    items: tc.places.slice(i * per, (i + 1) * per).map(p => makeItem(p, barrier, true)),
  })).filter(d => d.items.length)

  // 이동 정보는 거리 기반 추정 (추천 코스는 이동수단 미지정 → 차량 기준, 800m 이하는 도보)
  const withLegs = days.map(d => ({ ...d, items: d.items.map((it, i) => ({ ...it, leg: i ? estimateLeg(d.items[i - 1], it, 'car') : null })) }))
  return {
    id: `tour-${tc.id}`, source: 'tour', tourId: tc.id,
    title: tc.title, category: tc.category, region: tc.region, image: tc.image,
    distance: tc.distance, takeTime: tc.takeTime, overview: tc.overview, nights,
    days: applyTimeline(withLegs),
  }
}

/* ───────── 편집/대체 ───────── */

const GRADE_RANK = { available: 0, partial: 1, unknown: 2 }

// 같은 종류의 미사용 후보 중 접근성이 더 나은(또는 같은) 가까운 장소 1곳
export function suggestAlternative(course, item) {
  const used = new Set(course.days.flatMap(d => d.items.map(i => i.contentid)))
  const sameKind = c => (item.type === 39 ? c.type === 39 : item.type === 32 ? c.type === 32 : c.type === 12 || c.type === 14)
  const list = (course.pool || [])
    .filter(c => !used.has(c.id) && sameKind(c) && GRADE_RANK[c.grade] <= GRADE_RANK[item.grade])
    .map(c => ({ c, d: getDistanceKm(item.y, item.x, c.y, c.x), r: GRADE_RANK[c.grade] }))
    .sort((a, b) => a.r - b.r || a.d - b.d)
  return list[0]?.c || null
}

// 장소 추가 목록 — 아직 안 쓴 후보를 기준점에서 가까운 순으로
export function addableCandidates(course, from) {
  const used = new Set(course.days.flatMap(d => d.items.map(i => i.contentid)))
  return (course.pool || [])
    .filter(c => !used.has(c.id))
    .map(c => ({ ...c, distKm: getDistanceKm(from.y, from.x, c.y, c.x) }))
    .sort((a, b) => a.distKm - b.distKm)
}

/* ───────── 경로 중 편의시설 삽입 (표시 전용) ───────── */

export const FACILITY_KINDS = { toilet: { label: '장애인화장실', icon: '🚻' }, charger: { label: '전동충전소', icon: '⚡' } }

// leg 거리가 1km 이상인 구간의 중간 지점 근처 편의시설을 타임라인에 끼워 넣은 "표시용 일정"을 반환 (원본 코스는 수정하지 않음)
export async function withFacilities(days, kinds) {
  if (!kinds.size) return days
  const usedNames = new Set()
  return Promise.all(days.map(async day => {
    const out = []
    for (let i = 0; i < day.items.length; i++) {
      const it = day.items[i]
      out.push(it)
      const next = day.items[i + 1]
      if (!next || (next.leg?.km || 0) < 1) continue
      const mid = { x: (it.x + next.x) / 2, y: (it.y + next.y) / 2 }
      for (const kind of kinds) {
        const f = await nearestFacility(kind, mid)
        if (!f || usedNames.has(f.name)) continue
        usedNames.add(f.name)
        const [h, m] = it.time.split(':').map(Number)
        out.push({
          key: `fac-${kind}-${i}-${f.name}`, kind: 'facility', facilityKind: kind, name: f.name, addr: f.addr,
          x: f.x, y: f.y, hours: f.hours, durationMin: 10, leg: null,
          time: fmtTime(round5(h * 60 + m + (it.durationMin || 0) + 5)),
        })
      }
    }
    return { ...day, items: out }
  }))
}

/* ───────── 운영시간/무장애 상세 보강 (화면을 먼저 보여준 뒤 채움) ───────── */

const OPEN_FIELDS = {
  12: ['usetime', 'restdate'], 14: ['usetimeculture', 'restdateculture'], 28: ['usetimeleports', 'restdateleports'],
  38: ['opentime', 'restdateshopping'], 39: ['opentimefood', 'restdatefood'],
}
const clean = s => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export async function fetchOpenInfo(contentid, type) {
  const f = OPEN_FIELDS[Number(type)]
  if (!f) return null
  try {
    const [it] = await tourCall('detailIntro2', { contentId: contentid, contentTypeId: type })
    return it ? { openTime: clean(it[f[0]]), restDate: clean(it[f[1]]) } : null
  } catch { return null }
}

// 무장애 여행 정보(detailWithTour2)로 접근성 등급 보강
export async function fetchAccessGrade(contentid) {
  try {
    const [it] = await tourCall('detailWithTour2', { contentId: contentid }, 'barrier-free')
    if (!it) return null
    const has = k => clean(it[k]).length > 0
    if (has('wheelchair')) return 'available'
    if (['restroom', 'parking', 'elevator', 'stroller', 'lactationroom'].some(has)) return 'partial'
    return null
  } catch { return null }
}
