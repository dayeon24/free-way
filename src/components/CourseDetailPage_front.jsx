import { WRITE_COLORS as C } from '../utils/constants'
import { TEAL, COURSE_CATEGORIES } from '../utils/courseApi'
import {
  DetailHeader, CategoryBadge, PlacePill, HeartIcon, PinIcon, MetaRow, Timeline,
  Toast, LoginPromptModal, SaveDialog, ShareSheet, MoreSheet,
} from './CourseParts'

/**
 * CourseDetailPage (FRONT) - 추천 코스 상세 UI (기획서 3. 추천 코스 상세 화면)
 *
 * back에서 받는 데이터: course, meta, categoryLabel, loading, notFound, likeCount, liked,
 *   actions{ toast, loginPrompt, saveOpen, saving, savedId, shareInfo, shareOpen ... }, moreOpen
 * back에서 받는 함수: onBack, onToggleLike, onPlaceClick, onOpenMore, onCloseMore, onReport, onInquiry
 */
export default function CourseDetailPageFront({
  course, meta, categoryLabel, loading, notFound, likeCount, liked, actions, moreOpen,
  onBack, onToggleLike, onPlaceClick, onOpenMore, onCloseMore, onReport, onInquiry,
}) {
  const cat = course ? COURSE_CATEGORIES[course.category] || COURSE_CATEGORIES.nature : null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F6F7F3', overflow: 'hidden' }}>
      <DetailHeader
        title="코스 상세" onBack={onBack} onMore={onOpenMore}
        onShare={() => actions.requestShare({ sheet: true })} shareEnabled={!!actions.savedId}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" style={{ borderColor: 'rgba(0,0,0,0.08)', borderTopColor: TEAL[500] }} />
          </div>
        )}

        {!loading && notFound && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🙁</p>
            <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14 }}>코스 정보를 불러오지 못했어요.</p>
            <button onClick={onBack} className="btn btn-outline" style={{ minHeight: 44 }}>목록으로</button>
          </div>
        )}

        {!loading && course && (
          <>
            {/* 히어로: 카테고리 · 코스명 · 지역 · 좋아요 */}
            <div style={{
              position: 'relative', padding: '46px 16px 18px', color: 'white', minHeight: 176, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              background: course.image
                ? `linear-gradient(rgba(21,74,64,0.45), rgba(21,74,64,0.92)), url(${course.image.replace('http://', 'https://')}) center/cover`
                : `linear-gradient(135deg, ${cat.from}, ${cat.to})`,
            }} role="img" aria-label={`${categoryLabel} ${course.title}`}>
              <div><CategoryBadge category={course.category} onDark /></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, letterSpacing: -0.4, wordBreak: 'keep-all' }}>{course.title}</h1>
                  <p style={{ fontSize: 12, opacity: 0.9, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PinIcon size={12} /> {course.region}
                  </p>
                </div>
                <button
                  onClick={onToggleLike} aria-label={liked ? '좋아요 취소' : '좋아요'} aria-pressed={liked}
                  style={{ width: 52, minHeight: 56, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', color: liked ? '#FF8A8A' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, flexShrink: 0 }}
                >
                  <HeartIcon filled={liked} size={20} />
                  <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1 }}>{likeCount}</span>
                </button>
              </div>
            </div>

            <MetaRow cells={[
              { label: '여행 유형', value: meta.type === '휠체어' ? '♿ 휠체어' : meta.type },
              { label: '일정', value: meta.schedule },
              { label: '총 거리', value: meta.distance },
            ]} />

            <div style={{ padding: '18px 16px 28px' }}>
              {course.overview && <p style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.65, marginBottom: 18 }}>{course.overview}</p>}

              <h2 style={{ fontSize: 14, fontWeight: 800, color: C.ink, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                <PinIcon size={14} color={TEAL[700]} /> 핵심 장소
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
                {meta.keyPlaces.map(p => <PlacePill key={p.key} name={p.name} large onClick={onPlaceClick} />)}
              </div>

              <h2 style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 6 }}>🗓 코스 일정</h2>
              <Timeline days={course.days} onPlaceClick={onPlaceClick} />

              {/* 저장 · 공유 */}
              <button
                onClick={actions.requestSave} aria-label="코스 저장하기" disabled={!!actions.savedId}
                style={{
                  width: '100%', minHeight: 52, marginTop: 22, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 800, cursor: actions.savedId ? 'default' : 'pointer',
                  background: actions.savedId ? '#CFE6DF' : `linear-gradient(135deg, ${TEAL[500]}, ${TEAL[800]})`, color: actions.savedId ? TEAL[800] : 'white',
                }}
              >
                {actions.savedId ? '✓ 저장 완료' : '🔖 코스 저장하기'}
              </button>
              <button
                onClick={() => actions.requestShare({ sheet: false })} aria-label="URL 공유하기" aria-disabled={!actions.savedId}
                style={{
                  width: '100%', minHeight: 50, marginTop: 8, borderRadius: 14, background: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  border: `1.5px solid ${actions.savedId ? TEAL[500] : C.line}`, color: actions.savedId ? TEAL[700] : C.inkFaint,
                }}
              >
                🔗 URL 공유하기
              </button>
              {!actions.savedId && <p style={{ fontSize: 11, color: C.inkFaint, textAlign: 'center', marginTop: 8 }}>코스를 저장하면 URL로 공유할 수 있어요</p>}
            </div>
          </>
        )}
      </div>

      {actions.saveOpen && <SaveDialog defaultName={course?.title} saving={actions.saving} onCancel={actions.closeSave} onSave={actions.confirmSave} />}
      {actions.shareOpen && actions.shareInfo && (
        <ShareSheet url={actions.shareInfo.url} kind={actions.shareInfo.kind} onCopy={actions.copyShare} onNativeShare={actions.nativeShare} onClose={actions.closeShare} />
      )}
      {moreOpen && <MoreSheet onClose={onCloseMore} onReport={onReport} onInquiry={onInquiry} />}
      {actions.loginPrompt && <LoginPromptModal onCancel={actions.closeLoginPrompt} onConfirm={actions.confirmLogin} />}
      <Toast message={actions.toast} />
    </div>
  )
}
