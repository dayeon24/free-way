// 코스 저장 / URL 공유 / 좋아요 — Firestore
//   savedCourses/{id}        : 내 코스 (로그인 필수, 최대 20개)
//   sharedCourses/{shortId}  : URL 공유용 스냅샷 (비로그인도 열람)
//   courseLikes/{courseId}   : { likes: [uid...] }
//
// ※ 위 컬렉션들은 Firestore 보안 규칙에 별도로 허용해야 동작함 (백엔드 담당 확인 필요).
//   규칙이 없으면 저장은 실패 토스트, 공유는 "URL에 코스를 담는 방식"으로 대체된다.
import {
  collection, addDoc, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp,
  arrayUnion, arrayRemove,
} from 'firebase/firestore'
import { db } from '../firebase'
import { typeLabel, warningFor } from './courseApi'
import { TRAVELER_TYPES } from './courseGen'

export const MAX_SAVED_COURSES = 20

// AI 코스 결과 화면(/course/ai)이 새로고침해도 유지되도록 sessionStorage에 보관하는 키
export const AI_COURSE_KEY = 'freeway:aiCourse:v1'

// 저장/공유용으로 줄인 코스 (대체 후보 pool, 큰 텍스트 제거)
export function stripCourse(course) {
  const { pool, ...rest } = course
  return {
    ...rest,
    days: course.days.map(d => ({
      ...d,
      items: d.items.map(({ image, reason, ...it }) => ({ ...it, reason: reason || '' })),
    })),
  }
}

/* ───────── 내 코스 저장 ───────── */

export async function countSaved(uid) {
  const snap = await getDocs(query(collection(db, 'savedCourses'), where('uid', '==', uid)))
  return snap.size
}

// 반환: 'LIMIT' | savedId
export async function saveCourse(user, course, { name, memo }) {
  if ((await countSaved(user.uid)) >= MAX_SAVED_COURSES) return 'LIMIT'
  const ref = await addDoc(collection(db, 'savedCourses'), {
    uid: user.uid,
    name: name.trim() || course.title,
    memo: (memo || '').trim(),
    source: course.source,
    courseJson: JSON.stringify(stripCourse(course)), // 중첩 배열 제약을 피하려고 문자열로 저장
    createdAt: serverTimestamp(),
  })
  return ref.id
}

/* ───────── URL 공유 ───────── */

const toB64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64u = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

async function pipeBytes(stream, bytes) {
  const w = stream.writable.getWriter()
  w.write(bytes); w.close()
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

// URL에 코스를 담을 때 deflate 압축 ('z' 접두) — 지원하지 않는 브라우저는 압축 없이 ('p' 접두)
async function encodeInline(obj) {
  const json = new TextEncoder().encode(JSON.stringify(obj))
  if (typeof CompressionStream !== 'undefined') return 'z' + toB64u(await pipeBytes(new CompressionStream('deflate-raw'), json))
  return 'p' + toB64u(json)
}
async function decodeInline(str) {
  const bytes = fromB64u(str.slice(1))
  const raw = str[0] === 'z' ? await pipeBytes(new DecompressionStream('deflate-raw'), bytes) : bytes
  return JSON.parse(new TextDecoder().decode(raw))
}

function shortId(len = 8) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

// 공유용으로 더 줄인 코스 — 다시 계산할 수 있는 값(key, 라벨, 경고 문구)은 빼고 보냄
function slimForShare(course) {
  const s = stripCourse(course)
  return {
    title: s.title, summary: s.summary, source: s.source, generatedBy: s.generatedBy,
    conditions: s.conditions, chips: s.chips, center: s.center,
    days: s.days.map(d => ({
      day: d.day,
      items: d.items.map(({ kind, contentid, name, type, x, y, addr, time, durationMin, grade, leg, openTime, restDate, facilityKind, reason }) => ({
        kind, contentid, name, type, x: Math.round(x * 1e5) / 1e5, y: Math.round(y * 1e5) / 1e5, addr, time, durationMin, grade,
        leg: leg ? { mode: leg.mode, minutes: leg.minutes, km: leg.km } : null, openTime, restDate, facilityKind, reason,
      })),
    })),
  }
}

// 공유 데이터 → 화면용 코스 (빠진 값 복원)
function hydrateShared(data) {
  const sensitive = TRAVELER_TYPES.find(t => t.key === data.conditions?.travelerType)?.sensitive ?? true
  return {
    ...data,
    id: data.id || `shared-${Date.now().toString(36)}`,
    days: data.days.map(d => ({
      ...d,
      items: d.items.map((it, i) => ({
        ...it,
        key: `${it.contentid || it.name}-${d.day}-${i}`,
        typeLabel: it.typeLabel || typeLabel(it.type),
        warning: it.kind === 'facility' ? null : warningFor(it.grade, sensitive),
      })),
    })),
  }
}

// 반환: { url, kind: 'short' | 'inline' }
export async function shareCourse(course) {
  const data = slimForShare(course)
  const origin = window.location.origin
  try {
    const id = shortId()
    await setDoc(doc(db, 'sharedCourses', id), { courseJson: JSON.stringify(data), createdAt: serverTimestamp() })
    return { url: `${origin}/course/share/${id}`, kind: 'short' }
  } catch {
    // 규칙/네트워크 문제로 저장이 안 되면 코스를 URL 안에 담아서 공유 (짧진 않지만 링크만 있으면 누구나 열람 가능)
    return { url: `${origin}/course/share/inline?d=${await encodeInline(data)}`, kind: 'inline' }
  }
}

export async function loadSharedCourse(shareId, inlineData) {
  if (shareId === 'inline') {
    if (!inlineData) throw new Error('EMPTY')
    try { return hydrateShared(await decodeInline(inlineData)) } catch { throw new Error('EMPTY') }
  }
  const snap = await getDoc(doc(db, 'sharedCourses', shareId))
  if (!snap.exists()) throw new Error('NOT_FOUND')
  return hydrateShared(JSON.parse(snap.data().courseJson))
}

/* ───────── 좋아요 ───────── */

// 전체 코스의 좋아요 수를 한 번에 조회 → { [courseId]: string[] (uid 목록) }
export async function loadAllLikes() {
  const snap = await getDocs(collection(db, 'courseLikes'))
  const out = {}
  snap.forEach(d => { out[d.id] = d.data().likes || [] })
  return out
}

export async function loadLikes(courseId) {
  const snap = await getDoc(doc(db, 'courseLikes', String(courseId)))
  return snap.exists() ? snap.data().likes || [] : []
}

export async function setLike(courseId, uid, liked) {
  await setDoc(doc(db, 'courseLikes', String(courseId)), { likes: liked ? arrayUnion(uid) : arrayRemove(uid) }, { merge: true })
}
