import { WRITE_COLORS as C } from '../utils/constants'
import { TEAL } from '../utils/courseApi'
import { CategoryBadge, CourseThumb, PlacePill, HeartIcon, ArrowIcon, Toast } from './CourseParts'
import AiCourseSheet from './AiCourseSheet_front'

/**
 * CoursePage (FRONT) - 외견/UI 담당 (코스 탭 메인)
 *
 * back에서 받는 데이터: courses, loading, loadError, likes, weatherBanner, sheetOpen, conditions,
 *                      generating, genError, canGenerate, toast
 * back에서 받는 함수: onOpenSheet, onCloseSheet, onSelectCondition, onGenerate, onOpenCourse,
 *                    onPlaceClick, onWeatherClick, onRetry
 */

// 코스 제목 10자 초과 시 말줄임표 (기획서 "코스 제목")
// 핵심 장소 pill용 — 관광지/문화시설/레포츠 우선으로 2곳
function keyPlaces(course) {
  const main = course.places.filter(p => [12, 14, 28].includes(p.type))
  return (main.length >= 2 ? main : course.places).slice(0, 2)
}

function CourseCard({ course, likeCount, onOpen, onPlaceClick }) {
  return (
    <div
      role="link" tabIndex={0} aria-label={`${course.title} 코스 상세 보기`}
      onClick={() => onOpen(course.id)}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(course.id) }}
      style={{ display: 'flex', background: 'white', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.line}`, marginBottom: 10, cursor: 'pointer', minHeight: 124 }}
    >
      <div style={{ width: 104, flexShrink: 0, alignSelf: 'stretch', display: 'flex' }}>
        <div style={{ width: '100%', overflow: 'hidden' }}>
          <CourseThumb course={course} size={104} />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '11px 12px', display: 'flex', flexDirection: 'column' }}>
        <div><CategoryBadge category={course.category} /></div>
        <p style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, margin: '6px 0 7px', lineHeight: 1.35, wordBreak: 'keep-all' }}>{course.title}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {keyPlaces(course).map(p => <PlacePill key={p.id} name={p.name.length > 9 ? `${p.name.slice(0, 9)}…` : p.name} onClick={() => onPlaceClick(p.name)} />)}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: C.inkSoft }}>{course.region}</span>
          <span aria-label={`좋아요 ${likeCount}개`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: C.inkSoft }}>
            <HeartIcon size={13} /> {likeCount}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function CoursePageFront({
  courses, loading, loadError, likes, weatherBanner, sheetOpen, myConditions, conditions, generating, genError, canGenerate, toast,
  onOpenSheet, onCloseSheet, onSelectCondition, onGenerate, onOpenCourse, onPlaceClick, onWeatherClick, onRetry,
}) {
  return (
    <div style={{ background: '#F6F7F3', minHeight: '100%' }}>
      {/* SCROLL ① 날씨 알림 배너 (악천후일 때만) */}
      {weatherBanner && (
        <button
          type="button" onClick={onWeatherClick} aria-label={`${weatherBanner} 날씨 화면으로 이동`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', background: '#FBF0DC', padding: '10px 16px', cursor: 'pointer', textAlign: 'left', minHeight: 44 }}
        >
          <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, color: '#8C5300', background: 'rgba(255,255,255,0.65)', padding: '3px 8px', borderRadius: 12 }}>🌧 날씨</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: '#5A4321', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{weatherBanner}</span>
          <span style={{ color: '#8C5300' }}><ArrowIcon size={16} /></span>
        </button>
      )}

      {/* SCROLL ② 탭 소개 항목 — 탭하면 AI 코스 생성 바텀시트 */}
      <button
        type="button" onClick={onOpenSheet} aria-label="AI 코스 만들기 열기"
        style={{
          position: 'relative', display: 'block', width: '100%', minHeight: 210, border: 'none', cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
          padding: '22px 18px', background: `linear-gradient(135deg, ${TEAL[500]} 0%, ${TEAL[800]} 100%)`, color: 'white',
        }}
      >
        <span aria-hidden="true" style={{ position: 'absolute', right: -14, top: 8, fontSize: 150, opacity: 0.13, transform: 'rotate(18deg)' }}>🌿</span>
        <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', padding: '4px 11px', borderRadius: 14 }}>
          ✦ AI 맞춤 코스
        </span>
        <p style={{ fontSize: 24, fontWeight: 800, margin: '30px 0 10px', letterSpacing: -0.5 }}>테마여행 모음집</p>
        <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.92, maxWidth: 250 }}>
          이번 여행의 테마를 자유롭게 골라보세요.<br />누구든지 즐길 수 있는 경로와 시설을<br />AI로 구성해서 안내해드려요.
        </p>
        <span aria-hidden="true" style={{ position: 'absolute', right: 16, bottom: 16, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowIcon />
        </span>
      </button>

      {/* SCROLL ③ 추천 코스 카드 목록 */}
      <div style={{ padding: '18px 16px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>추천 코스</h2>
          {!loading && !loadError && <span style={{ fontSize: 12, color: C.inkSoft }}>총 {courses.length}개</span>}
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ borderColor: 'rgba(0,0,0,0.08)', borderTopColor: TEAL[500] }} />
          </div>
        )}

        {!loading && loadError && (
          <div style={{ textAlign: 'center', padding: '36px 0' }}>
            <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>장소 정보를 불러오지 못했어요.</p>
            <button onClick={onRetry} className="btn btn-outline" style={{ minHeight: 44 }}>다시 시도</button>
          </div>
        )}

        {!loading && !loadError && courses.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 13, color: C.inkSoft, padding: '36px 0' }}>추천 코스가 아직 없어요.</p>
        )}

        {courses.map(c => (
          <CourseCard key={c.id} course={c} likeCount={likes[c.id]?.length || 0} onOpen={onOpenCourse} onPlaceClick={onPlaceClick} />
        ))}
      </div>

      {sheetOpen && (
        <AiCourseSheet
          conditions={conditions} myConditions={myConditions} generating={generating} error={genError} canGenerate={canGenerate}
          onSelect={onSelectCondition} onClose={onCloseSheet} onGenerate={onGenerate}
        />
      )}
      <Toast message={toast} />
    </div>
  )
}
