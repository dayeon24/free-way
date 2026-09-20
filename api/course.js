// Vercel Serverless Function — AI 코스 생성 (Claude API)
// 브라우저 → POST /api/course → 이 함수 → Anthropic API
// API 키는 Vercel 환경변수(ANTHROPIC_API_KEY)에서 읽으므로 브라우저에 노출되지 않음
//
// 역할 분담: 후보 장소(TourAPI + 무장애 정보)는 프론트가 모아서 보내고, Claude는 "그 후보들 중에서" 선택·정렬만 한다.
// (없는 장소를 지어내지 못하도록 id는 반드시 후보 목록에서만 고르게 하고, 프론트가 다시 검증한다.)
// 키가 없거나 호출이 실패하면 프론트가 규칙 기반 생성기로 대체한다.

import Anthropic from '@anthropic-ai/sdk'

// 기본 모델은 Opus 5. 비용/속도 때문에 바꾸고 싶으면 Vercel 환경변수 ANTHROPIC_MODEL로 지정
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5'

const SYSTEM = `당신은 광주·전남 무장애(배리어프리) 여행 코스 플래너입니다.
입력(JSON)의 candidates 중에서만 장소를 골라 일정 코스를 만들어 주세요.

규칙:
- id는 반드시 candidates에 있는 값만 사용합니다. 후보에 없는 장소를 만들어내지 마세요.
- slotPlan[일차-1][순번]은 슬롯 종류입니다. place=관광지(type 12)·문화시설(type 14), meal=음식점(type 39), stay=숙박(type 32). 각 슬롯에는 그 종류에 맞는 후보를 배정하세요.
- 같은 장소를 두 번 쓰지 마세요(일차가 달라도 마찬가지).
- options.startPoint에서 출발해 가까운 곳부터 이어지도록 동선을 짜고, 하루 이동 거리(직선거리 합)는 options.budgetKm 이하가 되게 하세요.
- conditions.travelerType이 wheelchair, stroller, senior이면 grade가 available인 후보를 우선하고, partial은 그다음, unknown은 다른 후보가 없을 때만 고르세요. unknown을 골랐다면 reason에 "접근성 정보 확인 필요"라고 정직하게 적으세요.
- options.indoorPreferred가 true이면 실내에서 즐길 수 있는 곳(문화시설·음식점 등)을 우선하세요.
- 접근성이 확인되지 않은 장소를 "접근 가능"하다고 단정하지 마세요.

출력은 아래 JSON 한 개만, 설명 문장이나 마크다운 코드블록 없이 출력하세요.
{"title":"코스 제목(25자 이내)","summary":"한 줄 요약(40자 이내)","days":[{"day":1,"items":[{"slot":0,"id":"후보 id","reason":"선정 이유(30자 이내)"}]}]}`

function extractJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('JSON 응답을 찾지 못했어요')
  return JSON.parse(trimmed.slice(start, end + 1))
}

// 화면(RequireAuth)은 로그인 안 된 사람을 /course, /course/ai에서 막아주지만,
// /course/share/:shareId(공유 링크, 로그인 게이트 예외)에서도 "재생성" 버튼으로 이 엔드포인트를 탈 수 있고,
// 애초에 이 주소 자체는 로그인 여부와 무관하게 누구나 직접 호출할 수 있는 공개 URL이라
// 서버에서도 Firebase 로그인 토큰을 직접 검증해야 진짜로 막힘 (비용 남용 방지).
// firebase-admin 없이, 이미 클라이언트에 공개된 Firebase 웹 API 키로 토큰 유효성만 확인.
async function verifyIdToken(idToken) {
  const apiKey = process.env.VITE_FIREBASE_API_KEY
  if (!apiKey || !idToken) return false
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    return Array.isArray(data.users) && data.users.length > 0
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 지원합니다' })
  }

  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!(await verifyIdToken(idToken))) {
    // 프론트는 이 응답도 규칙 기반 생성기로 조용히 대체 (비로그인 사용자는 애초에 이 요청 자체를 안 보냄)
    return res.status(401).json({ error: '로그인이 필요합니다' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // 프론트는 이 응답을 받으면 규칙 기반 생성기로 대체
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const { conditions, slotPlan, candidates, options } = req.body || {}
  if (!conditions || !Array.isArray(slotPlan) || !Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: 'conditions, slotPlan, candidates 가 필요합니다' })
  }
  if (candidates.length > 120) {
    return res.status(400).json({ error: '후보가 너무 많습니다 (최대 120)' })
  }

  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 })

  try {
    // fallbacks: 안전 분류기가 요청을 거절하면 서버에서 권장 대체 모델로 자동 재실행 (Opus 5 권장 옵션)
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify({ conditions, slotPlan, candidates, options }) }],
    })

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'AI가 요청을 처리하지 못했어요' })
    }
    if (response.stop_reason === 'max_tokens') {
      return res.status(502).json({ error: 'AI 응답이 길어 중간에 끊겼어요' })
    }

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
    const plan = extractJson(text)
    return res.status(200).json({ plan, model: response.model })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'AI 요청이 몰리고 있어요. 잠시 후 다시 시도해주세요' })
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `AI 호출 실패 (${err.status})` })
    }
    return res.status(500).json({ error: 'AI 응답을 해석하지 못했어요', detail: err.message })
  }
}
