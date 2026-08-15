// Vercel Serverless Function — 카카오 Local API 프록시
// 브라우저 → /api/kakao → 이 함수 → dapi.kakao.com
// REST 키는 Vercel 환경변수(KAKAO_REST_KEY)에서 읽으므로 브라우저에 노출되지 않음

export default async function handler(req, res) {
  const { keyword, x, y } = req.query

  if (!keyword) {
    return res.status(400).json({ error: 'keyword 파라미터가 필요합니다' })
  }

  if (!process.env.KAKAO_REST_KEY) {
    return res.status(200).json({ documents: [] })
  }

  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', keyword)
  if (x && y) {
    url.searchParams.set('x', x)
    url.searchParams.set('y', y)
    url.searchParams.set('radius', '500')
    url.searchParams.set('sort', 'distance')
  }

  try {
    const apiRes = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}` },
    })
    const data = await apiRes.json()
    res.status(apiRes.status).json(data)
  } catch (err) {
    res.status(500).json({ error: '카카오 API 호출 실패', detail: err.message })
  }
}
