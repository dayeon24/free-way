import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth'
import {
  doc, setDoc, getDoc, serverTimestamp,
  collection, query, where, getDocs, writeBatch,
} from 'firebase/firestore'
import { auth, db } from '../firebase'

const provider = new GoogleAuthProvider()

// 로그인 시 Firestore에 유저 문서 생성 (이미 있으면 lastLoginAt만 업데이트)
async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    // 최초 가입 → 기본값으로 문서 생성
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      bio: '',
      travelType: 'wheelchair', // 기본값
      settings: {
        tts: true,
        highContrast: false,
        largeFontSize: false,
        stampAlert: true,
      },
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    })
  } else {
    // 재로그인 → 마지막 로그인 시각만 업데이트
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true })
  }
}

export function useAuth() {
  const [user, setUser] = useState(undefined)
  const [userDoc, setUserDoc] = useState(null) // Firestore 유저 문서
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await ensureUserDoc(u)
        // Firestore 유저 문서 읽기
        const snap = await getDoc(doc(db, 'users', u.uid))
        setUserDoc(snap.data())
      } else {
        setUserDoc(null)
      }
    })
    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setError('로그인에 실패했어요. 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await signOut(auth)
    setUserDoc(null)
  }

  // 유저 설정 업데이트 (여행 유형, 접근성 설정 등)
  async function updateUserDoc(data) {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    await setDoc(ref, data, { merge: true })
    setUserDoc(prev => ({ ...prev, ...data }))
  }

  // 닉네임 / 프로필 사진 / 소개 수정
  // displayName, photoURL이 바뀌면 이전에 작성한 커뮤니티 글의 작성자 정보도 함께 갱신
  async function updateProfile({ displayName, photoURL, bio } = {}) {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    const patch = {}
    if (displayName !== undefined) patch.displayName = displayName
    if (photoURL !== undefined) patch.photoURL = photoURL
    if (bio !== undefined) patch.bio = bio
    if (Object.keys(patch).length === 0) return

    await setDoc(ref, patch, { merge: true })
    setUserDoc(prev => ({ ...prev, ...patch }))

    // 닉네임/프로필사진이 바뀐 경우 → 기존에 작성한 커뮤니티 글도 일괄 업데이트
    if (patch.displayName !== undefined || patch.photoURL !== undefined) {
      const finalName = patch.displayName ?? userDoc?.displayName ?? user.displayName
      const finalPhoto = patch.photoURL ?? userDoc?.photoURL ?? user.photoURL

      const q = query(collection(db, 'community'), where('uid', '==', user.uid))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const batch = writeBatch(db)
        snap.docs.forEach(d => batch.update(d.ref, { authorName: finalName, authorPhoto: finalPhoto }))
        await batch.commit()
      }
    }
  }

  return {
    user,
    userDoc,
    isLoading: user === undefined,
    loading,
    error,
    signInWithGoogle,
    logout,
    updateUserDoc,
    updateProfile,
  }
}
