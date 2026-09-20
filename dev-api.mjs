// 로컬 개발용 API 서버 (vercel dev 대신 사용)
// 실행: node dev-api.mjs
// Vite(5173)에서 /api/* 요청이 이 서버(3001)로 프록시됨

import http from 'http'
import { readFileSync } from 'fs'
import { URL } from 'url'
import kakaoHandler from './api/kakao.js'
import courseHandler from './api/course.js'
import directionsHandler from './api/directions.js'

// .env 파일에서 환경변수 로드
try {
  const env = readFileSync('.env', 'utf8')
  env.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) return
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    process.env[key] ??= val
  })
} catch {}

const PORT = 3001
const FCST_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]

function getBaseDateTime() {
  const pad = n => String(n).padStart(2, '0')
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const hour = kst.getUTCHours()
  const minute = kst.getUTCMinutes()
  const currentMinutes = hour * 60 + minute
  let baseHour = null
  for (let i = FCST_HOURS.length - 1; i >= 0; i--) {
    if (FCST_HOURS[i] * 60 + 10 <= currentMinutes) { baseHour = FCST_HOURS[i]; break }
  }
  if (baseHour === null) {
    const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000)
    return {
      baseDate: `${prev.getUTCFullYear()}${pad(prev.getUTCMonth() + 1)}${pad(prev.getUTCDate())}`,
      baseTime: '2300',
    }
  }
  return {
    baseDate: `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}`,
    baseTime: `${pad(baseHour)}00`,
  }
}

async function handleWeather(req, res, searchParams) {
  const nx = searchParams.get('nx')
  const ny = searchParams.get('ny')
  const serviceKey = process.env.WEATHER_API_KEY

  if (!serviceKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'WEATHER_API_KEY not configured' }))
  }

  const { baseDate, baseTime } = getBaseDateTime()
  const url = new URL('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst')
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', '100')
  url.searchParams.set('dataType', 'JSON')
  url.searchParams.set('base_date', baseDate)
  url.searchParams.set('base_time', baseTime)
  url.searchParams.set('nx', nx)
  url.searchParams.set('ny', ny)

  try {
    const apiRes = await fetch(url.toString())
    const data = await apiRes.json()
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' })
    res.end(JSON.stringify(data))
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: '기상청 API 호출 실패', detail: err.message }))
  }
}

async function handleTour(req, res, searchParams) {
  const endpoint = searchParams.get('endpoint')
  const base = searchParams.get('base') || 'default'
  const serviceKey = process.env.TOUR_API_KEY
  const BASES = {
    default: 'https://apis.data.go.kr/B551011/KorService2',
    'barrier-free': 'https://apis.data.go.kr/B551011/KorWithService2',
  }
  const url = new URL(`${BASES[base] || BASES.default}/${endpoint}`)
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('MobileOS', 'ETC')
  url.searchParams.set('MobileApp', 'Freeway')
  url.searchParams.set('_type', 'json')
  searchParams.forEach((v, k) => {
    if (k !== 'endpoint' && k !== 'base') url.searchParams.set(k, v)
  })
  try {
    const apiRes = await fetch(url.toString())
    const data = await apiRes.json()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'TourAPI 호출 실패', detail: err.message }))
  }
}

// Vercel 서버리스 함수(api/*.js)를 그대로 재사용하는 어댑터 — req.query / req.body / res.status().json() 형태로 맞춰 호출
// (로컬과 배포 환경의 동작이 항상 같도록 kakao/course/directions는 핸들러를 복제하지 않고 직접 import해서 씀)
async function runVercelHandler(handler, req, res, searchParams) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  let body
  try { body = raw ? JSON.parse(raw) : undefined } catch { body = undefined }

  const vreq = { method: req.method, query: Object.fromEntries(searchParams), body, headers: req.headers }
  const vres = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    setHeader(k, v) { res.setHeader(k, v); return this },
    json(obj) {
      res.writeHead(this.statusCode, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(obj))
    },
  }
  try {
    await handler(vreq, vres)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: '핸들러 실행 오류', detail: err.message }))
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const parsed = new URL(req.url, `http://localhost:${PORT}`)
  const path = parsed.pathname
  const params = parsed.searchParams

  if (path === '/api/weather') return handleWeather(req, res, params)
  if (path === '/api/tour') return handleTour(req, res, params)
  if (path === '/api/kakao') return runVercelHandler(kakaoHandler, req, res, params)
  if (path === '/api/course') return runVercelHandler(courseHandler, req, res, params)
  if (path === '/api/directions') return runVercelHandler(directionsHandler, req, res, params)

  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`✅ 로컬 API 서버 실행 중: http://localhost:${PORT}`)
  console.log(`   WEATHER_API_KEY: ${process.env.WEATHER_API_KEY ? '✓ 설정됨' : '✗ 없음'}`)
  console.log(`   TOUR_API_KEY:    ${process.env.TOUR_API_KEY ? '✓ 설정됨' : '✗ 없음'}`)
  console.log(`   KAKAO_REST_KEY:  ${process.env.KAKAO_REST_KEY ? '✓ 설정됨' : '✗ 없음'}`)
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ 설정됨' : '✗ 없음 (AI 코스는 규칙 기반으로 대체)'}`)
})
