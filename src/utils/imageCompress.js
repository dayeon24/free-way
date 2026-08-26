// 게시글 첨부 이미지 압축 (커뮤니티 "게시글 작성" - 원본 사진 그대로 올리면 업로드가 오래 걸려 지연/실패처럼 보이는 문제 방지)
// 긴 변 기준 1600px로 축소 + JPEG 재인코딩. 실패 시 호출부에서 원본 파일로 폴백.
export function compressImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('이미지 압축 실패')); return }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 불러오지 못했어요')) }
    img.src = url
  })
}
