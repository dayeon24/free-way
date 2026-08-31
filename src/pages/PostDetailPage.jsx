import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, updateDoc, deleteDoc, increment, arrayUnion, arrayRemove,
  collection, addDoc, getDocs, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import PostDetailPageFront from '../components/PostDetailPage_front'

// 플랫 댓글 목록 -> 답글(1단계)을 부모 댓글에 묶은 트리로 변환 (기획서 "6. 게시글 댓글 - 답글달기")
function groupComments(flat) {
  const replies = flat.filter(c => c.replyTo)
  const top = flat.filter(c => !c.replyTo)
  return top.map(c => ({ ...c, replies: replies.filter(r => r.replyTo === c.id) }))
}

/**
 * PostDetailPage (BACK) - 기능/로직 담당
 *
 * 커뮤니티 게시글 상세 (기획서 "3. 게시글 상세 화면", "4. 게시글 옵션", "6. 게시글 댓글")
 *
 * 보유: 게시글 단건 조회/조회수 증가, 좋아요, 댓글 조회/작성/좋아요/수정/삭제/답글, 공유 링크, 신고 접수(게시글/댓글)
 * front에 넘기는 데이터:
 *   post, loading, notFound, loadError, user, comments, commentLoading, commentLoadError,
 *   optionsStep(게시글), reportReason, replyingTo, commentOptionsFor, commentOptionsStep, editingComment,
 *   loginPromptReason, toast, shareUrl
 * front에 넘기는 함수:
 *   onBack, onLike, onSubmitComment, onRetryComments,
 *   onOpenOptions, onCloseOptions, onOptionsBack, onGoShare, onGoReportList, onSelectReportReason, onConfirmReport,
 *   onCopyShareLink, onShare, onConfirmLogin, onCancelLoginPrompt, onPlaceTagClick,
 *   onStartReply, onCancelReply, onSubmitReply,
 *   onOpenCommentOptions, onCloseCommentOptions, onCommentOptionsBack, onStartEditComment, onCancelEditComment,
 *   onSaveEditComment, onDeleteComment, onLikeComment, onGoCommentReportList, onSelectCommentReportReason, onConfirmCommentReport
 */
export default function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, signInWithGoogle } = useAuth()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const [comments, setComments] = useState([])
  const [commentLoading, setCommentLoading] = useState(true)
  const [commentLoadError, setCommentLoadError] = useState(false)

  // 게시글 옵션 바텀시트 단계 (기획서 "4. 게시글 옵션")
  const [optionsStep, setOptionsStep] = useState(null) // null | 'menu' | 'share' | 'reportList' | 'reportConfirm'
  const [reportReason, setReportReason] = useState(null)

  // 댓글 답글/수정/옵션 상태 (기획서 "6. 게시글 댓글")
  const [replyingTo, setReplyingTo] = useState(null) // commentId | null
  const [commentOptionsFor, setCommentOptionsFor] = useState(null) // commentId | null
  const [commentOptionsStep, setCommentOptionsStep] = useState(null) // null | 'menu' | 'reportList' | 'reportConfirm'
  const [commentReportReason, setCommentReportReason] = useState(null)
  const [editingComment, setEditingComment] = useState(null) // commentId | null

  // 옵션/댓글작성/좋아요 탭 시 비로그인이면 로그인 안내
  const [loginPromptReason, setLoginPromptReason] = useState(null)

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

  async function loadPost() {
    setLoading(true)
    setLoadError(false)
    try {
      const ref = doc(db, 'community', id)
      const snap = await getDoc(ref)
      if (!snap.exists()) { setNotFound(true); return }
      setPost({ id: snap.id, ...snap.data() })
      updateDoc(ref, { viewCount: increment(1) }).catch(() => {})
    } catch (e) {
      console.error(e)
      setLoadError(true)
      setToast('게시글을 불러오지 못했어요. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadPost() }, [id])

  // 삭제되었거나 존재하지 않는 게시글 - 잠시 안내 후 커뮤니티 탭 복귀
  useEffect(() => {
    if (!notFound) return
    const t = setTimeout(() => navigate('/community'), 1800)
    return () => clearTimeout(t)
  }, [notFound])

  async function loadComments() {
    setCommentLoading(true)
    setCommentLoadError(false)
    try {
      const q = query(collection(db, 'community', id, 'comments'), orderBy('createdAt', 'asc'))
      const snap = await getDocs(q)
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error(e)
      setCommentLoadError(true)
      setToast('댓글을 불러오지 못했어요.')
    } finally {
      setCommentLoading(false)
    }
  }
  useEffect(() => { loadComments() }, [id])

  async function handleLike(liked) {
    if (!user) { setLoginPromptReason('like'); return }
    setPost(prev => ({
      ...prev,
      likes: liked ? prev.likes.filter(uid => uid !== user.uid) : [...(prev.likes || []), user.uid],
    }))
    try {
      await updateDoc(doc(db, 'community', post.id), { likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) })
    } catch (e) {
      console.error(e)
      setPost(prev => ({
        ...prev,
        likes: liked ? [...(prev.likes || []), user.uid] : prev.likes.filter(uid => uid !== user.uid),
      }))
      setToast('좋아요 처리에 실패했어요. 다시 시도해주세요.')
    }
  }

  // 댓글 등록 (메인 입력창) - 실패 시 입력 내용 유지를 위해 성공 여부를 반환
  async function handleSubmitComment(text) {
    if (!user) { setLoginPromptReason('comment'); return false }
    if (!text.trim()) return false
    try {
      const docRef = await addDoc(collection(db, 'community', id, 'comments'), {
        text: text.trim(), uid: user.uid, authorName: user.displayName, authorPhoto: user.photoURL,
        likes: [], createdAt: serverTimestamp(),
      })
      setComments(prev => [...prev, { id: docRef.id, text: text.trim(), uid: user.uid, authorName: user.displayName, authorPhoto: user.photoURL, likes: [], createdAt: { toMillis: () => Date.now() } }])
      return true
    } catch (e) {
      console.error(e)
      setToast('댓글 등록에 실패했어요. 다시 시도해주세요.')
      return false
    }
  }

  // 답글 등록 (기획서 "댓글 하단 - 답글달기")
  async function handleSubmitReply(parentId, text) {
    if (!user) { setLoginPromptReason('comment'); return false }
    if (!text.trim()) return false
    try {
      const docRef = await addDoc(collection(db, 'community', id, 'comments'), {
        text: text.trim(), uid: user.uid, authorName: user.displayName, authorPhoto: user.photoURL,
        likes: [], replyTo: parentId, createdAt: serverTimestamp(),
      })
      setComments(prev => [...prev, { id: docRef.id, text: text.trim(), uid: user.uid, authorName: user.displayName, authorPhoto: user.photoURL, likes: [], replyTo: parentId, createdAt: { toMillis: () => Date.now() } }])
      setReplyingTo(null)
      return true
    } catch (e) {
      console.error(e)
      setToast('댓글 등록에 실패했어요. 다시 시도해주세요.')
      return false
    }
  }

  async function handleLikeComment(commentId, liked) {
    if (!user) { setLoginPromptReason('like'); return }
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c
      const likes = liked ? c.likes.filter(uid => uid !== user.uid) : [...(c.likes || []), user.uid]
      return { ...c, likes }
    }))
    try {
      await updateDoc(doc(db, 'community', id, 'comments', commentId), { likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) })
    } catch (e) {
      console.error(e)
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c
        const likes = liked ? [...(c.likes || []), user.uid] : c.likes.filter(uid => uid !== user.uid)
        return { ...c, likes }
      }))
      setToast('좋아요 처리에 실패했어요. 다시 시도해주세요.')
    }
  }

  function handleOpenCommentOptions(commentId) {
    if (!user) { setLoginPromptReason('commentOptions'); return }
    setCommentOptionsFor(commentId)
    setCommentOptionsStep('menu')
  }
  function handleCloseCommentOptions() {
    setCommentOptionsFor(null); setCommentOptionsStep(null); setCommentReportReason(null)
  }
  function handleCommentOptionsBack() {
    if (commentOptionsStep === 'reportList') setCommentOptionsStep('menu')
    else if (commentOptionsStep === 'reportConfirm') setCommentOptionsStep('reportList')
  }
  function handleStartEditComment() {
    setEditingComment(commentOptionsFor)
    handleCloseCommentOptions()
  }
  async function handleSaveEditComment(commentId, text) {
    if (!text.trim()) return
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, text: text.trim() } : c))
    setEditingComment(null)
    try {
      await updateDoc(doc(db, 'community', id, 'comments', commentId), { text: text.trim() })
    } catch (e) {
      console.error(e)
      setToast('댓글 수정에 실패했어요. 다시 시도해주세요.')
    }
  }
  async function handleDeleteComment() {
    const commentId = commentOptionsFor
    handleCloseCommentOptions()
    setComments(prev => prev.filter(c => c.id !== commentId && c.replyTo !== commentId))
    try {
      await deleteDoc(doc(db, 'community', id, 'comments', commentId))
    } catch (e) {
      console.error(e)
      setToast('댓글 삭제에 실패했어요. 다시 시도해주세요.')
      loadComments()
    }
  }
  function handleSelectCommentReportReason(reasonKey) {
    setCommentReportReason(reasonKey)
    setCommentOptionsStep('reportConfirm')
  }
  async function handleConfirmCommentReport() {
    const commentId = commentOptionsFor
    try {
      await addDoc(collection(db, 'reports'), {
        postId: id, commentId, reason: commentReportReason, uid: user.uid, createdAt: serverTimestamp(),
      })
      setToast('신고가 접수됐어요.')
    } catch (e) {
      console.error(e)
      setToast('신고 접수에 실패했어요. 다시 시도해주세요.')
    } finally {
      handleCloseCommentOptions()
    }
  }

  // 게시글 옵션 (기획서 "4. 게시글 옵션") - "..." 탭 자체도 로그인 필요
  function handleOpenOptions() {
    if (!user) { setLoginPromptReason('options'); return }
    setOptionsStep('menu')
  }
  function handleCloseOptions() { setOptionsStep(null); setReportReason(null) }
  function handleOptionsBack() {
    if (optionsStep === 'share' || optionsStep === 'reportList') setOptionsStep('menu')
    else if (optionsStep === 'reportConfirm') setOptionsStep('reportList')
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/community/${id}` : ''

  async function handleCopyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setToast('링크를 복사했어요.')
    } catch {
      setToast('링크 복사에 실패했어요.')
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: post?.title, url: shareUrl }) } catch {}
    } else {
      handleCopyShareLink()
    }
  }

  function handleSelectReportReason(reasonKey) {
    setReportReason(reasonKey)
    setOptionsStep('reportConfirm')
  }

  async function handleConfirmReport() {
    try {
      await addDoc(collection(db, 'reports'), {
        postId: id, reason: reportReason, uid: user.uid, createdAt: serverTimestamp(),
      })
      setToast('신고가 접수됐어요.')
    } catch (e) {
      console.error(e)
      setToast('신고 접수에 실패했어요. 다시 시도해주세요.')
    } finally {
      handleCloseOptions()
    }
  }

  async function handleConfirmLogin() {
    await signInWithGoogle()
    setLoginPromptReason(null)
  }

  function handlePlaceTagClick(placeName) {
    navigate('/map', { state: { searchQuery: placeName } })
  }

  // 댓글 입력창 탭(포커스) 시 비로그인이면 즉시 안내 (기획서 "2. 댓글 입력창 - 비로그인 상태")
  function handleRequireCommentLogin() {
    if (!user) setLoginPromptReason('comment')
  }

  return (
    <PostDetailPageFront
      post={post}
      loading={loading}
      notFound={notFound}
      loadError={loadError}
      user={user}
      comments={groupComments(comments)}
      commentLoading={commentLoading}
      commentLoadError={commentLoadError}
      optionsStep={optionsStep}
      reportReason={reportReason}
      replyingTo={replyingTo}
      commentOptionsFor={commentOptionsFor}
      commentOptionsStep={commentOptionsStep}
      commentReportReason={commentReportReason}
      editingComment={editingComment}
      loginPromptReason={loginPromptReason}
      toast={toast}
      shareUrl={shareUrl}
      onBack={() => navigate('/community')}
      onRetryPost={loadPost}
      onLike={handleLike}
      onSubmitComment={handleSubmitComment}
      onRetryComments={loadComments}
      onOpenOptions={handleOpenOptions}
      onCloseOptions={handleCloseOptions}
      onOptionsBack={handleOptionsBack}
      onGoShare={() => setOptionsStep('share')}
      onGoReportList={() => setOptionsStep('reportList')}
      onSelectReportReason={handleSelectReportReason}
      onConfirmReport={handleConfirmReport}
      onCopyShareLink={handleCopyShareLink}
      onShare={handleShare}
      onConfirmLogin={handleConfirmLogin}
      onCancelLoginPrompt={() => setLoginPromptReason(null)}
      onPlaceTagClick={handlePlaceTagClick}
      onRequireCommentLogin={handleRequireCommentLogin}
      onStartReply={commentId => { if (!user) { setLoginPromptReason('comment'); return } setReplyingTo(commentId) }}
      onCancelReply={() => setReplyingTo(null)}
      onSubmitReply={handleSubmitReply}
      onOpenCommentOptions={handleOpenCommentOptions}
      onCloseCommentOptions={handleCloseCommentOptions}
      onCommentOptionsBack={handleCommentOptionsBack}
      onStartEditComment={handleStartEditComment}
      onCancelEditComment={() => setEditingComment(null)}
      onSaveEditComment={handleSaveEditComment}
      onDeleteComment={handleDeleteComment}
      onLikeComment={handleLikeComment}
      onGoCommentReportList={() => setCommentOptionsStep('reportList')}
      onSelectCommentReportReason={handleSelectCommentReportReason}
      onConfirmCommentReport={handleConfirmCommentReport}
    />
  )
}
