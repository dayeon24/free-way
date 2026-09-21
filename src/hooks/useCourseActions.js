import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { saveCourse, shareCourse, MAX_SAVED_COURSES } from '../utils/courseStore'

/**
 * 코스 상세/AI 결과 화면 공통 로직 — 로그인 게이트, 저장(최대 20개), URL 공유, 토스트
 * (기획서 "저장·공유 버튼", "오류 및 예외 처리")
 *
 * getCourse(): 현재 코스 객체를 돌려주는 함수 (저장/공유 시점의 최신 값을 쓰기 위해 함수로 받음)
 */
export function useCourseActions(getCourse) {
  const { user, signInWithGoogle } = useAuth()

  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const [loginPrompt, setLoginPrompt] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const [shareInfo, setShareInfo] = useState(null) // { url, kind } — 저장 후 처음 공유할 때 한 번만 만들고 재사용
  const [shareOpen, setShareOpen] = useState(false)

  // 비로그인 → 로그인 팝업, 로그인 → 이름/메모 입력 다이얼로그
  function requestSave() {
    if (!user) { setLoginPrompt(true); return }
    setSaveOpen(true)
  }

  async function confirmSave({ name, memo }) {
    setSaving(true)
    try {
      const result = await saveCourse(user, getCourse(), { name, memo })
      if (result === 'LIMIT') {
        setToast(`저장 가능한 코스가 최대 ${MAX_SAVED_COURSES}개입니다. 기존 코스를 삭제 후 저장해주세요.`)
        setSaveOpen(false)
      } else {
        setSavedId(result)
        setShareInfo(null)
        setSaveOpen(false)
        setToast('코스를 저장했어요. 내 정보 탭에서 확인하세요. URL로도 공유할 수 있어요.')
      }
    } catch (e) {
      console.error(e)
      setToast(navigator.onLine ? '코스 저장에 실패했어요. 다시 시도해주세요.' : '인터넷 연결을 확인해주세요.')
    } finally {
      setSaving(false)
    }
  }

  async function ensureShareInfo() {
    if (shareInfo) return shareInfo
    const info = await shareCourse(getCourse())
    setShareInfo(info)
    return info
  }

  async function copyToClipboard(url) {
    try {
      await navigator.clipboard.writeText(url)
      setToast('링크를 복사했어요.')
      return true
    } catch {
      return false
    }
  }

  // 저장 완료 후에만 활성화 (기획서: "저장 완료 후 활성화")
  async function requestShare({ sheet }) {
    if (!savedId) { setToast('코스를 먼저 저장하면 공유할 수 있어요.'); return }
    try {
      const info = await ensureShareInfo()
      if (sheet) setShareOpen(true)
      else if (!(await copyToClipboard(info.url))) setShareOpen(true) // 클립보드 실패 시 시트에서 직접 복사
    } catch (e) {
      console.error(e)
      setToast('공유 링크를 만들지 못했어요. 다시 시도해주세요.')
    }
  }

  async function nativeShare() {
    if (!shareInfo) return
    try { await navigator.share({ title: getCourse().title, url: shareInfo.url }) } catch { /* 사용자가 취소 */ }
  }

  return {
    user, toast, setToast,
    loginPrompt, closeLoginPrompt: () => setLoginPrompt(false),
    confirmLogin: async () => { await signInWithGoogle(); setLoginPrompt(false) },
    requireLogin: () => setLoginPrompt(true),
    saveOpen, saving, savedId, setSavedId, requestSave, confirmSave, closeSave: () => setSaveOpen(false),
    shareInfo, shareOpen, closeShare: () => setShareOpen(false),
    requestShare, copyShare: async () => { if (shareInfo) await copyToClipboard(shareInfo.url) }, nativeShare,
  }
}
