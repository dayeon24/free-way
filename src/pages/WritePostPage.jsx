import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
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
  const { id: editId } = useParams() // /community/:id/edit로 들어왔으면 수정 모드

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState(null)
  const [place, setPlace] = useState(null) // { name, mapx, mapy } | null
  const [images, setImages] = useState([]) // { file, url } — 수정 모드에서 기존 이미지는 file: null, url: 기존주소

  // 수정 모드: 기존 글 불러와서 폼에 채워넣기 (본인 글 아니면 접근 불가)
  const [postLoading, setPostLoading] = useState(!!editId)
  const [postLoadError, setPostLoadError] = useState(null)
  useEffect(() => {
    if (!editId || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'community', editId))
        if (cancelled) return
        if (!snap.exists() || snap.data().uid !== user.uid) {
          setPostLoadError('수정할 수 없는 게시글이에요.')
          return
        }
        const data = snap.data()
        setTitle(data.title || '')
        setBody(data.body || '')
        setType(data.type || null)
        if (data.placeName) setPlace({ name: data.placeName, mapx: data.placeMapx, mapy: data.placeMapy })
        setImages((data.images || []).map(url => ({ file: null, url })))
      } catch (e) {
        console.error(e)
        if (!cancelled) setPostLoadError('게시글을 불러오지 못했어요.')
      } finally {
        if (!cancelled) setPostLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [editId, user])

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
      // 기존 이미지(url만 있고 file 없음)는 그대로 두고, 새로 추가한 것만 업로드
      const imageUrls = await withTimeout(
        Promise.all(images.map(async (img, i) => {
          if (!img.file) return img.url
          const fileRef = ref(storage, `community/${user.uid}/${Date.now()}-${i}`)
          await uploadBytes(fileRef, img.file)
          return getDownloadURL(fileRef)
        })),
        UPLOAD_TIMEOUT_MS,
        '사진 업로드 시간이 초과됐어요.'
      )

      if (editId) {
        await updateDoc(doc(db, 'community', editId), {
          title: title.trim(),
          body: body.trim(),
          type,
          placeName: place?.name || null,
          placeMapx: place?.mapx || null,
          placeMapy: place?.mapy || null,
          images: imageUrls,
        })
        navigate(`/community/${editId}`)
        return
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
      setToast(e.message === '사진 업로드 시간이 초과됐어요.' ? e.message : (editId ? '게시글 수정에 실패했어요. 다시 시도해주세요.' : '게시글 등록에 실패했어요. 다시 시도해주세요.'))
      setSubmitting(false)
    }
  }

  async function handleConfirmLogin() {
    await signInWithGoogle()
  }

  if (editId && postLoading) {
    return <div className="page" style={{ padding: 24, textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>불러오는 중...</div>
  }
  if (editId && postLoadError) {
    return (
      <div className="page" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>{postLoadError}</p>
        <button onClick={() => navigate('/community')} className="btn btn-outline">목록으로</button>
      </div>
    )
  }

  return (
    <WritePostPageFront
      isEdit={!!editId}
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
