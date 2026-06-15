import { useState, useEffect } from 'react'
import {
  collection, addDoc, getDocs, updateDoc, doc,
  arrayUnion, arrayRemove, orderBy, query, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import CommunityPageFront from '../components/CommunityPage_front'

/**
 * CommunityPage (BACK) - 기능/로직 담당
 *
 * 보유: Firestore 글목록 조회, 글 작성, 좋아요
 * front에 넘기는 데이터: posts, loading, filter, showWrite, user
 * front에 넘기는 함수: handleSubmit, handleLike, setFilter, setShowWrite
 */
export default function CommunityPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWrite, setShowWrite] = useState(false)
  const [filter, setFilter] = useState('all') // all | review | report

  async function fetchPosts() {
    setLoading(true)
    try {
      const q = query(collection(db, 'community'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [])

  async function handleSubmit(data) {
    if (!user) return
    await addDoc(collection(db, 'community'), {
      ...data,
      uid: user.uid,
      authorName: user.displayName,
      authorPhoto: user.photoURL,
      likes: [],
      createdAt: serverTimestamp(),
    })
    await fetchPosts()
  }

  async function handleLike(postId, liked) {
    if (!user) return
    const ref = doc(db, 'community', postId)
    await updateDoc(ref, {
      likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    })
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const likes = liked
        ? p.likes.filter(uid => uid !== user.uid)
        : [...(p.likes || []), user.uid]
      return { ...p, likes }
    }))
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.type === filter)

  return (
    <CommunityPageFront
      user={user}
      posts={filtered}
      loading={loading}
      filter={filter}
      showWrite={showWrite}
      onSubmit={handleSubmit}
      onLike={handleLike}
      onFilter={setFilter}
      onShowWrite={setShowWrite}
    />
  )
}
