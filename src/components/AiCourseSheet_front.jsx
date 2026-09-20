import { WRITE_COLORS as C } from '../utils/constants'
import { TEAL } from '../utils/courseApi'
import { TRAVELER_TYPES, TRANSPORTS, STAMINAS, DURATIONS } from '../utils/courseGen'
import { Sheet } from './CourseParts'

/**
 * AiCourseSheet (FRONT) - "AI 코스 만들기" 바텀시트 UI (기획서 2. AI 코스 만들기)
 *
 * back(CoursePage)에서 받는 데이터: conditions, generating, error, canGenerate
 * back에서 받는 함수: onSelect(key, value), onClose, onGenerate
 */

function Option({ selected, onClick, children, style }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={selected}
      style={{
        minHeight: 44, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
        border: `1.5px solid ${selected ? TEAL[500] : C.line}`, background: selected ? TEAL[50] : 'white',
        color: selected ? TEAL[800] : C.ink, fontWeight: selected ? 800 : 600, ...style,
      }}
    >
      {children}
    </button>
  )
}

const Label = ({ children }) => <p style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, margin: '16px 0 8px' }}>{children}</p>

export default function AiCourseSheet({ conditions, generating, error, canGenerate, onSelect, onClose, onGenerate }) {
  return (
    <Sheet title="AI 코스 만들기" subtitle="조건을 선택하면 맞춤 코스를 생성해드려요" onClose={generating ? undefined : onClose}>
      {generating ? (
        <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: '56px 0 64px' }}>
          <div className="spinner" style={{ width: 34, height: 34, borderWidth: 3, borderColor: 'rgba(0,0,0,0.08)', borderTopColor: TEAL[500], margin: '0 auto 18px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>AI가 맞춤 코스를 생성하고 있어요…</p>
          <p style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>장소 정보와 접근성을 확인하는 중이에요. 잠시만 기다려주세요.</p>
        </div>
      ) : (
        <>
          <Label>여행자 유형</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TRAVELER_TYPES.map(t => (
              <Option key={t.key} selected={conditions.travelerType === t.key} onClick={() => onSelect('travelerType', t.key)} style={{ padding: '14px 8px', textAlign: 'center' }}>
                <span style={{ fontSize: 26, display: 'block', marginBottom: 4 }}>{t.icon}</span>
                <span style={{ fontSize: 14, display: 'block' }}>{t.label}</span>
                <span style={{ fontSize: 10.5, fontWeight: 500, color: C.inkSoft, display: 'block', marginTop: 2 }}>{t.sub}</span>
              </Option>
            ))}
          </div>

          <Label>이동 수단</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {TRANSPORTS.map(t => (
              <Option key={t.key} selected={conditions.transport === t.key} onClick={() => onSelect('transport', t.key)} style={{ padding: '10px 4px', fontSize: 12.5 }}>
                <span style={{ fontSize: 20, display: 'block', marginBottom: 2 }}>{t.icon}</span>{t.label}
              </Option>
            ))}
          </div>
          {conditions.transport === 'saebitcall' && (
            <p style={{ fontSize: 11, color: C.inkSoft, marginTop: 6 }}>새빛콜(1622-2222)은 광주 교통약자 이동지원 서비스예요. 이동시간은 대기 시간을 포함해 추정해요.</p>
          )}

          <Label>체력 수준 (하루 이동 거리 상한)</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {STAMINAS.map(s => (
              <Option key={s.key} selected={conditions.stamina === s.key} onClick={() => onSelect('stamina', s.key)} style={{ padding: '10px 4px', fontSize: 13 }}>{s.label}</Option>
            ))}
          </div>

          <Label>여행 일수</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {DURATIONS.map(d => (
              <Option key={d.key} selected={conditions.duration === d.key} onClick={() => onSelect('duration', d.key)} style={{ padding: '10px 4px', fontSize: 13 }}>{d.label}</Option>
            ))}
          </div>

          {error && (
            <div role="alert" style={{ marginTop: 16, background: '#FBE7E7', color: '#B23B3B', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button
            type="button" onClick={onGenerate} disabled={!canGenerate} aria-label="AI 코스 생성하기" aria-disabled={!canGenerate}
            style={{
              width: '100%', minHeight: 50, marginTop: 20, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
              cursor: canGenerate ? 'pointer' : 'default',
              background: canGenerate ? `linear-gradient(135deg, ${TEAL[500]}, ${TEAL[800]})` : C.line,
              color: canGenerate ? 'white' : C.inkFaint,
            }}
          >
            {error ? '✨ 다시 시도하기' : '✨ AI 코스 생성하기'}
          </button>
          {!canGenerate && <p style={{ fontSize: 11, color: C.inkFaint, textAlign: 'center', marginTop: 8 }}>네 가지 조건을 모두 선택해주세요</p>}
        </>
      )}
    </Sheet>
  )
}
