import { useEffect, useState } from 'react'

/**
 * 카카오맵 SDK를 동적으로 로드하는 훅
 * index.html에 script 태그 넣는 방식 대신, 앱 키를 env에서 안전하게 주입
 */
export function useKakaoMap() {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // 이미 로드된 경우
    if (window.kakao && window.kakao.maps) {
      setLoaded(true)
      return
    }

    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY
    if (!appKey || appKey === 'your_kakao_js_app_key_here') {
      setError('VITE_KAKAO_MAP_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.')
      return
    }

    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`
    script.async = true

    script.onload = () => {
      window.kakao.maps.load(() => {
        setLoaded(true)
      })
    }
    script.onerror = () => {
      setError('카카오맵 SDK 로드 실패. 앱키와 도메인 등록을 확인하세요.')
    }

    document.head.appendChild(script)

    return () => {
      // 언마운트 시 script 제거하지 않음 (SDK는 전역 재사용)
    }
  }, [])

  return { loaded, error }
}
