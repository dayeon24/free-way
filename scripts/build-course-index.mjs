// 광주·전남 여행코스 정적 데이터 생성 스크립트 (코스탭 "추천 코스" 목록/상세용)
//
// 실행 방법 (로컬 API 서버가 켜져 있어야 함):
//   1) node dev-api.mjs            (TOUR_API_KEY 필요 - .env)
//   2) node scripts/build-course-index.mjs
// 결과: public/tour-courses.json
//
// 왜 정적 파일인가: 관광공사 여행코스는 광주(areaCode=5) 0건, 전남(38) 3건뿐이라 키워드 검색으로 모아야 하는데,
// 코스 1개당 API를 수십 번 호출해야 해서 앱에서 실시간으로 모으면 느리고 불안정함 (barrier-free-index.json과 같은 방식).

import { writeFileSync } from 'fs'

const API = process.env.API_BASE || 'http://localhost:3001'
const KEYWORDS = ['광주', '전남', '담양', '순천', '여수', '목포', '나주', '함평', '보성', '구례', '곡성', '화순', '장성', '영광', '해남', '완도', '강진', '무안', '영암', '신안', '고흥']
const MAX_COURSES = 24
// 광주·전남 대략적인 좌표 범위 (경기도 광주 등 동명 지역 오탐 제거)
const BBOX = { minLat: 34.0, maxLat: 35.6, minLng: 125.8, maxLng: 127.9 }

const sleep = ms => new Promise(r => setTimeout(r, ms))

// 관광공사 API는 초당 호출 제한이 있어서(초과 시 LIMITED_NUMBER_OF_SERVICE_REQUESTS_PER_SECOND_EXCEEDS_ERROR)
// 전역으로 호출 간격을 두고, 제한 에러가 오면 잠시 쉬었다가 재시도
let lastCall = 0
async function throttle(gap = 260) {
  const wait = Math.max(0, lastCall + gap - Date.now())
  lastCall = Date.now() + wait
  if (wait) await sleep(wait)
}

async function tour(endpoint, params = {}) {
  const u = new URL('/api/tour', API)
  u.searchParams.set('endpoint', endpoint)
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)))
  for (let attempt = 0; attempt < 8; attempt++) {
    await throttle()
    try {
      const j = await (await fetch(u)).json()
      if (j?.OpenAPI_ServiceResponse) { await sleep(1500); continue } // 초당 호출 제한
      const body = j?.response?.body
      if (j?.response?.header?.resultCode !== '0000') return []
      return body?.items?.item ? [body.items.item].flat() : []
    } catch {
      await sleep(600)
    }
  }
  return []
}

async function pool(items, size, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx], idx)
    }
  }))
  return out
}

const clean = s => (s || '').replace(/<[^>]*>/g, ' ').replace(/\\n|\n/g, ' ').replace(/\s+/g, ' ').trim()

// 콘텐츠 타입별 운영시간/휴무일 필드 (detailIntro2)
const INTRO_FIELDS = {
  12: ['usetime', 'restdate'],
  14: ['usetimeculture', 'restdateculture'],
  28: ['usetimeleports', 'restdateleports'],
  38: ['opentime', 'restdateshopping'],
  39: ['opentimefood', 'restdatefood'],
}

function regionOf(addr) {
  const a = (addr || '').replace(/^(전남광주통합특별시|광주광역시|전라남도|전남)\s*/, '').trim()
  const m = a.match(/^(\S+?)([시군구])(?:\s|$)/)
  if (!m) return null
  const isGwangju = m[2] === '구' || /^광주/.test(addr || '')
  return isGwangju ? `광주 ${m[1]}${m[2]}` : `전남 ${m[1]}`
}

function categoryOf(title, overview, lcls2) {
  if (/역사|문화|유적|근대|예술|한옥|고택|사찰|서원|박물관|기행|유산|전통/.test(`${title} ${overview}`)) return 'culture'
  if (lcls2 === 'C0112' || lcls2 === 'C0113' || lcls2 === 'C0117') return 'activity'
  if (/체험|축제|놀이|레포츠|트레일|열차|자전거/.test(`${title} ${overview}`)) return 'activity'
  return 'nature'
}

async function main() {
  console.log('1) 코스 후보 수집...')
  const ids = new Map()
  for (const a of [5, 38]) {
    for (const it of await tour('areaBasedList2', { contentTypeId: 25, areaCode: a, numOfRows: 50, pageNo: 1, arrange: 'A' })) ids.set(it.contentid, it.title)
  }
  await pool(KEYWORDS, 4, async kw => {
    for (const it of await tour('searchKeyword2', { keyword: kw, contentTypeId: 25, numOfRows: 40, pageNo: 1, arrange: 'A' })) ids.set(it.contentid, it.title)
  })
  console.log(`   후보 ${ids.size}건`)

  console.log('2) 좌표로 광주·전남 코스만 선별...')
  const commons = await pool([...ids.keys()], 6, async id => {
    const [c] = await tour('detailCommon2', { contentId: id })
    return c
  })
  const inRegion = commons.filter(c => {
    if (!c) return false
    const lat = parseFloat(c.mapy), lng = parseFloat(c.mapx)
    return lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLng && lng <= BBOX.maxLng
  })
  console.log(`   지역 내 ${inRegion.length}건`)

  console.log('3) 경유지/소개 정보 수집...')
  const courses = []
  await pool(inRegion.slice(0, 60), 3, async c => {
    if (courses.length >= MAX_COURSES) return
    const [intro] = await tour('detailIntro2', { contentId: c.contentid, contentTypeId: 25 })
    const subs = (await tour('detailInfo2', { contentId: c.contentid, contentTypeId: 25 }))
      .filter(s => s.subcontentid).sort((a, b) => Number(a.subnum) - Number(b.subnum))

    const places = []
    for (const s of subs) {
      const [pc] = await tour('detailCommon2', { contentId: s.subcontentid })
      if (!pc || !pc.mapx || !pc.mapy) continue
      const type = Number(pc.contenttypeid)
      let openTime = '', restDate = ''
      const f = INTRO_FIELDS[type]
      if (f) {
        const [pi] = await tour('detailIntro2', { contentId: s.subcontentid, contentTypeId: type })
        if (pi) { openTime = clean(pi[f[0]]); restDate = clean(pi[f[1]]) }
      }
      places.push({
        id: pc.contentid, name: clean(pc.title) || clean(s.subname), type,
        x: parseFloat(pc.mapx), y: parseFloat(pc.mapy), addr: clean(pc.addr1),
        image: pc.firstimage || s.subdetailimg || '', openTime, restDate,
      })
    }
    if (places.length < 2) return

    const region = regionOf(places.find(p => p.addr)?.addr) || regionOf(c.addr1) || '전남'
    courses.push({
      id: c.contentid,
      title: clean(c.title),
      category: categoryOf(c.title, c.overview || '', c.lclsSystm2),
      region,
      image: c.firstimage || places.find(p => p.image)?.image || '',
      center: { x: parseFloat(c.mapx), y: parseFloat(c.mapy) },
      distance: clean(intro?.distance),
      takeTime: clean(intro?.taketime),
      overview: clean(c.overview).slice(0, 140),
      places,
    })
    process.stdout.write(`\r   수집 ${courses.length}/${MAX_COURSES}`)
  })
  console.log()

  courses.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  const out = { _meta: { builtAt: new Date().toISOString(), count: courses.length }, courses }
  writeFileSync('public/tour-courses.json', JSON.stringify(out))
  console.log(`✅ public/tour-courses.json 저장 (${courses.length}개 코스, 장소 ${courses.reduce((n, c) => n + c.places.length, 0)}곳)`)
}

main().catch(e => { console.error(e); process.exit(1) })
