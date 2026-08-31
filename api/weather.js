// Vercel Serverless Function — 기상청 단기예보 API 프록시
// 브라우저 → /api/weather?nx=&ny= → 이 함수 → apis.data.go.kr
// API 키는 Vercel 환경변수(WEATHER_API_KEY)에서 읽으므로 브라우저에 노출되지 않음

const BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0'

// 단기예보 발표 시각: 02, 05, 08, 11, 14, 17, 20, 23시 (발표 후 10분 뒤 조회 가능)
const FCST_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]

function getBaseDateTime() {
  const pad = n => String(n).padStart(2, '0')
  const now = new Date()
  // 기상청 API는 한국 표준시(UTC+9) 기준
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)

  const year = kst.getUTCFullYear()
  const month = pad(kst.getUTCMonth() + 1)
  const day = pad(kst.getUTCDate())
  const hour = kst.getUTCHours()
  const minute = kst.getUTCMinutes()
  const currentMinutes = hour * 60 + minute

  // 10분 여유를 두고 가장 최근 발표 시각 선택
  let baseHour = null
  for (let i = FCST_HOURS.length - 1; i >= 0; i--) {
    if (FCST_HOURS[i] * 60 + 10 <= currentMinutes) {
      baseHour = FCST_HOURS[i]
      break
    }
  }

  if (baseHour === null) {
    // 당일 02:10 이전 → 전날 23:00 예보 사용
    const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000)
    return {
      baseDate: `${prev.getUTCFullYear()}${pad(prev.getUTCMonth() + 1)}${pad(prev.getUTCDate())}`,
      baseTime: '2300',
    }
  }

  return {
    baseDate: `${year}${month}${day}`,
    baseTime: `${pad(baseHour)}00`,
  }
}

export default async function handler(req, res) {
  const { nx, ny } = req.query
  const serviceKey = process.env.WEATHER_API_KEY

  if (!serviceKey) {
    return res.status(500).json({ error: 'WEATHER_API_KEY not configured' })
  }
  if (!nx || !ny) {
    return res.status(400).json({ error: 'nx, ny 파라미터가 필요합니다' })
  }

  const { baseDate, baseTime } = getBaseDateTime()

  const url = new URL(`${BASE_URL}/getVilageFcst`)
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
    // 30분 캐시 (기상청 단기예보는 1시간 단위로 갱신)
    res.setHeader('Cache-Control', 'public, max-age=1800')
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: '기상청 API 호출 실패', detail: err.message })
  }
}
