// 무장애 여행 정보(KorWithService2 detailWithTour2) 한 건 → 접근성 등급/태그/안내 문구
// (화면과 scripts/enrich-course-access.mjs 가 같이 쓰므로 의존성 없는 순수 함수로 둠)
//
// ⚠ 필드 뜻 주의: wheelchair 는 "휠체어 대여" 정보이지 출입 가능 여부가 아님.
//   출입 가능 여부는 route(출입구까지 경로) / exit(주출입구) 문장에 들어 있음.
//   예) route: "출입구까지 턱이 없어 휠체어 접근 가능함", exit: "주출입구는 경사로가 있어 휠체어 접근 가능함"

const text = v => String(v ?? '').replace(/\s+/g, ' ').trim()

const POSITIVE = /휠체어[^.,()]{0,8}(접근|출입|이동|통과|탑승)[^.,()]{0,4}가능|턱이 없|턱 없|단차\s*(가\s*)?(없|이 없)|단차없|경사가 없|경사로|이동하기 편리/
const NEGATIVE = /계단(으로|이 있|만)|불가|턱이 있|우회/

// → { grade: 'available' | 'partial', tags: string[], note: string|null } | null (정보 없음)
export function classifyAccess(it) {
  if (!it) return null
  const route = text(it.route), exit = text(it.exit)
  const entry = `${route} ${exit}`.trim()
  const has = k => text(it[k]).length > 0

  const tags = []
  const positive = POSITIVE.test(entry)
  const negative = NEGATIVE.test(entry)
  if (positive && !negative) {
    tags.push(/턱|단차/.test(entry) && !/경사로/.test(entry) ? '출입구 턱·단차 없음' : /경사로/.test(entry) ? '경사로' : '휠체어 접근 가능')
  }
  if (has('elevator')) tags.push('엘리베이터')
  if (has('restroom')) tags.push('장애인 화장실')
  if (has('parking')) tags.push('장애인 주차')
  if (has('wheelchair')) tags.push('휠체어 대여')
  if (has('braileblock')) tags.push('점자블록')

  if (positive && !negative) return { grade: 'available', tags, note: null }
  if (negative) return { grade: 'partial', tags, note: '출입구에 계단·턱이 있어요. 접근 방법을 확인하세요' }
  if (tags.length || entry) return { grade: 'partial', tags, note: '출입구 접근 정보가 등록되지 않았어요. 방문 전 확인하세요' }
  return null
}
