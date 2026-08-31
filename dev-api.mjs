// 로컬 개발용 API 서버 (vercel dev 대신 사용)
// 실행: node dev-api.mjs
// Vite(5173)에서 /api/* 요청이 이 서버(3001)로 프록시됨

import http from 'http'
import { readFileSync } from 'fs'
import { URL } from 'url'

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

async function handleKakao(req, res, searchParams) {
  const query = searchParams.get('query')
  const x = searchParams.get('x')
  const y = searchParams.get('y')
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  if (x) url.searchParams.set('x', x)
  if (y) url.searchParams.set('y', y)
  url.searchParams.set('radius', '500')
  url.searchParams.set('size', '1')
  try {
    const apiRes = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}` },
    })
    const data = await apiRes.json()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Kakao API 호출 실패', detail: err.message }))
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const parsed = new URL(req.url, `http://localhost:${PORT}`)
  const path = parsed.pathname
  const params = parsed.searchParams

  if (path === '/api/weather') return handleWeather(req, res, params)
  if (path === '/api/tour') return handleTour(req, res, params)
  if (path === '/api/kakao') return handleKakao(req, res, params)

  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`✅ 로컬 API 서버 실행 중: http://localhost:${PORT}`)
  console.log(`   WEATHER_API_KEY: ${process.env.WEATHER_API_KEY ? '✓ 설정됨' : '✗ 없음'}`)
  console.log(`   TOUR_API_KEY:    ${process.env.TOUR_API_KEY ? '✓ 설정됨' : '✗ 없음'}`)
})
