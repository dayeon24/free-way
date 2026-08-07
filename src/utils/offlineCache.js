// 지도탭 네트워크 오류 시 폴백용 IndexedDB 캐시 (기획서 MAP-05 "네트워크 오류" 항목)
// 최근 성공한 장소 목록을 저장해뒀다가, 다음 요청이 실패하면 이 캐시를 보여줌
const DB_NAME = 'freeway-cache'
const DB_VERSION = 1
const STORE = 'spots'

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB 미지원')); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveCachedSpots(key, data) {
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ data, savedAt: Date.now() }, key)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // IndexedDB 미지원/차단 환경 - 조용히 무시 (캐시는 있으면 좋은 것일 뿐 필수 아님)
  }
}

export async function loadCachedSpots(key) {
  try {
    const db = await openDB()
    return await new Promise(resolve => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}
