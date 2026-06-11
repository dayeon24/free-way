/**
 * 무장애 정보 인덱스 빌드 스크립트
 * 실행: node scripts/build-barrier-index.js
 * 결과: public/barrier-free-index.json
 *
 * 광주(areaCode=5) + 전남(areaCode=46) 전체 관광지/문화시설 수집 후
 * 각 contentId의 무장애 필드를 조회해 JSON으로 저장
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// .env에서 키 읽기
const envPath = path.resolve(__dirname, '../.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const API_KEY = envContent.match(/VITE_TOUR_API_KEY=(.+)/)?.[1]?.trim()

if (!API_KEY) {
  console.error('❌ VITE_TOUR_API_KEY가 .env에 없습니다.')
  process.exit(1)
}

const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2'
const BARRIER_URL = 'https://apis.data.go.kr/B551011/KorWithService2'

// 무장애 아이콘에 쓸 6개 필드
const BARRIER_FIELDS = ['wheelchair', 'restroom', 'parking', 'elevator', 'stroller', 'lactationroom']

// 무장애 정보가 있는 콘텐츠 타입만
const CONTENT_TYPES = [12, 14, 28, 32, 38, 39] // 여행코스/축제 제외

const AREA_CODES = [5, 38] // 광주, 전남

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchJson(url, params) {
  const u = new URL(url)
  u.searchParams.set('serviceKey', API_KEY)
  u.searchParams.set('MobileOS', 'ETC')
  u.searchParams.set('MobileApp', 'Freeway')
  u.searchParams.set('_type', 'json')
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)))

  const res = await fetch(u.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// 지역+타입별 전체 contentId 수집
async function collectContentIds(areaCode, contentTypeId) {
  const ids = []
  let pageNo = 1
  const numOfRows = 100

  while (true) {
    const data = await fetchJson(`${BASE_URL}/areaBasedList2`, {
      areaCode, contentTypeId, numOfRows, pageNo, arrange: 'A',
    })
    const body = data?.response?.body
    const items = body?.items?.item
    if (!items) break

    const batch = [items].flat()
    batch.forEach(item => ids.push(item.contentid))

    const total = parseInt(body.totalCount || 0)
    if (pageNo * numOfRows >= total) break
    pageNo++
    await sleep(200)
  }

  return ids
}

// 무장애 상세 조회 (단건)
async function fetchBarrierDetail(contentId) {
  try {
    const data = await fetchJson(`${BARRIER_URL}/detailWithTour2`, { contentId })
    const item = data?.response?.body?.items?.item
    if (!item) return null
    const d = [item].flat()[0]

    // 값 있는 필드만 배열로
    const available = BARRIER_FIELDS.filter(f => d[f] && d[f].trim() !== '')
    return available.length > 0 ? available : null
  } catch {
    return null
  }
}

async function main() {
  console.log('🚀 무장애 인덱스 빌드 시작')
  console.log(`📍 대상: 광주(5) + 전남(38) / 타입: ${CONTENT_TYPES.join(', ')}`)

  // 1단계: 전체 contentId 수집
  const allIds = new Set()
  for (const areaCode of AREA_CODES) {
    for (const typeId of CONTENT_TYPES) {
      process.stdout.write(`  수집 중: areaCode=${areaCode}, type=${typeId}... `)
      const ids = await collectContentIds(areaCode, typeId)
      ids.forEach(id => allIds.add(id))
      console.log(`${ids.length}건`)
      await sleep(300)
    }
  }

  const idList = [...allIds]
  console.log(`\n📦 총 ${idList.length}개 장소 수집 완료`)
  console.log('♿ 무장애 정보 조회 시작 (5개씩 배치)...\n')

  // 2단계: 무장애 정보 배치 조회
  const index = {}
  const BATCH = 5
  let done = 0
  let withBarrier = 0

  for (let i = 0; i < idList.length; i += BATCH) {
    const batch = idList.slice(i, i + BATCH)
    await Promise.all(batch.map(async (id) => {
      const result = await fetchBarrierDetail(id)
      if (result) {
        index[id] = result
        withBarrier++
      }
      done++
    }))

    // 진행률
    const pct = Math.round((done / idList.length) * 100)
    process.stdout.write(`\r  진행: ${done}/${idList.length} (${pct}%) | 무장애 ${withBarrier}건`)
    await sleep(150)
  }

  console.log('\n')

  // 3단계: JSON 저장
  const outPath = path.resolve(__dirname, '../public/barrier-free-index.json')
  fs.writeFileSync(outPath, JSON.stringify({
    _meta: {
      builtAt: new Date().toISOString(),
      totalPlaces: idList.length,
      withBarrierInfo: withBarrier,
      fields: BARRIER_FIELDS,
    },
    data: index,
  }, null, 2))

  console.log(`✅ 완료! public/barrier-free-index.json 생성`)
  console.log(`   총 ${idList.length}곳 중 무장애 정보 ${withBarrier}곳`)
}

main().catch(console.error)
