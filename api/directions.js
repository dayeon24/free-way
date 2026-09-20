// Vercel Serverless Function — 카카오모빌리티 길찾기(자동차) 프록시
// 브라우저 → /api/directions?ox=&oy=&dx=&dy= → 이 함수 → apis-navi.kakaomobility.com
// REST 키는 Vercel 환경변수(KAKAO_REST_KEY)에서 읽으므로 브라우저에 노출되지 않음
//
// 주의: 카카오 길찾기 API는 "자동차" 경로만 제공하고 대중교통/도보 모드는 없다.
// 그래서 개인 차량 이동만 이 API를 쓰고, 대중교통·새빛콜·도보는 프론트에서 거리 기반으로 추정한다.
// (카카오 개발자 콘솔에서 카카오모빌리티 길찾기 API 사용 설정이 안 되어 있으면 503/에러 → 프론트가 추정값으로 대체)

export default async function handler(req, res) {
  const { ox, oy, dx, dy } = req.query

  if (![ox, oy, dx, dy].every(v => v && !Number.isNaN(Number(v)))) {
    return res.status(400).json({ error: 'ox, oy, dx, dy (경도/위도) 파라미터가 필요합니다' })
  }
  if (!process.env.KAKAO_REST_KEY) {
    return res.status(503).json({ error: 'KAKAO_REST_KEY not configured' })
  }

  const url = new URL('https://apis-navi.kakaomobility.com/v1/directions')
  url.searchParams.set('origin', `${ox},${oy}`)
  url.searchParams.set('destination', `${dx},${dy}`)
  url.searchParams.set('priority', 'RECOMMEND')

  try {
    const apiRes = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}` },
    })
    if (!apiRes.ok) return res.status(apiRes.status).json({ error: `길찾기 API 오류 (${apiRes.status})` })
    const data = await apiRes.json()
    const summary = data?.routes?.[0]?.summary
    if (!summary) return res.status(404).json({ error: '경로를 찾지 못했어요' })
    // 30분 캐시 (같은 두 지점 반복 조회 방지)
    res.setHeader('Cache-Control', 'public, max-age=1800')
    return res.status(200).json({ distance: summary.distance, duration: summary.duration }) // m, 초
  } catch (err) {
    return res.status(500).json({ error: '길찾기 API 호출 실패', detail: err.message })
  }
}
