import { WRITE_COLORS as C } from '../utils/constants'
import { TEAL, typeLabel } from '../utils/courseApi'
import { FACILITY_KINDS } from '../utils/courseGen'
import {
  DetailHeader, PlacePill, PinIcon, MetaRow, Timeline, GradeBadge, Sheet,
  Toast, LoginPromptModal, SaveDialog, ShareSheet,
} from './CourseParts'

/**
 * AiCoursePage (FRONT) - AI 추천 코스 상세 UI (기획서 4. AI 추천 코스 상세 화면)
 *
 * back에서 받는 데이터: course, meta, displayDays, keyPlaces, readOnly, loading, loadError, editing, busy,
 *   facilities, showWeatherBanner, festivals, regenerating, regenError, addSheet, addQuery, addList, actions
 * back에서 받는 함수: onBack, onToggleEdit, onToggleFacility, onReorder, onRemove, onOpenAdd, onCloseAdd,
 *   onChangeAddQuery, onAddPlace, onAlternative, onAddFestival, onRegenerate, onWeatherSwap, onCloseRegen,
 *   onPlaceClick, onMakeMine, onCopyCurrentUrl
 */

const Section = ({ icon, title, right, children }) => (
  <div style={{ marginTop: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{icon} {title}</h2>
      {right}
    </div>
    {children}
  </div>
)

export default function AiCoursePageFront({
  course, meta, displayDays, keyPlaces, readOnly, loading, loadError, editing, busy, facilities, showWeatherBanner, festivals,
  regenerating, regenError, addSheet, addQuery, addList, actions,
  onBack, onToggleEdit, onToggleFacility, onReorder, onRemove, onOpenAdd, onCloseAdd, onChangeAddQuery, onAddPlace,
  onAlternative, onAddFestival, onRegenerate, onWeatherSwap, onCloseRegen, onPlaceClick, onMakeMine, onCopyCurrentUrl,
}) {
  const accessText = !meta ? '' : meta.accessible > 0
    ? `${meta.placeCount}곳 중 ${meta.accessible}곳 휠체어 접근 가능`
    : '휠체어 접근이 확인된 장소가 아직 없어요'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F6F7F3', overflow: 'hidden' }}>
      <DetailHeader
        title={readOnly ? '공유된 코스' : 'AI 생성 코스'} onBack={onBack}
        onShare={readOnly ? onCopyCurrentUrl : () => actions.requestShare({ sheet: true })} shareEnabled={readOnly || !!actions.savedId}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" style={{ borderColor: 'rgba(0,0,0,0.08)', borderTopColor: TEAL[500] }} />
          </div>
        )}

        {!loading && loadError && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🙁</p>
            <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14 }}>{loadError}</p>
            <button onClick={onBack} className="btn btn-outline" style={{ minHeight: 44 }}>코스 탭으로</button>
          </div>
        )}

        {!loading && course && meta && (
          <>
            {/* 생성 배너: Teal 그라디언트 + "AI 맞춤 코스" 태그 + 조건 칩 */}
            <div style={{ padding: '20px 16px 18px', color: 'white', background: `linear-gradient(135deg, ${TEAL[500]}, ${TEAL[800]})` }}>
              <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', padding: '3px 10px', borderRadius: 12 }}>✦ AI 맞춤 코스</span>
              <h1 style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.35, margin: '12px 0 10px', letterSpacing: -0.4, wordBreak: 'keep-all' }}>{course.title}</h1>
              {course.summary && <p style={{ fontSize: 12, opacity: 0.9, marginBottom: 10 }}>{course.summary}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(course.chips || []).map(chip => (
                  <span key={chip} style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.18)', padding: '5px 10px', borderRadius: 8 }}>{chip}</span>
                ))}
              </div>
              {course.generatedBy === 'rules' && (
                <p style={{ fontSize: 10.5, opacity: 0.8, marginTop: 10 }}>ℹ️ 지금은 AI 서버 연결 전이라 규칙 기반 추천으로 코스를 구성했어요.</p>
              )}
            </div>

            <MetaRow cells={[
              { label: '총 장소', value: `${meta.placeCount}곳` },
              { label: '총 이동', value: `약 ${meta.totalKm}km` },
              { label: '무장애 적합', value: `${meta.accessible} / ${meta.placeCount}` },
              { label: '예상 시간', value: `${meta.hours}시간` },
            ]} />
            <div style={{ background: 'white', padding: '10px 16px 14px', borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
                <span style={{ color: C.inkSoft, fontWeight: 600 }}>무장애 적합 장소</span>
                <span style={{ color: TEAL[700], fontWeight: 700 }}>{accessText}</span>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(meta.accessibleRatio * 100)} aria-label="무장애 적합 비율"
                style={{ height: 6, background: '#E4E9E3', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${meta.accessibleRatio * 100}%`, height: '100%', background: TEAL[500] }} />
              </div>
            </div>

            <div style={{ padding: '0 16px 32px' }}>
              {/* 날씨 기반 조정 배너 (v2) */}
              {showWeatherBanner && !readOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FBF0DC', borderRadius: 12, padding: '11px 12px', marginTop: 14 }}>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: '#5A4321' }}>🌧 비 예보 — 실내 장소로 대체할까요?</span>
                  <button onClick={onWeatherSwap} aria-label="실내 중심 대체 코스 제안 받기"
                    style={{ minHeight: 36, padding: '0 12px', borderRadius: 18, border: '1px solid #DB8B12', background: 'white', color: '#8C5300', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                    대체 제안
                  </button>
                </div>
              )}

              {/* 경로 중 편의시설 */}
              <Section icon="ⓘ" title="경로 중 편의시설">
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(FACILITY_KINDS).map(([kind, f]) => {
                    const on = facilities.has(kind)
                    return (
                      <button key={kind} onClick={() => onToggleFacility(kind)} aria-pressed={on} disabled={editing || readOnly}
                        aria-label={`${f.label} 위치를 일정에 ${on ? '숨기기' : '보기'}`}
                        style={{
                          flex: 1, minHeight: 44, borderRadius: 12, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: editing || readOnly ? 'default' : 'pointer',
                          border: `1.5px solid ${on ? TEAL[500] : C.line}`, background: on ? TEAL[50] : 'white', color: on ? TEAL[800] : C.inkSoft, opacity: editing || readOnly ? 0.5 : 1,
                        }}>
                        {f.icon} {f.label}{on ? ' ✓' : ''}
                      </button>
                    )
                  })}
                </div>
                {editing && <p style={{ fontSize: 11, color: C.inkFaint, marginTop: 6 }}>편집 중에는 편의시설을 표시하지 않아요.</p>}
              </Section>

              {/* 편집 모드 토글 */}
              {!readOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 12px', marginTop: 14 }}>
                  <p style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.ink }}>
                    ✎ {editing ? '≡ 드래그 · ✕ 삭제 · ＋ 장소 추가' : '장소를 추가·삭제·순서 변경할 수 있어요'}
                  </p>
                  <button role="switch" aria-checked={editing} onClick={onToggleEdit} aria-label="편집 모드"
                    style={{ minHeight: 44, minWidth: 64, borderRadius: 22, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 800, background: editing ? TEAL[800] : 'var(--gray-100)', color: editing ? 'white' : C.inkSoft }}>
                    {editing ? '완료' : '편집'}
                  </button>
                </div>
              )}

              <Section icon="📍" title="핵심 장소">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {keyPlaces.map(p => <PlacePill key={p.key} name={p.name} large onClick={() => onPlaceClick(p)} />)}
                </div>
              </Section>

              <Section
                icon="🗓" title="AI 생성 일정"
                right={busy && <span role="status" aria-live="polite" style={{ fontSize: 11, color: C.inkSoft }}>이동시간 계산 중…</span>}
              >
                <Timeline
                  days={displayDays} editing={editing && !readOnly}
                  onReorder={onReorder} onRemove={onRemove} onAddPlace={onOpenAdd} onPlaceClick={onPlaceClick}
                  onAlternative={readOnly ? undefined : onAlternative}
                />
              </Section>

              {/* 행사·축제 제안 (여행 날짜 기준 광주·전남 행사) */}
              {!readOnly && festivals.length > 0 && (
                <Section icon="🎪" title="행사·축제 제안">
                  {festivals.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                        <p style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 2 }}>오늘 진행 중 · 코스에서 약 {f.distKm.toFixed(1)}km</p>
                      </div>
                      <button onClick={() => onAddFestival(f)} aria-label={`${f.name} 일정에 추가`}
                        style={{ minHeight: 40, padding: '0 12px', borderRadius: 20, border: `1px solid ${TEAL[500]}`, background: 'white', color: TEAL[700], fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
                        일정에 추가
                      </button>
                    </div>
                  ))}
                </Section>
              )}

              {/* 하단 버튼 */}
              {readOnly ? (
                <div style={{ marginTop: 24 }}>
                  <button onClick={onCopyCurrentUrl} style={{ width: '100%', minHeight: 50, borderRadius: 14, border: `1.5px solid ${TEAL[500]}`, background: 'white', color: TEAL[700], fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>🔗 링크 복사</button>
                  <button onClick={onMakeMine} style={{ width: '100%', minHeight: 52, marginTop: 8, borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${TEAL[500]}, ${TEAL[800]})`, color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>나도 AI 코스 만들기</button>
                </div>
              ) : (
                <div style={{ marginTop: 24 }}>
                  <button onClick={onRegenerate} aria-label="AI 코스 다시 생성하기"
                    style={{ width: '100%', minHeight: 50, borderRadius: 14, border: `1px solid ${C.line}`, background: 'white', color: C.ink, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                    🔄 AI 코스 다시 생성하기
                  </button>
                  <button onClick={actions.requestSave} disabled={!!actions.savedId} aria-label="코스 저장하기"
                    style={{
                      width: '100%', minHeight: 52, marginTop: 8, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 800, cursor: actions.savedId ? 'default' : 'pointer',
                      background: actions.savedId ? '#CFE6DF' : `linear-gradient(135deg, ${TEAL[500]}, ${TEAL[800]})`, color: actions.savedId ? TEAL[800] : 'white',
                    }}>
                    {actions.savedId ? '✓ 저장 완료' : '🔖 코스 저장하기'}
                  </button>
                  <button onClick={() => actions.requestShare({ sheet: false })} aria-label="URL 공유하기" aria-disabled={!actions.savedId}
                    style={{
                      width: '100%', minHeight: 50, marginTop: 8, borderRadius: 14, background: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                      border: `1.5px solid ${actions.savedId ? TEAL[500] : C.line}`, color: actions.savedId ? TEAL[700] : C.inkFaint,
                    }}>
                    🔗 URL 공유하기
                  </button>
                  {!actions.savedId && <p style={{ fontSize: 11, color: C.inkFaint, textAlign: 'center', marginTop: 8 }}>코스를 저장하면 URL로 공유할 수 있어요</p>}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 재생성 로딩 / 실패 (aria-live) */}
      {(regenerating || regenError) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)', zIndex: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {regenerating ? (
            <div role="status" aria-live="polite" style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ width: 34, height: 34, borderWidth: 3, borderColor: 'rgba(0,0,0,0.08)', borderTopColor: TEAL[500], margin: '0 auto 16px' }} />
              <p style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>AI가 맞춤 코스를 생성하고 있어요…</p>
            </div>
          ) : (
            <div role="alert" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 14 }}>{regenError}</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={onCloseRegen} className="btn" style={{ minHeight: 44, background: 'var(--gray-100)', color: 'var(--gray-700)' }}>닫기</button>
                <button onClick={onRegenerate} className="btn btn-primary" style={{ minHeight: 44, background: TEAL[800] }}>재시도</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 장소 추가 시트 */}
      {addSheet != null && (
        <Sheet title="장소 추가" subtitle="마지막 장소에서 가까운 순서예요" onClose={onCloseAdd}>
          <input value={addQuery} onChange={e => onChangeAddQuery(e.target.value)} placeholder="장소명 검색" aria-label="장소명 검색"
            style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 12px', fontSize: 14, outline: 'none', margin: '6px 0 10px' }} />
          {addList.length === 0 && <p style={{ fontSize: 13, color: C.inkSoft, textAlign: 'center', padding: 24 }}>추가할 수 있는 장소가 없어요.</p>}
          {addList.map(c => (
            <button key={c.id} onClick={() => onAddPlace(addSheet, c)} aria-label={`${c.name} 추가`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', borderBottom: `1px solid ${C.line}`, padding: '11px 2px', cursor: 'pointer', textAlign: 'left', minHeight: 48 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{c.name}</p>
                <p style={{ fontSize: 11, color: C.inkSoft, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <PinIcon size={10} /> {typeLabel(c.type)} · {c.distKm.toFixed(1)}km
                </p>
              </div>
              <GradeBadge grade={c.grade} />
            </button>
          ))}
        </Sheet>
      )}

      {actions.saveOpen && <SaveDialog defaultName={course?.title} saving={actions.saving} onCancel={actions.closeSave} onSave={actions.confirmSave} />}
      {actions.shareOpen && actions.shareInfo && (
        <ShareSheet url={actions.shareInfo.url} kind={actions.shareInfo.kind} onCopy={actions.copyShare} onNativeShare={actions.nativeShare} onClose={actions.closeShare} />
      )}
      {actions.loginPrompt && <LoginPromptModal onCancel={actions.closeLoginPrompt} onConfirm={actions.confirmLogin} />}
      <Toast message={actions.toast} />
    </div>
  )
}
