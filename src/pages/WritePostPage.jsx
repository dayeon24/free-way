import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { searchPlaces } from '../utils/kakaoLocal'
import { compressImage } from '../utils/imageCompress'
import WritePostPageFront from '../components/WritePostPage_front'

const MAX_IMAGES = 5
const UPLOAD_TIMEOUT_MS = 25000

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])
}

/**
 * WritePostPage (BACK) - 기능/로직 담당
 *
 * 커뮤니티 게시글 작성 (기획서 "5. 게시글 작성하기") - 커뮤니티 탭 글쓰기 FAB에서 진입하는 전용 페이지
 *
 * 보유: 제목/내용/유형/위치/이미지 상태, 위치 검색(Kakao Local), 이미지 업로드, 게시글 등록, 이탈 확인
 * front에 넘기는 데이터:
 *   user, title, body, type, place, images, typeDropdownOpen, placeSearchOpen,
 *   placeSearchQuery, placeResults, placeSearchLoading, cancelConfirmOpen, submitting, toast, canSubmit
 * front에 넘기는 함수:
 *   onSetTitle, onSetBody, onToggleTypeDropdown, onSelectType, onOpenPlaceSearch, onClosePlaceSearch,
 *   onSetPlaceSearchQuery, onSelectPlace, onRemovePlace, onAddImages, onRemoveImage,
 *   onCancel, onConfirmLeave, onKeepEditing, onSubmit, onConfirmLogin
 */
export default function WritePostPage() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState(null)
  const [place, setPlace] = useState(null) // { name, mapx, mapy } | null
  const [images, setImages] = useState([]) // { file, url }

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false)
  const [placeSearchQuery, setPlaceSearchQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false)

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [processingImages, setProcessingImages] = useState(false)

  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    function handleOffline() { setToast('인터넷 연결을 확인해주세요.') }
    window.addEventListener('offline', handleOffline)
    return () => window.removeEventListener('offline', handleOffline)
  }, [])

  // 위치 검색 - 입력 후 300ms 디바운스 (기획서 "위치 버튼 → 장소 검색 화면 진입")
  useEffect(() => {
    if (!placeSearchOpen) return
    if (!placeSearchQuery.trim()) { setPlaceResults([]); return }
    setPlaceSearchLoading(true)
    const t = setTimeout(async () => {
      const results = await searchPlaces(placeSearchQuery)
      setPlaceResults(results)
      setPlaceSearchLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [placeSearchQuery, placeSearchOpen])

  // 원본 사진(특히 휴대폰 카메라 촬영본)을 그대로 올리면 업로드가 오래 걸려 "렉"처럼 보이고
  // 타임아웃/네트워크 상태에 따라 등록이 안 되는 것처럼 실패하는 문제 방지 - 선택 즉시 리사이즈/재인코딩
  async function handleAddImages(files) {
    const remaining = MAX_IMAGES - images.length
    if (files.length > remaining) setToast('사진은 최대 5장까지 첨부할 수 있어요.')
    const picked = files.slice(0, remaining)
    if (!picked.length) return
    setProcessingImages(true)
    const compressed = await Promise.all(picked.map(async file => {
      try {
        const small = await compressImage(file)
        return { file: small, url: URL.createObjectURL(small) }
      } catch (e) {
        console.error(e)
        return { file, url: URL.createObjectURL(file) } // 압축 실패 시 원본으로 폴백
      }
    }))
    setImages(prev => [...prev, ...compressed])
    setProcessingImages(false)
  }

  function handleRemoveImage(i) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleSelectPlace(p) {
    setPlace(p)
    setPlaceSearchOpen(false)
    setPlaceSearchQuery('')
    setPlaceResults([])
  }

  const isDirty = title.trim() || body.trim() || place || images.length > 0 || type

  function handleCancel() {
    if (isDirty) setCancelConfirmOpen(true)
    else navigate('/community')
  }

  const canSubmit = !!type && !!title.trim() && !!body.trim() && !submitting && !processingImages

  async function handleSubmit() {
    if (!canSubmit || !user) return
    setSubmitting(true)
    try {
      let imageUrls = []
      if (images.length) {
        imageUrls = await withTimeout(
          Promise.all(images.map(async (img, i) => {
            const fileRef = ref(storage, `community/${user.uid}/${Date.now()}-${i}`)
            await uploadBytes(fileRef, img.file)
            return getDownloadURL(fileRef)
          })),
          UPLOAD_TIMEOUT_MS,
          '사진 업로드 시간이 초과됐어요.'
        )
      }
      const docRef = await addDoc(collection(db, 'community'), {
        title: title.trim(),
        body: body.trim(),
        type,
        placeName: place?.name || null,
        placeMapx: place?.mapx || null,
        placeMapy: place?.mapy || null,
        images: imageUrls,
        uid: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        likes: [],
        viewCount: 0,
        ...(type === 'report' ? { reportStatus: 'pending' } : {}),
        createdAt: serverTimestamp(),
      })
      navigate(`/community/${docRef.id}`)
    } catch (e) {
      console.error(e)
      setToast(e.message === '사진 업로드 시간이 초과됐어요.' ? e.message : '게시글 등록에 실패했어요. 다시 시도해주세요.')
      setSubmitting(false)
    }
  }

  async function handleConfirmLogin() {
    await signInWithGoogle()
  }

  return (
    <WritePostPageFront
      user={user}
      title={title}
      body={body}
      type={type}
      place={place}
      images={images}
      typeDropdownOpen={typeDropdownOpen}
      placeSearchOpen={placeSearchOpen}
      placeSearchQuery={placeSearchQuery}
      placeResults={placeResults}
      placeSearchLoading={placeSearchLoading}
      cancelConfirmOpen={cancelConfirmOpen}
      submitting={submitting}
      processingImages={processingImages}
      canSubmit={canSubmit}
      toast={toast}
      onSetTitle={setTitle}
      onSetBody={setBody}
      onToggleTypeDropdown={() => setTypeDropdownOpen(prev => !prev)}
      onSelectType={t => { setType(t); setTypeDropdownOpen(false) }}
      onOpenPlaceSearch={() => setPlaceSearchOpen(true)}
      onClosePlaceSearch={() => setPlaceSearchOpen(false)}
      onSetPlaceSearchQuery={setPlaceSearchQuery}
      onSelectPlace={handleSelectPlace}
      onRemovePlace={() => setPlace(null)}
      onAddImages={handleAddImages}
      onRemoveImage={handleRemoveImage}
      onCancel={handleCancel}
      onConfirmLeave={() => navigate('/community')}
      onKeepEditing={() => setCancelConfirmOpen(false)}
      onSubmit={handleSubmit}
      onConfirmLogin={handleConfirmLogin}
    />
  )
}
