import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection, addDoc, getDocs, updateDoc, doc,
  arrayUnion, arrayRemove, orderBy, query, limit, startAfter,
  serverTimestamp, increment,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import CommunityPageFront from '../components/CommunityPage_front'

const PAGE_SIZE = 10

function buildQuery(sortVal, after = null) {
  const col = collection(db, 'community')
  const orderField = sortVal === 'popular' ? 'likesCount' : 'createdAt'
  const constraints = [orderBy(orderField, 'desc'), limit(PAGE_SIZE)]
  if (after) constraints.push(startAfter(after))
  return query(col, ...constraints)
}

export default function CommunityPage() {
  const { user, userDoc } = useAuth()
  const [allPosts, setAllPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [showWrite, setShowWrite] = useState(false)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('latest')
  const lastSnap = useRef(null)

  async function fetchPosts(reset, sortVal) {
    if (reset) {
      setLoading(true)
      lastSnap.current = null
    } else {
      setLoadingMore(true)
    }
    try {
      const q = buildQuery(sortVal, reset ? null : lastSnap.current)
      const snap = await getDocs(q)
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      lastSnap.current = snap.docs[snap.docs.length - 1] ?? null
      setHasMore(snap.docs.length === PAGE_SIZE)
      if (reset) {
        setAllPosts(fetched)
      } else {
        setAllPosts(prev => {
          const ids = new Set(prev.map(p => p.id))
          return [...prev, ...fetched.filter(p => !ids.has(p.id))]
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { fetchPosts(true, sort) }, [sort])

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore) fetchPosts(false, sort)
  }, [loadingMore, loading, hasMore, sort])

  async function uploadImages(files) {
    return Promise.all(files.map(async file => {
      const fileRef = storageRef(storage, `community/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      return getDownloadURL(fileRef)
    }))
  }

  async function handleSubmit({ title, body, type, images, locationTag }) {
    if (!user) return
    const imageUrls = images?.length ? await uploadImages(images) : []
    await addDoc(collection(db, 'community'), {
      title: title.trim(),
      body: body.trim(),
      type,
      imageUrls,
      locationTag: locationTag?.trim() || '',
      uid: user.uid,
      authorName: userDoc?.displayName || user.displayName,
      authorPhoto: userDoc?.photoURL || user.photoURL,
      likes: [],
      likesCount: 0,
      commentCount: 0,
      status: type === 'report' ? 'pending' : 'active',
      createdAt: serverTimestamp(),
    })
    await fetchPosts(true, sort)
  }

  async function handleLike(postId, liked) {
    if (!user) return
    const postRef = doc(db, 'community', postId)
    await updateDoc(postRef, {
      likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      likesCount: increment(liked ? -1 : 1),
    })
    setAllPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const likes = liked ? p.likes.filter(u => u !== user.uid) : [...(p.likes || []), user.uid]
      return { ...p, likes, likesCount: (p.likesCount || 0) + (liked ? -1 : 1) }
    }))
  }

  async function fetchComments(postId) {
    const q = query(
      collection(db, 'community', postId, 'comments'),
      orderBy('createdAt', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  async function handleAddComment(postId, body) {
    if (!user || !body.trim()) return null
    const ref = await addDoc(collection(db, 'community', postId, 'comments'), {
      body: body.trim(),
      uid: user.uid,
      authorName: userDoc?.displayName || user.displayName,
      authorPhoto: userDoc?.photoURL || user.photoURL,
      likes: [],
      isDeleted: false,
      createdAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'community', postId), { commentCount: increment(1) })
    setAllPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
    ))
    return {
      id: ref.id,
      body: body.trim(),
      uid: user.uid,
      authorName: userDoc?.displayName || user.displayName,
      authorPhoto: userDoc?.photoURL || user.photoURL,
      likes: [],
      isDeleted: false,
      createdAt: { toMillis: () => Date.now() },
    }
  }

  async function handleEditComment(postId, commentId, body) {
    if (!user || !body.trim()) return
    await updateDoc(doc(db, 'community', postId, 'comments', commentId), { body: body.trim() })
  }

  async function handleDeleteComment(postId, commentId) {
    if (!user) return
    await updateDoc(doc(db, 'community', postId, 'comments', commentId), { isDeleted: true })
    await updateDoc(doc(db, 'community', postId), { commentCount: increment(-1) })
    setAllPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 0) - 1) } : p
    ))
  }

  async function handleCommentLike(postId, commentId, liked) {
    if (!user) return
    await updateDoc(doc(db, 'community', postId, 'comments', commentId), {
      likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    })
  }

  async function handleReportStatus(postId, status) {
    if (!userDoc?.isAdmin) return
    await updateDoc(doc(db, 'community', postId), { status })
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p))
  }

  const filtered = filter === 'all' ? allPosts : allPosts.filter(p => p.type === filter)

  return (
    <CommunityPageFront
      user={user}
      userDoc={userDoc}
      posts={filtered}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      filter={filter}
      sort={sort}
      showWrite={showWrite}
      onSubmit={handleSubmit}
      onLike={handleLike}
      onFilter={setFilter}
      onSort={setSort}
      onShowWrite={setShowWrite}
      onLoadMore={handleLoadMore}
      onFetchComments={fetchComments}
      onAddComment={handleAddComment}
      onEditComment={handleEditComment}
      onDeleteComment={handleDeleteComment}
      onCommentLike={handleCommentLike}
      onReportStatus={handleReportStatus}
    />
  )
}
