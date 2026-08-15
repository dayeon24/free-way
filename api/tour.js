// Vercel Serverless Function — 관광공사 API 프록시
// 브라우저 → /api/tour → 이 함수 → apis.data.go.kr
// API 키는 Vercel 환경변수(TOUR_API_KEY)에서 읽으므로 브라우저에 노출되지 않음

const BASES = {
  default: 'https://apis.data.go.kr/B551011/KorService2',
  'barrier-free': 'https://apis.data.go.kr/B551011/KorWithService2',
}

export default async function handler(req, res) {
  const { endpoint, base, ...params } = req.query

  if (!endpoint) {
    return res.status(400).json({ error: 'endpoint 파라미터가 필요합니다' })
  }

  const baseUrl = BASES[base] || BASES.default
  const url = new URL(`${baseUrl}/${endpoint}`)

  // 서버에서만 키를 붙임
  url.searchParams.set('serviceKey', process.env.TOUR_API_KEY)
  url.searchParams.set('MobileOS', 'ETC')
  url.searchParams.set('MobileApp', 'Freeway')
  url.searchParams.set('_type', 'json')

  // 프론트에서 보낸 나머지 파라미터 전달
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  try {
    const apiRes = await fetch(url.toString())
    const data = await apiRes.json()
    res.status(apiRes.status).json(data)
  } catch (err) {
    res.status(500).json({ error: '관광공사 API 호출 실패', detail: err.message })
  }
}
