// tour-courses.json 의 장소마다 "무장애 여행 정보(KorWithService2 detailWithTour2)" 등급을 미리 채워 넣는 스크립트
//
// 실행 방법 (로컬 API 서버가 켜져 있어야 함):
//   1) node dev-api.mjs
//   2) node scripts/enrich-course-access.mjs
// 결과: public/tour-courses.json 의 각 place.access = { grade: 'available'|'partial', tags, note } (정보 없으면 필드 없음)
//
// 왜 미리 넣는가: barrier-free-index.json 에는 코스 장소 106곳 중 11곳만 있는데, 실제 API에는 훨씬 많음.
// 화면에서 하나씩 조회하면 "확인 필요"로 먼저 보였다가 뒤늦게 바뀌므로 등급을 데이터에 미리 넣어 둠.
// 등급 기준: src/utils/accessGrade.js (출입구 경로/주출입구 문장 기준 — wheelchair 필드는 "휠체어 대여"라 등급 기준이 아님)

import { readFileSync, writeFileSync } from 'fs'
import { classifyAccess } from '../src/utils/accessGrade.js'

const API = process.env.API_BASE || 'http://localhost:3001'
const FILE = 'public/tour-courses.json'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function detail(contentId) {
  const u = new URL('/api/tour', API)
  u.searchParams.set('endpoint', 'detailWithTour2')
  u.searchParams.set('base', 'barrier-free')
  u.searchParams.set('contentId', contentId)
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const j = await (await fetch(u)).json()
      if (j?.OpenAPI_ServiceResponse) { await sleep(1500); continue } // 초당 호출 제한
      if (j?.response?.header?.resultCode !== '0000') return null
      const item = j.response.body?.items?.item
      return item ? [item].flat()[0] : null
    } catch { await sleep(600) }
  }
  return null
}

const data = JSON.parse(readFileSync(FILE, 'utf8'))
const cache = new Map()
let graded = 0
for (const course of data.courses) {
  for (const p of course.places) {
    const id = String(p.id)
    if (!cache.has(id)) {
      cache.set(id, classifyAccess(await detail(id)))
      await sleep(280)
    }
    const g = cache.get(id)
    if (g) { p.access = g; graded++ } else delete p.access
  }
}
writeFileSync(FILE, JSON.stringify(data))
const vals = [...cache.values()]
console.log(`장소 ${cache.size}곳 — 적합 ${vals.filter(v => v?.grade === 'available').length} / 일부 가능 ${vals.filter(v => v?.grade === 'partial').length} / 정보 없음 ${vals.filter(v => !v).length} (코스 내 등급 표시 ${graded}건)`)
