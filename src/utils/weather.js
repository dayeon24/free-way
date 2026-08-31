// GPS 좌표 → 기상청 격자(nx, ny) 변환 (기상청 공식 LCC 알고리즘)
export function latlngToGrid(lat, lng) {
  const RE = 6371.00877
  const GRID = 5.0
  const SLAT1 = 30.0
  const SLAT2 = 60.0
  const OLON = 126.0
  const OLAT = 38.0
  const XO = 43
  const YO = 136
  const DEGRAD = Math.PI / 180.0

  const re = RE / GRID
  const slat1 = SLAT1 * DEGRAD
  const slat2 = SLAT2 * DEGRAD
  const olon = OLON * DEGRAD
  const olat = OLAT * DEGRAD

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (sf ** sn) * Math.cos(slat1) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = re * sf / (ro ** sn)

  let r = re * sf / (Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5) ** sn)
  let theta = lng * DEGRAD - olon
  if (theta > Math.PI) theta -= 2.0 * Math.PI
  if (theta < -Math.PI) theta += 2.0 * Math.PI
  theta *= sn

  return {
    nx: Math.floor(r * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - r * Math.cos(theta) + YO + 0.5),
  }
}

// SKY(하늘상태) + PTY(강수형태) + 기온 → condition 문자열
// SKY: 1=맑음, 3=구름많음, 4=흐림
// PTY: 0=없음, 1=비, 2=비/눈, 3=눈, 4=소나기
function skyPtyToCondition(sky, pty, temp) {
  if (pty === '1' || pty === '4') return 'rainy'
  if (pty === '2') return 'rainy'
  if (pty === '3') return 'snowy'
  if (parseInt(temp) >= 33) return 'heatwave'
  if (sky === '4') return 'cloudy'
  if (sky === '3') return 'partlyCloudy'
  return 'sunny'
}

// 기상청 단기예보 items 배열 → weather 객체
export function parseWeatherItems(items) {
  const pad = n => String(n).padStart(2, '0')
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const todayStr = `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}`
  const hourStr = `${pad(kst.getUTCHours())}00`

  const get = (category, time) =>
    items.find(i => i.category === category && i.fcstDate === todayStr && i.fcstTime === time)?.fcstValue

  const tmp = get('TMP', hourStr)
  const sky = get('SKY', hourStr)
  const pty = get('PTY', hourStr)
  const tmn = items.find(i => i.category === 'TMN' && i.fcstDate === todayStr)?.fcstValue
  const tmx = items.find(i => i.category === 'TMX' && i.fcstDate === todayStr)?.fcstValue

  return {
    condition: skyPtyToCondition(sky, pty, tmp),
    temp: tmp != null ? parseInt(tmp) : 24,
    tempMin: tmn != null ? parseInt(tmn) : undefined,
    tempMax: tmx != null ? parseInt(tmx) : undefined,
    dustLevel: 'good', // 에어코리아 API 연동 전까지 고정
    rain: pty != null && pty !== '0',
  }
}

// GPS 좌표 → 날씨 객체 (api/weather.js 경유)
export async function fetchWeather(lat, lng) {
  const { nx, ny } = latlngToGrid(lat, lng)
  const url = new URL('/api/weather', window.location.origin)
  url.searchParams.set('nx', String(nx))
  url.searchParams.set('ny', String(ny))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`날씨 API ${res.status}`)
  const data = await res.json()

  const raw = data?.response?.body?.items?.item
  if (!raw) throw new Error('날씨 데이터 없음')
  return parseWeatherItems([raw].flat())
}
