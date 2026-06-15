/**
 * CoursePage (FRONT) - 외견/UI 담당 (인라인 CSS)
 *
 * back에서 받는 데이터: hasKey, apiKey, testResult, loading, activeTest, tests
 * back에서 받는 함수: onRunTest
 */
export default function CoursePageFront({
  hasKey,
  apiKey,
  testResult,
  loading,
  activeTest,
  tests,
  onRunTest,
}) {
  return (
    <div className="page">
      <p className="page-title">코스 플래너</p>
      <p className="page-subtitle">AI 맞춤 코스 및 TourAPI 연결 테스트</p>

      <div className="section">
        <p className="section-title">🔑 TourAPI 인증 상태</p>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{hasKey ? '✅' : '⚠️'}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: hasKey ? 'var(--green-500)' : '#f59e0b' }}>
              {hasKey ? '인증키 설정됨' : '인증키 미설정'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--gray-600)' }}>
              {hasKey
                ? `키: ${apiKey.slice(0, 8)}${'*'.repeat(Math.max(0, apiKey.length - 8))}`
                : '.env 파일에 VITE_TOUR_API_KEY 설정 필요'}
            </p>
          </div>
        </div>
      </div>

      <div className="section">
        <p className="section-title">🧪 API 호출 테스트</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tests.map(t => (
            <button
              key={t.label}
              className={t.primary ? 'btn btn-primary' : 'btn btn-outline'}
              disabled={!hasKey || loading}
              onClick={() => onRunTest(t.label, t.fn)}
            >
              {loading && activeTest === t.label ? <span className="spinner" /> : null}
              {t.text}
            </button>
          ))}
        </div>
      </div>

      {testResult && (
        <div className="section">
          <p className="section-title">
            {testResult.type === 'success' ? '✅' : '❌'} 결과: {testResult.label}
          </p>
          <div className={`test-result ${testResult.type}`}>
            {testResult.type === 'success'
              ? JSON.stringify(testResult.data, null, 2)
              : `오류: ${testResult.message}`}
          </div>
          {testResult.type === 'success' && testResult.data?.items?.item && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>조회된 장소 목록</p>
              {[testResult.data.items.item].flat().map((item, i) => (
                <div key={i} className="card" style={{ display: 'flex', gap: 10 }}>
                  {item.firstimage && (
                    <img src={item.firstimage} alt={item.title} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                  )}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--gray-600)' }}>{item.addr1}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasKey && (
        <div className="card" style={{ background: '#fff8e1', border: '1px solid #ffe082' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>인증키 설정 방법</p>
          <ol style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.8, paddingLeft: 16 }}>
            <li>api.visitkorea.or.kr 접속 → 회원가입</li>
            <li>인증키 신청 → 활성화까지 1~2일 소요</li>
            <li>프로젝트 루트에 .env 파일 생성</li>
            <li>VITE_TOUR_API_KEY=발급받은키 입력</li>
            <li>vite dev 서버 재시작</li>
          </ol>
        </div>
      )}
    </div>
  )
}
